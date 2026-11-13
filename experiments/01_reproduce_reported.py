"""E1 - Reproduction audit.

1. Re-run the ORIGINAL benchmark code (build_models, stratified_splits, fit_and_evaluate from
   ml/benchmarks/<task>/) on the current ml_training dataset and compare with the numbers written in
   ml/reports/03_*_summary.md.
2. Score the COMMITTED model artifacts (ml/artifacts/models/xgboost*.joblib) on the same test split.

Usage: python experiments/01_reproduce_reported.py
"""
from __future__ import annotations

import time

import joblib
import numpy as np

from common import ROOT, TASKS, load_task_modules, load_tickets, write_result

# Values transcribed from the committed reports (file: table) for side-by-side comparison.
REPORTED = {
    "escalation": {
        "source": "ml/reports/03_escalation_benchmark_summary.md",
        "positive_rate_reported": "~18%",
        "Logistic Regression": {"accuracy": 0.817, "precision": 0.875, "recall": 0.633, "f1": 0.735, "roc_auc": 0.927},
        "Random Forest": {"accuracy": 0.852, "precision": 0.859, "recall": 0.755, "f1": 0.804, "roc_auc": 0.931},
        "XGBoost": {"accuracy": 0.873, "precision": 0.806, "recall": 0.899, "f1": 0.850, "roc_auc": 0.954},
    },
    "transfer": {
        "source": "ml/reports/03_transfer_benchmark_summary.md",
        "positive_rate_reported": "35%",
        "Logistic Regression": {"accuracy": 0.748, "precision": 0.701, "recall": 0.485, "f1": 0.573, "roc_auc": 0.760},
        "Random Forest": {"accuracy": 0.809, "precision": 0.763, "recall": 0.657, "f1": 0.706, "roc_auc": 0.871},
        "XGBoost": {"accuracy": 0.841, "precision": 0.755, "recall": 0.805, "f1": 0.779, "roc_auc": 0.915},
    },
    "sla": {
        "source": "ml/reports/03_sla_prediction_benchmark_summary.md",
        "positive_rate_reported": "31.82%",
        "Logistic Regression": {"accuracy": 0.772, "precision": 0.606, "recall": 0.807, "f1": 0.692, "roc_auc": 0.855},
        "Random Forest": {"accuracy": 0.786, "precision": 0.650, "recall": 0.707, "f1": 0.677, "roc_auc": 0.847},
        "XGBoost": {"accuracy": 0.868, "precision": 0.745, "recall": 0.889, "f1": 0.811, "roc_auc": 0.952},
    },
    "priority": {
        "source": "ml/reports/03_priority_prediction_benchmark_summary.md",
        "Logistic Regression": {"accuracy": 0.7381, "macro_f1": 0.7298, "weighted_f1": 0.7336},
        "Random Forest": {"accuracy": 0.7386, "macro_f1": 0.7526, "weighted_f1": 0.7381},
        "XGBoost": {"accuracy": 0.8295, "macro_f1": 0.8318, "weighted_f1": 0.8279},
    },
    "action": {
        "source": "ml/reports/03_action_recommendation_benchmark_summary.md",
        "Logistic Regression": {"accuracy": 0.6648, "macro_f1": 0.6397, "weighted_f1": 0.6512},
        "Random Forest": {"accuracy": 0.6805, "macro_f1": 0.6518, "weighted_f1": 0.6618},
        "XGBoost": {"accuracy": 0.681, "macro_f1": 0.6584, "weighted_f1": 0.6691},
    },
}

COMMITTED_ARTIFACTS = {
    "escalation": ("xgboost.joblib", None),
    "transfer": ("xgboost_transfer.joblib", None),
    "sla": ("xgboost_sla.joblib", None),
    "priority": ("xgboost_priority.joblib", "priority_label_encoder.joblib"),
    "action": ("xgboost_action.joblib", "action_label_encoder.joblib"),
}

BINARY_KEYS = ["accuracy", "precision", "recall", "f1", "roc_auc", "training_time_s", "inference_time_ms"]
MULTI_KEYS = ["accuracy", "macro_precision", "macro_recall", "macro_f1", "weighted_f1", "training_time_s", "inference_time_ms"]


def result_dict(result, keys):
    return {k: float(getattr(result, k)) for k in keys if hasattr(result, k)}


def main() -> None:
    raw = load_tickets()
    out: dict = {"tasks": {}}
    for task in TASKS.values():
        benchmark, preprocessing, evaluation = load_task_modules(task)
        df = preprocessing.prepare_dataframe(raw)
        train_df, _, test_df = benchmark.stratified_splits(df)
        x_train, y_train_raw = preprocessing.feature_matrix(train_df)
        x_test, y_test_raw = preprocessing.feature_matrix(test_df)
        entry: dict = {"reported": REPORTED[task.key], "reproduced": {}, "committed_artifact": {}}

        if task.kind == "binary":
            y_train, y_test = y_train_raw.to_numpy(), y_test_raw.to_numpy()
            pos_weight = max(1, int((y_train == 0).sum())) / max(1, int((y_train == 1).sum()))
            models = benchmark.build_models(pos_weight=pos_weight)
            entry["positive_rate_current"] = float(df[task.target].mean())
            keys = BINARY_KEYS
        else:
            encoder = preprocessing.build_label_encoder(df[task.target])
            y_train = preprocessing.encode_labels(y_train_raw, encoder)
            y_test = preprocessing.encode_labels(y_test_raw, encoder)
            models = benchmark.build_models()
            classes = getattr(preprocessing, "PRIORITY_CLASSES", None) or getattr(preprocessing, "ACTION_CLASSES")
            entry["class_distribution_current"] = df[task.target].value_counts(normalize=True).round(4).to_dict()
            keys = MULTI_KEYS

        for name, model in models.items():
            print(f"[{task.key}] fitting {name} ...", flush=True)
            if task.kind == "binary":
                res = evaluation.fit_and_evaluate(name, model, x_train, y_train, x_test, y_test)
            else:
                res = evaluation.fit_and_evaluate(name, model, x_train, y_train, x_test, y_test, classes, encoder)
            entry["reproduced"][name] = result_dict(res, keys)

        entry["split_sizes"] = {"train": len(train_df), "test": len(test_df)}
        out["tasks"][task.key] = entry
        try:
            entry["committed_artifact"] = score_committed(task, x_test, y_test, encoder if task.kind != "binary" else None)
        except Exception as exc:  # incompatible pickle / feature schema drift is itself a finding
            entry["committed_artifact"] = {"file": COMMITTED_ARTIFACTS[task.key][0], "error": f"{type(exc).__name__}: {exc}"[:400]}

    out["notes"] = [
        "Reproduced = original ml/benchmarks code re-run on the dataset identified by meta.dataset.fingerprint_sha256.",
        "The committed artifacts were trained on an earlier generator version; their scores here measure behaviour on the current generator, not a re-run of the original test.",
    ]
    write_result("01_reproduction", out, raw)


def score_committed(task, x_test, y_test, encoder):
    from common import binary_metrics, multiclass_metrics

    model_file, encoder_file = COMMITTED_ARTIFACTS[task.key]
    artifact = joblib.load(ROOT / "ml" / "artifacts" / "models" / model_file)
    bundle_encoder = None
    if isinstance(artifact, dict):  # priority/action artifacts are {"model": ..., "label_encoder": ...} bundles
        bundle_encoder = artifact.get("label_encoder")
        artifact = next(v for v in artifact.values() if hasattr(v, "predict"))
    start = time.perf_counter()
    y_pred = artifact.predict(x_test)
    elapsed_ms = (time.perf_counter() - start) * 1000 / len(x_test)
    if task.kind == "binary":
        proba = artifact.predict_proba(x_test)[:, 1]
        return {"file": model_file, **binary_metrics(np.asarray(y_test), proba), "inference_time_ms": elapsed_ms}
    committed_encoder = bundle_encoder or joblib.load(ROOT / "ml" / "artifacts" / "models" / encoder_file)
    return {
        "file": model_file,
        "label_encoder_matches": list(committed_encoder.classes_) == list(encoder.classes_),
        **multiclass_metrics(np.asarray(y_test), np.asarray(y_pred)),
        "inference_time_ms": elapsed_ms,
    }


if __name__ == "__main__":
    main()
