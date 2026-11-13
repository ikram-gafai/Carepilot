"""E8 - Training/serving distribution shift on the operational (CARE) tickets.

The models are trained on the English synthetic corpus (ml_training), but the app scores the operational
CARE tickets seeded by scripts/seed-care-operational.ts, which are written in French. This script measures:
  * vocabulary coverage: share of a ticket's tokens that exist in the deployed escalation model's TF-IDF
    vocabulary, and share of tickets whose TF-IDF vector is entirely zero;
  * the deployed escalation predictions written by the real runner (cp_agent.ai_escalation_predictions)
    against the hand-authored care_source.tickets.escalation_required labels.

Prerequisites (see README section 11): operational seed + sync, then
`bun scripts/run-escalation-predictions.ts`.
Usage: python experiments/08_operational_shift.py
"""
from __future__ import annotations

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score
from sqlalchemy import create_engine

from common import ROOT, bootstrap_ci, clean_text, database_url, load_tickets, original_split, write_result


def tfidf_of(pipeline):
    pre = pipeline.named_steps["preprocessor"]
    return pre.named_transformers_["text"].named_steps["tfidf"] if hasattr(pre.named_transformers_["text"], "named_steps") else pre.named_transformers_["text"]


def coverage(texts: pd.Series, vectorizer) -> dict:
    vocab = set(vectorizer.vocabulary_)
    analyzer = vectorizer.build_analyzer()
    shares, zero = [], 0
    for text in texts:
        unigrams = [t for t in analyzer(text) if " " not in t]
        shares.append(np.mean([t in vocab for t in unigrams]) if unigrams else 0.0)
        zero += int(vectorizer.transform([text]).nnz == 0)
    return {"mean_unigram_coverage": float(np.mean(shares)), "share_all_zero_tfidf": zero / len(texts), "n": int(len(texts))}


def main() -> None:
    engine = create_engine(database_url())
    with engine.connect() as conn:
        ops = pd.read_sql_query(
            """
            SELECT c.care_ticket_id, c.title, c.description, c.escalation_required AS label,
                   p.probability_score, p.predicted_escalation_required, p.model_version
            FROM care_source.tickets c
            JOIN cp_agent.tickets t ON t.care_id = c.care_ticket_id
            LEFT JOIN cp_agent.ai_escalation_predictions p ON p.ticket_id = t.id
            """,
            conn,
        )
    if ops.empty or ops["probability_score"].isna().all():
        raise SystemExit("No operational predictions found: seed CARE, sync, then run bun scripts/run-escalation-predictions.ts")

    model = joblib.load(ROOT / "ml" / "artifacts" / "models" / "xgboost.joblib")
    vectorizer = tfidf_of(model)
    raw = load_tickets()
    _, _, test = original_split(raw, "escalation_required")
    train_text = (test["title"].fillna("") + " " + test["description"].fillna("")).map(clean_text)
    ops_text = (ops["title"].fillna("") + " " + ops["description"].fillna("")).map(clean_text)

    y = ops["label"].astype(bool).astype(int).to_numpy()
    p = ops["probability_score"].astype(float).to_numpy()
    model_positive = (p >= 0.45).astype(int)  # threshold used in ml/inference/escalation_predict.py
    stored_positive = ops["predicted_escalation_required"].astype(bool).astype(int).to_numpy()
    out = {
        "vocabulary_coverage": {"training_distribution_test_split": coverage(train_text, vectorizer), "operational_care_tickets": coverage(ops_text, vectorizer)},
        "operational_escalation": {
            "n": int(len(ops)),
            "label_positive_rate": float(y.mean()),
            "probability": {"min": float(p.min()), "median": float(np.median(p)), "max": float(p.max())},
            "model_positive_at_0.45": int(model_positive.sum()),
            "stored_positive_after_calibration": int(stored_positive.sum()),
            "recall_of_stored_decision": float((stored_positive & y).sum() / max(1, y.sum())),
            "roc_auc": float(roc_auc_score(y, p)) if 0 < y.sum() < len(y) else None,
            "roc_auc_ci95": bootstrap_ci(y, p, roc_auc_score) if 0 < y.sum() < len(y) else None,
            "model_version": str(ops["model_version"].dropna().iloc[0]),
        },
        "notes": ["Labels are the hand-authored catalog values in care_source.tickets; n is small, treat as a sanity check, not a benchmark."],
    }
    write_result("08_operational_shift", out, raw)


if __name__ == "__main__":
    main()
