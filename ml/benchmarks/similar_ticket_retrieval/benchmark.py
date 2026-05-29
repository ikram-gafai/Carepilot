from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from rank_bm25 import BM25Okapi
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from evaluation import RetrievalResult, evaluate_rankings, result_table
from preprocessing import (
    load_all_tickets,
    load_database_url,
    prepare_frames,
    validate_similar_ticket_dataset,
)
from visualization import (
    plot_cluster_distribution,
    plot_failure_cases,
    plot_latency_comparison,
    plot_method_comparison,
    plot_mrr_ndcg,
    plot_precision_at_k,
    plot_results_table,
    plot_success_cases,
)

TOP_K = 3
SENTENCE_MODEL = "all-MiniLM-L6-v2"
DEFAULT_MAX_QUERIES = 1000


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="CarePilot similar ticket retrieval benchmark.")
    parser.add_argument("--project-root", default=str(Path(__file__).resolve().parents[3]))
    parser.add_argument("--database-url", default=None)
    parser.add_argument("--max-queries", type=int, default=DEFAULT_MAX_QUERIES)
    parser.add_argument("--refresh-embeddings", action="store_true")
    return parser.parse_args()


def build_ticket_position_map(corpus: pd.DataFrame) -> dict[str, int]:
    return {str(ticket_id): index for index, ticket_id in enumerate(corpus["ticket_id"].astype(str))}


def corpus_cache_key(corpus: pd.DataFrame, text_column: str) -> str:
    payload = "\n".join(
        f"{ticket_id}\t{text}"
        for ticket_id, text in zip(
            corpus["ticket_id"].astype(str).tolist(),
            corpus[text_column].astype(str).tolist(),
            strict=True,
        )
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


def load_cached_embeddings(cache_path: Path) -> np.ndarray | None:
    if not cache_path.exists():
        return None
    return np.load(cache_path)


def save_cached_embeddings(cache_path: Path, embeddings: np.ndarray) -> None:
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    np.save(cache_path, embeddings)


def exclude_query(scores: np.ndarray, query_ticket_id: str, ticket_positions: dict[str, int]) -> np.ndarray:
    masked = scores.copy()
    position = ticket_positions.get(str(query_ticket_id))
    if position is not None:
        masked[position] = -np.inf
    return masked


def rank_top_k(scores: np.ndarray, ticket_ids: list[str], top_k: int = TOP_K) -> list[str]:
    k = min(top_k, len(scores))
    if k <= 0:
        return []
    if k == len(scores):
        order = np.argsort(scores)[::-1][:k]
    else:
        top_indices = np.argpartition(scores, -k)[-k:]
        order = top_indices[np.argsort(scores[top_indices])[::-1]]
    return [ticket_ids[int(index)] for index in order]


def benchmark_tfidf(
    queries: pd.DataFrame,
    corpus: pd.DataFrame,
    ticket_positions: dict[str, int],
) -> tuple[RetrievalResult, object, list[list[str]]]:
    vectorizer = TfidfVectorizer(max_features=4000, ngram_range=(1, 2), min_df=2)
    corpus_matrix = vectorizer.fit_transform(corpus["ticket_text"])
    ticket_ids = corpus["ticket_id"].astype(str).tolist()
    rankings: list[list[str]] = []
    times_ms: list[float] = []

    for _, row in queries.iterrows():
        start = time.perf_counter()
        query = vectorizer.transform([row["ticket_text"]])
        scores = exclude_query(
            cosine_similarity(query, corpus_matrix).ravel(),
            str(row["ticket_id"]),
            ticket_positions,
        )
        rankings.append(rank_top_k(scores, ticket_ids))
        times_ms.append((time.perf_counter() - start) * 1000)

    result = evaluate_rankings("TF-IDF + Cosine", rankings, queries["ground_truth_ids"].tolist(), times_ms)
    artifact = {"vectorizer": vectorizer, "ticket_ids": ticket_ids, "method": "tfidf"}
    return result, artifact, rankings


def benchmark_bm25(
    queries: pd.DataFrame,
    corpus: pd.DataFrame,
    ticket_positions: dict[str, int],
) -> tuple[RetrievalResult, object, list[list[str]]]:
    tokenized_corpus = [text.split() for text in corpus["ticket_text"].tolist()]
    bm25 = BM25Okapi(tokenized_corpus)
    ticket_ids = corpus["ticket_id"].astype(str).tolist()
    rankings: list[list[str]] = []
    times_ms: list[float] = []

    for _, row in queries.iterrows():
        start = time.perf_counter()
        scores = exclude_query(
            np.asarray(bm25.get_scores(row["ticket_text"].split()), dtype=np.float64),
            str(row["ticket_id"]),
            ticket_positions,
        )
        rankings.append(rank_top_k(scores, ticket_ids))
        times_ms.append((time.perf_counter() - start) * 1000)

    result = evaluate_rankings("BM25", rankings, queries["ground_truth_ids"].tolist(), times_ms)
    artifact = {"bm25_corpus_tokens": tokenized_corpus, "ticket_ids": ticket_ids, "method": "bm25"}
    return result, artifact, rankings


def load_or_encode_corpus_embeddings(
    corpus: pd.DataFrame,
    cache_dir: Path,
    *,
    refresh: bool,
) -> np.ndarray:
    text_column = "ticket_text_semantic"
    cache_key = corpus_cache_key(corpus, text_column)
    cache_path = cache_dir / f"similar_ticket_corpus_{cache_key}.npy"

    if not refresh:
        cached = load_cached_embeddings(cache_path)
        if cached is not None and cached.shape[0] == len(corpus):
            return cached

    from sentence_transformers import SentenceTransformer

    model = SentenceTransformer(SENTENCE_MODEL)
    embeddings = model.encode(
        corpus[text_column].tolist(),
        normalize_embeddings=True,
        show_progress_bar=False,
        batch_size=512,
        convert_to_numpy=True,
    )
    save_cached_embeddings(cache_path, embeddings)
    return np.asarray(embeddings, dtype=np.float32)


def benchmark_sentence_transformers(
    queries: pd.DataFrame,
    corpus: pd.DataFrame,
    ticket_positions: dict[str, int],
    cache_dir: Path,
    *,
    refresh_embeddings: bool,
) -> tuple[RetrievalResult, object, list[list[str]]]:
    if corpus["ticket_text_semantic"].str.strip().eq("").all():
        raise ValueError("Corpus retrieval text is empty; cannot compute sentence embeddings.")

    corpus_embeddings = load_or_encode_corpus_embeddings(corpus, cache_dir, refresh=refresh_embeddings)

    from sentence_transformers import SentenceTransformer

    model = SentenceTransformer(SENTENCE_MODEL)
    query_embeddings = np.asarray(
        model.encode(
            queries["ticket_text_semantic"].tolist(),
            normalize_embeddings=True,
            show_progress_bar=False,
            batch_size=512,
            convert_to_numpy=True,
        ),
        dtype=np.float32,
    )

    ticket_ids = corpus["ticket_id"].astype(str).tolist()
    all_scores = query_embeddings @ corpus_embeddings.T
    rankings: list[list[str]] = []
    times_ms: list[float] = []

    for query_index, (_, row) in enumerate(queries.iterrows()):
        start = time.perf_counter()
        scores = exclude_query(all_scores[query_index], str(row["ticket_id"]), ticket_positions)
        rankings.append(rank_top_k(scores, ticket_ids))
        times_ms.append((time.perf_counter() - start) * 1000)

    result = evaluate_rankings("Sentence Transformers", rankings, queries["ground_truth_ids"].tolist(), times_ms)
    artifact = {
        "model_name": SENTENCE_MODEL,
        "ticket_ids": ticket_ids,
        "corpus_embeddings": corpus_embeddings,
        "corpus_records": corpus[
            ["ticket_id", "title", "description", "perimeter", "incident_category", "resolution_summary"]
        ].to_dict(orient="records"),
        "method": "sentence_transformers",
    }
    return result, artifact, rankings


def build_report(
    results: list[RetrievalResult],
    query_count: int,
    corpus_count: int,
    validation_stats: dict[str, float | int],
    best: RetrievalResult,
    max_queries: int,
) -> str:
    return f"""# Similar Ticket Retrieval Benchmark Summary

## Objective

Surface historically resolved tickets that match a new operational incident using NLP retrieval over the full historical ticket corpus.

## Ground Truth

- **Relevant ticket:** any historical ticket with the same `similar_case_group_id`, excluding the query ticket itself.
- **Group metadata** (`incident_family`, `root_cause_family`, `resolution_pattern`) is stored for labeling only and is excluded from retrieval text.

## Dataset Validation

- Tickets with `similar_case_group_id`: {validation_stats["tickets_with_group_id"]}
- Unique groups: {validation_stats["unique_groups"]}
- Group size min / avg / max: {validation_stats["min_group_size"]} / {validation_stats["avg_group_size"]:.1f} / {validation_stats["max_group_size"]}
- Evaluated test queries (sample cap {max_queries}): {query_count}
- Retrieval corpus size: {corpus_count}

## Retrieval Text

Natural fields only: title + description + perimeter + incident category + resolution summary.
Synonym normalization is applied for Sentence Transformers only.

Hard negatives come from other groups sharing the same perimeter and incident category with overlapping operational vocabulary.

## Benchmark Results

{result_table(results)}

## Best Method

**Production method:** {best.method}

Artifacts:

- `ml/artifacts/models/similar_ticket_retrieval_minilm.joblib`
- `ml/artifacts/models/similar_ticket_tfidf.joblib`
- `ml/artifacts/models/similar_ticket_bm25.joblib`
- `ml/artifacts/cache/similar_ticket_corpus_*.npy`

Metrics: `ml/artifacts/metrics/similar_ticket_retrieval_metrics.json`
"""


def main() -> None:
    args = parse_args()
    root = Path(args.project_root)
    database_url = args.database_url or load_database_url(root)
    all_tickets = load_all_tickets(database_url)
    queries, corpus = prepare_frames(all_tickets)

    if args.max_queries > 0 and len(queries) > args.max_queries:
        queries = queries.sample(n=args.max_queries, random_state=42).reset_index(drop=True)

    try:
        validation_stats = validate_similar_ticket_dataset(all_tickets, queries)
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1) from exc

    ticket_positions = build_ticket_position_map(corpus)
    cache_dir = root / "ml" / "artifacts" / "cache"

    tfidf_result, tfidf_artifact, tfidf_rankings = benchmark_tfidf(queries, corpus, ticket_positions)
    bm25_result, bm25_artifact, bm25_rankings = benchmark_bm25(queries, corpus, ticket_positions)
    st_result, st_artifact, st_rankings = benchmark_sentence_transformers(
        queries,
        corpus,
        ticket_positions,
        cache_dir,
        refresh_embeddings=args.refresh_embeddings,
    )
    results = [tfidf_result, bm25_result, st_result]

    plots_dir = root / "ml" / "plots"
    artifacts_dir = root / "ml" / "artifacts"
    reports_dir = root / "ml" / "reports"
    models_dir = artifacts_dir / "models"
    metrics_dir = artifacts_dir / "metrics"
    plots_dir.mkdir(parents=True, exist_ok=True)
    models_dir.mkdir(parents=True, exist_ok=True)
    metrics_dir.mkdir(parents=True, exist_ok=True)
    reports_dir.mkdir(parents=True, exist_ok=True)

    plot_cluster_distribution(queries, plots_dir)
    plot_method_comparison(results, plots_dir)
    plot_precision_at_k(results, plots_dir)
    plot_mrr_ndcg(results, plots_dir)
    plot_latency_comparison(results, plots_dir)
    plot_results_table(results, plots_dir)
    plot_failure_cases(queries, corpus, st_rankings, plots_dir)
    plot_success_cases(queries, corpus, st_rankings, plots_dir)

    best = max(results, key=lambda item: (item.precision_at_3, item.mrr, item.ndcg_at_3))
    metrics_payload = {
        "dataset": {
            "test_queries": len(queries),
            "corpus_tickets": len(corpus),
            "max_queries_cap": args.max_queries,
            "validation": validation_stats,
        },
        "results": [result.__dict__ for result in results],
        "best_method": best.method,
    }
    (metrics_dir / "similar_ticket_retrieval_metrics.json").write_text(
        json.dumps(metrics_payload, indent=2), encoding="utf-8"
    )

    joblib.dump(st_artifact, models_dir / "similar_ticket_retrieval_minilm.joblib")
    joblib.dump(tfidf_artifact, models_dir / "similar_ticket_tfidf.joblib")
    joblib.dump(bm25_artifact, models_dir / "similar_ticket_bm25.joblib")

    report = build_report(results, len(queries), len(corpus), validation_stats, best, args.max_queries)
    (reports_dir / "03_similar_ticket_retrieval_summary.md").write_text(report, encoding="utf-8")
    (root / "ml" / "benchmarks" / "similar_ticket_retrieval" / "reports").mkdir(parents=True, exist_ok=True)
    (root / "ml" / "benchmarks" / "similar_ticket_retrieval" / "reports" / "similar_ticket_retrieval_report.md").write_text(
        report,
        encoding="utf-8",
    )

    df = pd.DataFrame([result.__dict__ for result in results])
    print(df.to_string(index=False))
    print(f"\nReport: {reports_dir / '03_similar_ticket_retrieval_summary.md'}")


if __name__ == "__main__":
    main()
