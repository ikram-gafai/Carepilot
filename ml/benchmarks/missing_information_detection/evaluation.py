"""Multilabel evaluation metrics for Task 8."""

from __future__ import annotations

import time
from dataclasses import dataclass

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    hamming_loss,
    precision_score,
    recall_score,
)


@dataclass
class ModelResult:
    name: str
    micro_precision: float
    micro_recall: float
    micro_f1: float
    macro_precision: float
    macro_recall: float
    macro_f1: float
    hamming_loss: float
    exact_match_ratio: float
    training_time_s: float
    inference_time_ms: float
    y_pred: np.ndarray | None = None


def evaluate_multilabel(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    name: str,
    training_time_s: float = 0.0,
    inference_time_ms: float = 0.0,
) -> ModelResult:
    return ModelResult(
        name=name,
        micro_precision=float(precision_score(y_true, y_pred, average="micro", zero_division=0)),
        micro_recall=float(recall_score(y_true, y_pred, average="micro", zero_division=0)),
        micro_f1=float(f1_score(y_true, y_pred, average="micro", zero_division=0)),
        macro_precision=float(precision_score(y_true, y_pred, average="macro", zero_division=0)),
        macro_recall=float(recall_score(y_true, y_pred, average="macro", zero_division=0)),
        macro_f1=float(f1_score(y_true, y_pred, average="macro", zero_division=0)),
        hamming_loss=float(hamming_loss(y_true, y_pred)),
        exact_match_ratio=float(accuracy_score(y_true, y_pred)),
        training_time_s=training_time_s,
        inference_time_ms=inference_time_ms,
        y_pred=y_pred,
    )


def timed_predict(model, X) -> tuple[np.ndarray, float]:
    start = time.perf_counter()
    pred = model.predict(X)
    n_rows = X.shape[0] if hasattr(X, "shape") else len(X)
    elapsed_ms = (time.perf_counter() - start) * 1000 / max(n_rows, 1)
    return pred, elapsed_ms


def result_table(results: list[ModelResult]) -> str:
    header = (
        "| Method | Micro Precision | Micro Recall | Micro F1 | Macro F1 | Hamming Loss | Exact Match |\n"
        "| --- | --- | --- | --- | --- | --- | --- |\n"
    )
    rows = [
        f"| {r.name} | {r.micro_precision:.4f} | {r.micro_recall:.4f} | {r.micro_f1:.4f} | "
        f"{r.macro_f1:.4f} | {r.hamming_loss:.4f} | {r.exact_match_ratio:.4f} |"
        for r in results
    ]
    return header + "\n".join(rows)


def csv_rows(results: list[ModelResult]) -> str:
    lines = [
        "Method,Micro Precision,Micro Recall,Micro F1,Macro Precision,Macro Recall,Macro F1,Hamming Loss,Exact Match,Training Time (s),Inference Time (ms/row)"
    ]
    for r in results:
        lines.append(
            f"{r.name},{r.micro_precision:.4f},{r.micro_recall:.4f},{r.micro_f1:.4f},"
            f"{r.macro_precision:.4f},{r.macro_recall:.4f},{r.macro_f1:.4f},"
            f"{r.hamming_loss:.4f},{r.exact_match_ratio:.4f},{r.training_time_s:.4f},{r.inference_time_ms:.4f}"
        )
    return "\n".join(lines) + "\n"


def select_best_method(results: list[ModelResult]) -> ModelResult:
    return max(results, key=lambda r: (r.micro_f1 + r.macro_f1 - r.hamming_loss))


def per_label_f1(y_true: np.ndarray, y_pred: np.ndarray, labels: list[str]) -> dict[str, float]:
    scores = f1_score(y_true, y_pred, average=None, zero_division=0)
    return {label: float(score) for label, score in zip(labels, scores)}


def per_label_support(label_lists: list[list[str]], labels: list[str]) -> dict[str, int]:
    counts = {label: 0 for label in labels}
    for items in label_lists:
        for label in items:
            if label in counts:
                counts[label] += 1
    return counts
