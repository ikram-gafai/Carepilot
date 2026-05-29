from __future__ import annotations

import time
from dataclasses import dataclass

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)


@dataclass
class ModelResult:
    name: str
    accuracy: float
    macro_precision: float
    macro_recall: float
    macro_f1: float
    weighted_f1: float
    training_time_s: float
    inference_time_ms: float
    confusion_matrix: list[list[int]]
    normalized_confusion_matrix: list[list[float]]
    classification_report: dict
    y_pred: list[str]
    y_proba: list[list[float]] | None
    per_class_precision: dict[str, float]
    per_class_recall: dict[str, float]


def fit_and_evaluate(
    name: str,
    model,
    x_train,
    y_train,
    x_test,
    y_test,
    class_names: list[str],
    label_encoder=None,
) -> ModelResult:
    start = time.perf_counter()
    model.fit(x_train, y_train)
    training_time_s = time.perf_counter() - start

    start = time.perf_counter()
    y_pred_raw = model.predict(x_test)
    if label_encoder is not None:
        y_pred = label_encoder.inverse_transform(y_pred_raw)
        y_test_eval = label_encoder.inverse_transform(y_test)
    else:
        y_pred = y_pred_raw
        y_test_eval = y_test
    y_proba = model.predict_proba(x_test).tolist() if hasattr(model, "predict_proba") else None
    inference_time_ms = ((time.perf_counter() - start) / max(1, len(y_test))) * 1000

    report = classification_report(
        y_test_eval,
        y_pred,
        labels=class_names,
        target_names=class_names,
        output_dict=True,
        zero_division=0,
    )

    per_class_precision = {label: float(report[label]["precision"]) for label in class_names if label in report}
    per_class_recall = {label: float(report[label]["recall"]) for label in class_names if label in report}

    return ModelResult(
        name=name,
        accuracy=accuracy_score(y_test_eval, y_pred),
        macro_precision=precision_score(y_test_eval, y_pred, average="macro", zero_division=0, labels=class_names),
        macro_recall=recall_score(y_test_eval, y_pred, average="macro", zero_division=0, labels=class_names),
        macro_f1=f1_score(y_test_eval, y_pred, average="macro", zero_division=0, labels=class_names),
        weighted_f1=f1_score(y_test_eval, y_pred, average="weighted", zero_division=0, labels=class_names),
        training_time_s=training_time_s,
        inference_time_ms=inference_time_ms,
        confusion_matrix=confusion_matrix(y_test_eval, y_pred, labels=class_names).tolist(),
        normalized_confusion_matrix=confusion_matrix(
            y_test_eval,
            y_pred,
            labels=class_names,
            normalize="true",
        ).tolist(),
        classification_report=report,
        y_pred=np.asarray(y_pred).astype(str).tolist(),
        y_proba=y_proba,
        per_class_precision=per_class_precision,
        per_class_recall=per_class_recall,
    )


def result_table(results: list[ModelResult]) -> list[dict[str, float | str]]:
    return [
        {
            "Model": r.name,
            "Accuracy": round(r.accuracy, 4),
            "Macro Precision": round(r.macro_precision, 4),
            "Macro Recall": round(r.macro_recall, 4),
            "Macro F1": round(r.macro_f1, 4),
            "Weighted F1": round(r.weighted_f1, 4),
            "Training Time (s)": round(r.training_time_s, 4),
            "Inference Time (ms/row)": round(r.inference_time_ms, 4),
        }
        for r in results
    ]


def best_by_macro_f1(results: list[ModelResult]) -> ModelResult:
    return sorted(results, key=lambda r: (r.macro_f1, r.accuracy), reverse=True)[0]
