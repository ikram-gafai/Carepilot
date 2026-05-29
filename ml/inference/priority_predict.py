#!/usr/bin/env python3
"""Run XGBoost priority prediction inference for CARE ticket feature rows (stdin JSON → stdout JSON)."""

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

from priority_prediction.preprocessing import (  # noqa: E402
    CAT_COLUMNS,
    NUM_COLUMNS,
    PRIORITY_CLASSES,
    TARGET_COLUMN,
    TEXT_COLUMN,
    prepare_dataframe,
)


def inference_matrix(df: pd.DataFrame) -> pd.DataFrame:
    return df[[TEXT_COLUMN, *CAT_COLUMNS, *NUM_COLUMNS]]


def predict(bundle, tickets: list[dict]) -> list[dict]:
    if not tickets:
        return []

    pipeline = bundle["pipeline"] if isinstance(bundle, dict) else bundle
    label_encoder = bundle.get("label_encoder") if isinstance(bundle, dict) else None
    classes = bundle.get("classes", PRIORITY_CLASSES) if isinstance(bundle, dict) else PRIORITY_CLASSES

    frame = pd.DataFrame(tickets)
    for col in ["description", "resolution_time_minutes", "priority"]:
        if col not in frame.columns:
            frame[col] = None if col != "priority" else "P3"

    prepared = prepare_dataframe(frame)
    x = inference_matrix(prepared)

    y_pred = pipeline.predict(x)
    y_proba = pipeline.predict_proba(x)

    if label_encoder is not None:
        y_labels = label_encoder.inverse_transform(y_pred.astype(int))
    else:
        y_labels = np.asarray(y_pred)

    results: list[dict] = []
    for index, ticket in enumerate(tickets):
        probabilities = {
            str(classes[i]): round(float(y_proba[index, i]), 6) for i in range(len(classes))
        }
        predicted = str(y_labels[index])
        confidence = float(probabilities.get(predicted, max(probabilities.values(), default=0.0)))
        results.append(
            {
                "ticket_id": ticket.get("ticket_id"),
                "predicted_priority": predicted,
                "confidence_score": round(confidence, 6),
                "probability_distribution": probabilities,
            },
        )
    return results


def main() -> int:
    parser = argparse.ArgumentParser(description="XGBoost priority prediction batch inference")
    parser.add_argument(
        "--model",
        default=str(ROOT / "ml" / "artifacts" / "models" / "xgboost_priority.joblib"),
        help="Path to trained joblib bundle",
    )
    args = parser.parse_args()

    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError as exc:
        print(json.dumps({"ok": False, "error": f"Invalid JSON input: {exc}"}))
        return 1

    tickets = payload.get("tickets")
    if not isinstance(tickets, list):
        print(json.dumps({"ok": False, "error": 'Expected { "tickets": [...] }'}))
        return 1

    model_path = Path(args.model)
    if not model_path.exists():
        print(json.dumps({"ok": False, "error": f"Model artifact not found: {model_path}"}))
        return 1

    bundle = joblib.load(model_path)
    predictions = predict(bundle, tickets)
    print(json.dumps({"ok": True, "predictions": predictions}, allow_nan=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
