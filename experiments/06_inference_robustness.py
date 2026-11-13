"""E6 - Robustness of the production inference contract.

The Next.js runners (lib/ai/*-prediction.ts) spawn `python ml/inference/<task>.py --model <artifact>`
and exchange JSON over stdin/stdout. This script drives the same CLIs with the committed artifacts and
edge-case payloads, recording exit code, the `ok` flag, output validity and wall-clock latency
(process start + model load + prediction, i.e. what one batch costs the app).

Usage: python experiments/06_inference_robustness.py
"""
from __future__ import annotations

import json
import subprocess
import sys
import time

import numpy as np

from common import ROOT, load_tickets, original_split, write_result

SCRIPTS = {
    "escalation": ("escalation_predict.py", "xgboost.joblib", "escalation_required"),
    "transfer": ("transfer_predict.py", "xgboost_transfer.joblib", "transfer_required"),
    "sla": ("sla_predict.py", "xgboost_sla.joblib", "sla_breached"),
    "priority": ("priority_predict.py", "xgboost_priority.joblib", "priority"),
    "action": ("action_recommend_predict.py", "xgboost_action.joblib", "recommended_action"),
}
FIELDS = [
    "ticket_id", "title", "description", "perimeter", "priority", "incident_category", "environment_type",
    "ticket_source", "store_size", "queue_load", "sla_breached", "escalation_required", "transfer_required",
    "recommended_action", "resolution_time_minutes", "ticket_age_minutes", "operational_complexity",
]


def to_row(record: dict) -> dict:
    row = {}
    for key in FIELDS:
        value = record.get(key)
        if isinstance(value, (np.bool_, bool)):
            value = bool(value)
        elif isinstance(value, (np.integer,)):
            value = int(value)
        elif isinstance(value, (np.floating, float)):
            value = None if np.isnan(value) else float(value)
        row[key] = value
    return row


def run(script: str, model: str, payload) -> dict:
    body = payload if isinstance(payload, str) else json.dumps(payload)
    start = time.perf_counter()
    proc = subprocess.run(
        [sys.executable, str(ROOT / "ml" / "inference" / script), "--model", str(ROOT / "ml" / "artifacts" / "models" / model)],
        input=body, capture_output=True, text=True, timeout=300,
    )
    elapsed = (time.perf_counter() - start) * 1000
    try:
        parsed = json.loads(proc.stdout.strip().splitlines()[-1]) if proc.stdout.strip() else None
    except (json.JSONDecodeError, IndexError):
        parsed = None
    result = {"exit_code": proc.returncode, "latency_ms": elapsed}
    if parsed is None:
        result["ok"] = False
        result["error"] = (proc.stderr.strip().splitlines() or ["<no stderr>"])[-1][:300]
        return result
    result["ok"] = bool(parsed.get("ok"))
    if not result["ok"]:
        result["error"] = str(parsed.get("error"))[:300]
        return result
    preds = parsed.get("predictions", [])
    result["n_predictions"] = len(preds)
    probs = [p.get("probability_score", p.get("confidence_score")) for p in preds]
    probs = [p for p in probs if isinstance(p, (int, float))]
    result["scores_in_unit_interval"] = all(0.0 <= p <= 1.0 for p in probs) if probs else None
    result["_predictions"] = preds
    return result


def main() -> None:
    raw = load_tickets()
    _, _, test = original_split(raw, "escalation_required")
    base = to_row(test.iloc[0].to_dict())
    batch50 = [to_row(r) for r in test.head(50).to_dict("records")]
    cases = {
        "empty_batch": {"tickets": []},
        "single_valid_ticket": {"tickets": [base]},
        "batch_of_50": {"tickets": batch50},
        "nulls_for_optional_fields": {"tickets": [{**base, "description": None, "resolution_time_minutes": None, "ticket_age_minutes": None, "queue_load": None}]},
        "unseen_categories": {"tickets": [{**base, "perimeter": "Unknown team", "incident_category": "NEVER_SEEN_CATEGORY", "environment_type": "lab", "store_size": "kiosk"}]},
        "empty_strings": {"tickets": [{**base, "title": "", "description": "", "perimeter": "", "incident_category": ""}]},
        "very_long_description_50k_chars": {"tickets": [{**base, "description": "terminal paiement bloque " * 2100}]},
        "non_ascii_french_text": {"tickets": [{**base, "title": "Caisse bloquée — paiement refusé", "description": "Le TPE affiche « transaction refusée » après la mise à jour ; magasin très chargé."}]},
        "string_in_numeric_field": {"tickets": [{**base, "resolution_time_minutes": "abc", "queue_load": "high"}]},
        "missing_required_key": {"tickets": [{k: v for k, v in base.items() if k != "incident_category"}]},
        "malformed_json": "{not json",
        "wrong_top_level_shape": {"items": [base]},
    }
    out: dict = {"tasks": {}}
    for task, (script, model, _) in SCRIPTS.items():
        task_out = {}
        for name, payload in cases.items():
            print(f"[{task}] {name}", flush=True)
            res = run(script, model, payload)
            res.pop("_predictions", None)
            task_out[name] = res
        a, b = run(script, model, {"tickets": batch50}), run(script, model, {"tickets": batch50})
        task_out["determinism_same_batch_twice"] = {"identical_outputs": a.get("_predictions") == b.get("_predictions")}
        out["tasks"][task] = task_out
    out["python"] = sys.version.split()[0]
    write_result("06_inference_robustness", out, raw)


if __name__ == "__main__":
    main()
