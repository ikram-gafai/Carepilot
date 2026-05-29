#!/usr/bin/env python3
"""Sentence-transformer KM retrieval inference (stdin JSON → stdout JSON)."""

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

from km_recommendation.preprocessing import (  # noqa: E402
    base_incident_category,
    build_km_text_semantic,
    build_ticket_text_semantic,
    derive_incident_keywords,
)

TOP_K = 3
CANDIDATE_POOL = 20
SENTENCE_MODEL = "all-MiniLM-L6-v2"


def confidence_level(score: float) -> str:
    if score >= 0.72:
        return "HIGH"
    if score >= 0.55:
        return "MEDIUM"
    return "LOW"


def build_reason(ticket: dict, km: dict, score: float) -> str:
    parts = []
    if ticket.get("perimeter") and km.get("perimeter") and ticket["perimeter"] == km["perimeter"]:
        parts.append("matching perimeter")
    ticket_category = base_incident_category(ticket.get("incident_category") or ticket.get("category"))
    km_category = base_incident_category(km.get("incident_category") or km.get("category"))
    if ticket_category and km_category and ticket_category.lower() == km_category.lower():
        parts.append("category overlap")
    if score >= 0.7:
        parts.append("strong semantic match")
    elif score >= 0.55:
        parts.append("partial operational overlap")
    else:
        parts.append("weak lexical/semantic overlap")
    return ", ".join(parts)


def metadata_boost(scores: np.ndarray, ticket: dict, km_rows: list[dict], indices: np.ndarray) -> np.ndarray:
    boosted = scores.copy()
    ticket_category = base_incident_category(ticket.get("incident_category") or ticket.get("category")).lower()
    ticket_perimeter = str(ticket.get("perimeter", "")).lower()
    for offset, index in enumerate(indices):
        km = km_rows[int(index)]
        factor = 1.0
        if str(km.get("perimeter", "")).lower() == ticket_perimeter:
            factor += 0.12
        km_category = base_incident_category(km.get("incident_category") or km.get("category")).lower()
        if km_category == ticket_category:
            factor += 0.18
        boosted[offset] *= factor
    return boosted


def encode_corpus(model, km_records: list[dict]) -> tuple[list[str], np.ndarray, list[dict]]:
    import pandas as pd

    texts = []
    for record in km_records:
        row = {
            "title": record.get("title", ""),
            "procedure_steps": record.get("procedure_steps") or record.get("procedureSteps") or record.get("summary", ""),
            "keywords": record.get("keywords", ""),
            "perimeter": record.get("perimeter", ""),
            "incident_category": record.get("incident_category") or record.get("category", ""),
        }
        texts.append(build_km_text_semantic(pd.Series(row)))
    embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    km_ids = [str(record.get("km_id") or record.get("km_code") or record.get("code") or record.get("id")) for record in km_records]
    return km_ids, embeddings, km_records


def recommend(bundle: dict, tickets: list[dict], km_records: list[dict]) -> list[dict]:
    if not tickets or not km_records:
        return []

    from sentence_transformers import SentenceTransformer
    import pandas as pd

    model_name = bundle.get("model_name", SENTENCE_MODEL)
    model = SentenceTransformer(model_name)

    if bundle.get("km_embeddings") is not None and bundle.get("km_records"):
        indexed_km = bundle["km_records"]
        km_ids = [str(item.get("km_id") or item.get("km_code") or item.get("code")) for item in indexed_km]
        km_embeddings = np.asarray(bundle["km_embeddings"])
    else:
        km_ids, km_embeddings, indexed_km = encode_corpus(model, km_records)

    output: list[dict] = []
    for ticket in tickets:
        ticket_row = pd.Series(
            {
                "title": ticket.get("title", ""),
                "description": ticket.get("description", ""),
                "perimeter": ticket.get("perimeter", ""),
                "incident_category": ticket.get("incident_category") or ticket.get("category", ""),
                "incident_keywords": derive_incident_keywords(
                    pd.Series(
                        {
                            "title": ticket.get("title", ""),
                            "description": ticket.get("description", ""),
                            "incident_category": ticket.get("incident_category") or ticket.get("category", ""),
                        }
                    )
                ),
            }
        )
        ticket_text = build_ticket_text_semantic(ticket_row)
        query = model.encode([ticket_text], normalize_embeddings=True, show_progress_bar=False)
        semantic_scores = (km_embeddings @ query.T).ravel()
        candidate_indices = np.argsort(semantic_scores)[::-1][:CANDIDATE_POOL]
        candidate_scores = semantic_scores[candidate_indices]
        boosted = metadata_boost(
            candidate_scores,
            ticket,
            indexed_km,
            candidate_indices,
        )
        semantic_scores[candidate_indices] = boosted
        order = np.argsort(semantic_scores)[::-1][:TOP_K]

        recs = []
        for rank, index in enumerate(order, start=1):
            km = indexed_km[int(index)]
            score = float(semantic_scores[index])
            km_id = km_ids[int(index)]
            recs.append(
                {
                    "ticket_id": ticket.get("ticket_id"),
                    "km_id": km_id,
                    "km_title": km.get("title", ""),
                    "similarity_score": round(score, 6),
                    "rank": rank,
                    "confidence_level": confidence_level(score),
                    "reason": build_reason(ticket, km, score),
                }
            )
        output.append({"ticket_id": ticket.get("ticket_id"), "recommendations": recs})
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description="KM retrieval inference")
    parser.add_argument(
        "--model",
        default=str(ROOT / "ml" / "artifacts" / "models" / "km_retrieval_minilm.joblib"),
    )
    args = parser.parse_args()

    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError as exc:
        print(json.dumps({"ok": False, "error": f"Invalid JSON input: {exc}"}))
        return 1

    tickets = payload.get("tickets")
    km_records = payload.get("km_records")
    if not isinstance(tickets, list) or not isinstance(km_records, list):
        print(json.dumps({"ok": False, "error": 'Expected { "tickets": [...], "km_records": [...] }'}))
        return 1

    model_path = Path(args.model)
    if not model_path.exists():
        print(json.dumps({"ok": False, "error": f"Model artifact not found: {model_path}"}))
        return 1

    bundle = joblib.load(model_path)
    results = recommend(bundle, tickets, km_records)
    print(json.dumps({"ok": True, "results": results}, allow_nan=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
