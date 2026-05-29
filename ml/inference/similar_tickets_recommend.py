#!/usr/bin/env python3
"""Similar historical ticket retrieval inference (stdin JSON → stdout JSON)."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import joblib
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
BENCHMARKS_DIR = ROOT / "ml" / "benchmarks"
sys.path.insert(0, str(BENCHMARKS_DIR))

from similar_ticket_retrieval.preprocessing import build_ticket_text_semantic  # noqa: E402

TOP_K = 3
SENTENCE_MODEL = "all-MiniLM-L6-v2"


def build_query_text(ticket: dict) -> str:
    import pandas as pd

    row = pd.Series(
        {
            "title": ticket.get("title", ""),
            "description": ticket.get("description", ""),
            "perimeter": ticket.get("perimeter", ""),
            "incident_category": ticket.get("incident_category") or ticket.get("category", ""),
            "semantic_group": "",
            "incident_keywords": "",
        }
    )
    return build_ticket_text_semantic(row)


def build_corpus_text(record: dict) -> str:
    import pandas as pd

    row = pd.Series(
        {
            "title": record.get("title", ""),
            "description": record.get("description", ""),
            "perimeter": record.get("perimeter", ""),
            "incident_category": record.get("incident_category") or record.get("category", ""),
            "semantic_group": "",
            "incident_keywords": "",
        }
    )
    return build_ticket_text_semantic(row)


def recommend(bundle: dict, tickets: list[dict], corpus: list[dict]) -> list[dict]:
    if not tickets or not corpus:
        return []

    from sentence_transformers import SentenceTransformer

    model_name = bundle.get("model_name", SENTENCE_MODEL)
    model = SentenceTransformer(model_name)

    if bundle.get("corpus_embeddings") is not None and bundle.get("corpus_records"):
        indexed = bundle["corpus_records"]
        corpus_ids = [int(item["ticket_id"]) for item in indexed]
        corpus_embeddings = np.asarray(bundle["corpus_embeddings"])
    else:
        indexed = corpus
        corpus_ids = [int(item["ticket_id"]) for item in indexed]
        corpus_texts = [build_corpus_text(item) for item in indexed]
        corpus_embeddings = model.encode(corpus_texts, normalize_embeddings=True, show_progress_bar=False)

    care_by_id = {int(item["ticket_id"]): str(item.get("care_id", "")) for item in indexed}
    title_by_id = {int(item["ticket_id"]): str(item.get("title", "")) for item in indexed}
    resolution_by_id = {int(item["ticket_id"]): item.get("linked_resolution") for item in indexed}
    action_by_id = {int(item["ticket_id"]): item.get("ai_recommended_action") for item in indexed}
    km_by_id = {int(item["ticket_id"]): item.get("linked_km_id") for item in indexed}

    output: list[dict] = []
    for ticket in tickets:
        query_id = int(ticket["ticket_id"])
        query = model.encode([build_query_text(ticket)], normalize_embeddings=True, show_progress_bar=False)
        scores = (corpus_embeddings @ query.T).ravel()
        for index, corpus_id in enumerate(corpus_ids):
            if corpus_id == query_id:
                scores[index] = -1.0
        order = np.argsort(scores)[::-1][:TOP_K]
        matches = []
        for rank, index in enumerate(order, start=1):
            corpus_id = corpus_ids[int(index)]
            if scores[int(index)] < 0:
                continue
            matches.append(
                {
                    "ticket_id": query_id,
                    "similar_ticket_id": corpus_id,
                    "similar_care_id": care_by_id.get(corpus_id, ""),
                    "similar_title": title_by_id.get(corpus_id, ""),
                    "similarity_score": round(float(scores[int(index)]), 6),
                    "rank": rank,
                    "linked_resolution": resolution_by_id.get(corpus_id),
                    "linked_action": action_by_id.get(corpus_id),
                    "linked_km_id": km_by_id.get(corpus_id),
                }
            )
        output.append({"ticket_id": query_id, "matches": matches})
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description="Similar ticket retrieval inference")
    parser.add_argument(
        "--model",
        default=str(ROOT / "ml" / "artifacts" / "models" / "similar_ticket_retrieval_minilm.joblib"),
    )
    args = parser.parse_args()

    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError as exc:
        print(json.dumps({"ok": False, "error": f"Invalid JSON input: {exc}"}))
        return 1

    tickets = payload.get("tickets")
    corpus = payload.get("corpus")
    if not isinstance(tickets, list) or not isinstance(corpus, list):
        print(json.dumps({"ok": False, "error": 'Expected { "tickets": [...], "corpus": [...] }'}))
        return 1

    model_path = Path(args.model)
    if not model_path.exists():
        print(json.dumps({"ok": False, "error": f"Model artifact not found: {model_path}"}))
        return 1

    bundle = joblib.load(model_path)
    if corpus:
        texts = [build_corpus_text(item) for item in corpus]
        from sentence_transformers import SentenceTransformer

        model = SentenceTransformer(bundle.get("model_name", SENTENCE_MODEL))
        bundle = {
            **bundle,
            "corpus_records": corpus,
            "corpus_embeddings": model.encode(texts, normalize_embeddings=True, show_progress_bar=False),
        }

    results = recommend(bundle, tickets, corpus)
    print(json.dumps({"ok": True, "results": results}, allow_nan=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
