#!/usr/bin/env python3
"""Run XGBoost escalation inference for CARE ticket feature rows (stdin JSON → stdout JSON)."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
BENCHMARKS_DIR = ROOT / "ml" / "benchmarks"
sys.path.insert(0, str(BENCHMARKS_DIR))

from escalation.preprocessing import (  # noqa: E402
    CAT_COLUMNS,
    NUM_COLUMNS,
    TARGET_COLUMN,
    TEXT_COLUMN,
    prepare_dataframe,
)


def inference_matrix(df: pd.DataFrame) -> pd.DataFrame:
    return df[[TEXT_COLUMN, *CAT_COLUMNS, *NUM_COLUMNS]]


def predict(model, tickets: list[dict]) -> list[dict]:
    if not tickets:
        return []

    frame = pd.DataFrame(tickets)
    if TARGET_COLUMN not in frame.columns:
        frame[TARGET_COLUMN] = 0

    prepared = prepare_dataframe(frame)
    x = inference_matrix(prepared)

    y_pred = model.predict(x)
    if hasattr(model, "predict_proba"):
        y_proba = model.predict_proba(x)[:, 1]
    else:
        scores = model.decision_function(x)
        y_proba = (scores - scores.min()) / max(1e-9, scores.max() - scores.min())

    y_pred = (y_proba >= 0.45).astype(int)

    results: list[dict] = []
    for index, ticket in enumerate(tickets):
        pred = int(y_pred[index])
        prob = float(y_proba[index])
        confidence = prob if pred == 1 else 1.0 - prob
        results.append(
            {
                "ticket_id": ticket.get("ticket_id"),
                "predicted_escalation_required": bool(pred),
                "confidence_score": round(confidence, 6),
                "probability_score": round(prob, 6),
                "prediction_label": "Escalate to N3" if pred == 1 else "No N3 escalation required",
            },
        )
    return results


def main() -> int:
    parser = argparse.ArgumentParser(description="XGBoost escalation batch inference")
    parser.add_argument(
        "--model",
        default=str(ROOT / "ml" / "artifacts" / "models" / "xgboost.joblib"),
        help="Path to trained joblib pipeline",
    )
    args = parser.parse_args()

    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError as exc:
        print(json.dumps({"ok": False, "error": f"Invalid JSON input: {exc}"}))
        return 1

    tickets = payload.get("tickets")
    if not isinstance(tickets, list):
        print(json.dumps({"ok": False, "error": "Expected { \"tickets\": [...] }"}))
        return 1

    model_path = Path(args.model)
    if not model_path.exists():
        print(json.dumps({"ok": False, "error": f"Model artifact not found: {model_path}"}))
        return 1

    model = joblib.load(model_path)
    predictions = predict(model, tickets)
    print(json.dumps({"ok": True, "predictions": predictions}, allow_nan=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
