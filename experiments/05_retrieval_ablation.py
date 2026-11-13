"""E5 - Similar-ticket retrieval: does the benchmark rely on information a new ticket does not have?

ml/benchmarks/similar_ticket_retrieval builds the retrieval text from title + description + perimeter +
incident-category keywords + resolution_summary, for queries AND corpus. A newly opened ticket has no
resolution summary, so three protocols are compared with the benchmark's own text builder, ground truth
(same similar_case_group_id) and metric code (evaluation.evaluate_rankings):
  A  as_benchmarked            query + corpus include resolution_summary
  B  realistic_query           query WITHOUT resolution_summary, corpus (resolved history) WITH it
  C  no_resolution_text        neither side uses resolution_summary
  D  report_text_with_group_metadata
                               A + incident_family / root_cause_family / resolution_pattern, i.e. the text
                               described in ml/reports/03_similar_ticket_retrieval_summary.md. These fields
                               are group metadata that the current code deliberately excludes.
Methods: TF-IDF + cosine (benchmark settings) and BM25 (vectorised re-implementation of
rank_bm25.BM25Okapi, verified against the library on a sample of queries).
Sentence-transformer retrieval is not re-run (requires downloading all-MiniLM-L6-v2).

Usage: python experiments/05_retrieval_ablation.py
"""
from __future__ import annotations

import time

import numpy as np
import scipy.sparse as sp
from rank_bm25 import BM25Okapi
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from common import Task, load_task_modules, load_tickets, write_result

SIMILAR = Task("similar", "similar_ticket_retrieval", "", "retrieval")


class FastBM25:
    """Exact vectorised equivalent of rank_bm25.BM25Okapi (k1=1.5, b=0.75, epsilon=0.25)."""

    def __init__(self, docs: list[str], k1: float = 1.5, b: float = 0.75, epsilon: float = 0.25):
        self.cv = CountVectorizer(tokenizer=str.split, lowercase=False, token_pattern=None)
        tf = self.cv.fit_transform(docs).tocsr().astype(np.float64)
        n_docs = tf.shape[0]
        doc_len = np.asarray(tf.sum(axis=1)).ravel()
        avgdl = doc_len.sum() / n_docs
        df = np.asarray((tf > 0).sum(axis=0)).ravel()
        idf = np.log(n_docs - df + 0.5) - np.log(df + 0.5)
        eps = epsilon * idf.mean()
        idf = np.where(idf < 0, eps, idf)
        tf = tf.tocoo()
        denom = tf.data + k1 * (1 - b + b * doc_len[tf.row] / avgdl)
        weights = idf[tf.col] * tf.data * (k1 + 1) / denom
        self.w = sp.csr_matrix((weights, (tf.row, tf.col)), shape=tf.shape)

    def scores(self, query: str) -> np.ndarray:
        q = self.cv.transform([query])  # token counts; unseen tokens dropped (they score 0 in rank_bm25 too)
        return np.asarray((self.w @ q.T).todense()).ravel()


def rank_all(bench, queries, corpus, query_texts, corpus_texts, method):
    ids = corpus["ticket_id"].astype(str).tolist()
    positions = bench.build_ticket_position_map(corpus)
    if method == "tfidf":
        vec = TfidfVectorizer(max_features=4000, ngram_range=(1, 2), min_df=2)  # benchmark settings
        matrix = vec.fit_transform(corpus_texts)
        score = lambda text: cosine_similarity(vec.transform([text]), matrix).ravel()  # noqa: E731
    else:
        bm25 = FastBM25(corpus_texts)
        score = bm25.scores
    rankings, times = [], []
    for ticket_id, text in zip(queries["ticket_id"].astype(str), query_texts):
        start = time.perf_counter()
        rankings.append(bench.rank_top_k(bench.exclude_query(score(text), ticket_id, positions), ids))
        times.append((time.perf_counter() - start) * 1000)
    return rankings, times


def verify_bm25(corpus_texts, queries_texts, n=25) -> dict:
    lib = BM25Okapi([t.split() for t in corpus_texts])
    fast = FastBM25(corpus_texts)
    max_abs = 0.0
    same_top3 = 0
    for text in queries_texts[:n]:
        a = np.asarray(lib.get_scores(text.split()))
        b = fast.scores(text)
        max_abs = max(max_abs, float(np.max(np.abs(a - b))))
        same_top3 += int(list(np.argsort(-a, kind="stable")[:3]) == list(np.argsort(-b, kind="stable")[:3]))
    return {"queries_checked": n, "max_abs_score_difference": max_abs, "identical_top3": same_top3}


def main() -> None:
    raw = load_tickets()
    bench, preprocessing, evaluation = load_task_modules(SIMILAR)
    queries, corpus = preprocessing.prepare_frames(raw)

    def texts(frame, with_resolution: bool) -> list[str]:
        f = frame.copy()
        if not with_resolution:
            f["resolution_summary"] = None
        return f.apply(preprocessing.build_ticket_text, axis=1).tolist()

    corpus_with, corpus_without = texts(corpus, True), texts(corpus, False)
    query_with, query_without = texts(queries, True), texts(queries, False)
    assert query_with == queries["ticket_text"].tolist(), "text builder drifted from prepare_frames()"

    # D reproduces the retrieval text described in ml/reports/03_similar_ticket_retrieval_summary.md, which
    # appended the group metadata (incident_family, root_cause_family, resolution_pattern) that the current
    # code removed and now guards against (assert_no_label_leakage).
    def with_group_metadata(frame, base_texts):
        extra = frame.apply(
            lambda r: " ".join(
                preprocessing.normalize_text(r.get(c)) for c in ("incident_family", "root_cause_family", "resolution_pattern")
            ),
            axis=1,
        )
        return [f"{t} {e}".strip() for t, e in zip(base_texts, extra)]

    protocols = {
        "A_as_benchmarked": (query_with, corpus_with),
        "B_realistic_query": (query_without, corpus_with),
        "C_no_resolution_text": (query_without, corpus_without),
        "D_report_text_with_group_metadata": (with_group_metadata(queries, query_with), with_group_metadata(corpus, corpus_with)),
    }
    base_cat = lambda v: str(v).split("__ROOT_")[0]  # noqa: E731
    corpus_cat = corpus["incident_category"].map(base_cat).to_numpy()
    corpus_pos = {tid: i for i, tid in enumerate(corpus["ticket_id"].astype(str))}
    groups_per_category = corpus.groupby(corpus["incident_category"].map(base_cat))["similar_case_group_id"].nunique()
    out: dict = {
        "n_queries": int(len(queries)),
        "n_corpus": int(len(corpus)),
        "mean_relevant_per_query": float(queries["ground_truth_ids"].map(len).mean()),
        "random_ranking_expected_p_at_1": float(queries["ground_truth_ids"].map(len).mean() / (len(corpus) - 1)),
        "groups_per_base_category": {"mean": float(groups_per_category.mean()), "max": int(groups_per_category.max())},
        "bm25_equivalence_check": verify_bm25(corpus_with, query_with),
        "results": {},
    }
    for protocol, (q_texts, c_texts) in protocols.items():
        out["results"][protocol] = {}
        for method in ["tfidf", "bm25"]:
            print(f"[{protocol}] {method}", flush=True)
            rankings, times = rank_all(bench, queries, corpus, q_texts, c_texts, method)
            res = evaluation.evaluate_rankings(method, rankings, queries["ground_truth_ids"].tolist(), times)
            metrics = {k: float(getattr(res, k)) for k in vars(res) if isinstance(getattr(res, k), (int, float))}
            query_cat = queries["incident_category"].map(base_cat).to_numpy()
            metrics["top1_same_base_category"] = float(
                np.mean([corpus_cat[corpus_pos[r[0]]] == qc for r, qc in zip(rankings, query_cat) if r])
            )
            out["results"][protocol][method] = metrics
    write_result("05_retrieval_ablation", out, raw)


if __name__ == "__main__":
    main()
