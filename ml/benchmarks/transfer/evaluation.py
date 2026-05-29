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
    roc_auc_score,
    roc_curve,
)


@dataclass
class ModelResult:
    name: str
    accuracy: float
    precision: float
    recall: float
    f1: float
    roc_auc: float
    training_time_s: float
    inference_time_ms: float
    confusion_matrix: list[list[int]]
    normalized_confusion_matrix: list[list[float]]
    classification_report: dict
    fpr: list[float]
    tpr: list[float]
    thresholds: list[float]
    y_pred: list[int]
    y_proba: list[float]


def fit_and_evaluate(name: str, model, x_train, y_train, x_test, y_test) -> ModelResult:
    start = time.perf_counter()
    model.fit(x_train, y_train)
    training_time_s = time.perf_counter() - start

    start = time.perf_counter()
    y_pred = model.predict(x_test)
    if hasattr(model, "predict_proba"):
        y_proba = model.predict_proba(x_test)[:, 1]
    else:
        scores = model.decision_function(x_test)
        y_proba = (scores - scores.min()) / max(1e-9, scores.max() - scores.min())
    inference_time_ms = ((time.perf_counter() - start) / max(1, len(y_test))) * 1000

    fpr, tpr, thresholds = roc_curve(y_test, y_proba)
    return ModelResult(
        name=name,
        accuracy=accuracy_score(y_test, y_pred),
        precision=precision_score(y_test, y_pred, zero_division=0),
        recall=recall_score(y_test, y_pred, zero_division=0),
        f1=f1_score(y_test, y_pred, zero_division=0),
        roc_auc=roc_auc_score(y_test, y_proba),
        training_time_s=training_time_s,
        inference_time_ms=inference_time_ms,
        confusion_matrix=confusion_matrix(y_test, y_pred).tolist(),
        normalized_confusion_matrix=confusion_matrix(y_test, y_pred, normalize="true").tolist(),
        classification_report=classification_report(
            y_test,
            y_pred,
            target_names=["No transfer", "Transfer"],
            output_dict=True,
            zero_division=0,
        ),
        fpr=fpr.tolist(),
        tpr=tpr.tolist(),
        thresholds=thresholds.tolist(),
        y_pred=np.asarray(y_pred).astype(int).tolist(),
        y_proba=np.asarray(y_proba).astype(float).tolist(),
    )


def result_table(results: list[ModelResult]) -> list[dict[str, float | str]]:
    return [
        {
            "Model": r.name,
            "Accuracy": round(r.accuracy, 4),
            "Precision": round(r.precision, 4),
            "Recall": round(r.recall, 4),
            "F1": round(r.f1, 4),
            "ROC-AUC": round(r.roc_auc, 4),
            "Training Time (s)": round(r.training_time_s, 4),
            "Inference Time (ms/row)": round(r.inference_time_ms, 4),
        }
        for r in results
    ]


def best_by_f1(results: list[ModelResult]) -> ModelResult:
    return sorted(results, key=lambda r: (r.f1, r.roc_auc), reverse=True)[0]
