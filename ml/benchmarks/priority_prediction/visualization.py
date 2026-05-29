from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from evaluation import ModelResult, result_table
from preprocessing import PRIORITY_CLASSES


def _save(fig: plt.Figure, path: Path) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.tight_layout()
    fig.savefig(path, dpi=160, bbox_inches="tight")
    plt.close(fig)
    return str(path)


def plot_priority_distribution(df: pd.DataFrame, plots_dir: Path) -> str:
    counts = df["priority"].value_counts().reindex(PRIORITY_CLASSES, fill_value=0)
    fig, ax = plt.subplots(figsize=(8, 4.5))
    counts.plot(kind="bar", ax=ax, color="#6385a9")
    ax.set_title("Priority Class Distribution")
    ax.set_ylabel("Tickets")
    ax.set_xlabel("Priority")
    ax.tick_params(axis="x", rotation=0)
    return _save(fig, plots_dir / "03_priority_distribution.png")


def plot_model_comparison(results: list[ModelResult], plots_dir: Path) -> str:
    df = pd.DataFrame(
        {
            "Model": [r.name for r in results],
            "Accuracy": [r.accuracy for r in results],
            "Macro F1": [r.macro_f1 for r in results],
            "Weighted F1": [r.weighted_f1 for r in results],
        },
    ).set_index("Model")
    fig, ax = plt.subplots(figsize=(9, 4.8))
    df.plot(kind="bar", ax=ax, color=["#6385a9", "#7ea0c2", "#46698d"])
    ax.set_title("Priority Prediction Model Comparison")
    ax.set_ylim(0, 1)
    ax.set_ylabel("Score")
    ax.tick_params(axis="x", rotation=0)
    ax.legend(loc="lower right")
    return _save(fig, plots_dir / "03_priority_model_comparison.png")


def plot_macro_f1(results: list[ModelResult], plots_dir: Path) -> str:
    fig, ax = plt.subplots(figsize=(7, 4.2))
    ax.bar([r.name for r in results], [r.macro_f1 for r in results], color="#6385a9")
    ax.set_title("Macro F1 Comparison")
    ax.set_ylim(0, 1)
    ax.set_ylabel("Macro F1")
    return _save(fig, plots_dir / "03_priority_macro_f1.png")


def plot_per_class_metrics(results: list[ModelResult], plots_dir: Path) -> str:
    rows = []
    for result in results:
        for priority in PRIORITY_CLASSES:
            rows.append(
                {
                    "Model": result.name,
                    "Priority": priority,
                    "Precision": result.per_class_precision.get(priority, 0.0),
                    "Recall": result.per_class_recall.get(priority, 0.0),
                },
            )
    df = pd.DataFrame(rows)
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    for idx, metric in enumerate(["Precision", "Recall"]):
        pivot = df.pivot(index="Priority", columns="Model", values=metric).reindex(PRIORITY_CLASSES)
        pivot.plot(kind="bar", ax=axes[idx], rot=0)
        axes[idx].set_title(f"Per-class {metric}")
        axes[idx].set_ylim(0, 1)
    return _save(fig, plots_dir / "03_priority_per_class_metrics.png")


def plot_confusion_matrix(result: ModelResult, plots_dir: Path) -> str:
    matrix = np.asarray(result.confusion_matrix)
    fig, ax = plt.subplots(figsize=(6.5, 5.5))
    im = ax.imshow(matrix, cmap="Blues")
    ax.set_title(f"Confusion Matrix - {result.name}")
    ax.set_xticks(range(len(PRIORITY_CLASSES)), PRIORITY_CLASSES, rotation=0)
    ax.set_yticks(range(len(PRIORITY_CLASSES)), PRIORITY_CLASSES)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    for i in range(matrix.shape[0]):
        for j in range(matrix.shape[1]):
            ax.text(j, i, str(matrix[i, j]), ha="center", va="center", color="#111827", fontsize=8)
    fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    return _save(fig, plots_dir / f"03_confusion_matrix_{slug(result.name)}.png")


def plot_error_analysis(result: ModelResult, y_test: pd.Series, plots_dir: Path) -> str:
    errors = pd.DataFrame({"actual": y_test.to_numpy(), "pred": result.y_pred})
    errors["wrong"] = errors["actual"] != errors["pred"]
    rates = errors.groupby("actual")["wrong"].mean().reindex(PRIORITY_CLASSES, fill_value=0) * 100
    fig, ax = plt.subplots(figsize=(7, 4.5))
    rates.plot(kind="bar", ax=ax, color="#c94c4c")
    ax.set_title(f"Error Rate by Priority Class - {result.name}")
    ax.set_ylabel("Misclassification rate (%)")
    ax.tick_params(axis="x", rotation=0)
    return _save(fig, plots_dir / f"03_priority_error_analysis_{slug(result.name)}.png")


def plot_feature_importance(model_name: str, feature_names: np.ndarray, importances: np.ndarray, plots_dir: Path, top_n: int = 20) -> str:
    order = np.argsort(importances)[::-1][:top_n]
    names = feature_names[order]
    values = importances[order]
    fig, ax = plt.subplots(figsize=(8, 6))
    ax.barh(range(len(names)), values[::-1], color="#6385a9")
    ax.set_yticks(range(len(names)), names[::-1], fontsize=8)
    ax.set_title(f"Top Feature Importance - {model_name}")
    ax.set_xlabel("Importance")
    return _save(fig, plots_dir / f"03_priority_feature_importance_{slug(model_name)}.png")


def plot_correlation_heatmap(df: pd.DataFrame, plots_dir: Path) -> str:
    frame = df.copy()
    frame["priority_code"] = frame["priority"].map({"P1": 4, "P2": 3, "P3": 2, "P4": 1})
    numeric_cols = [
        "priority_code",
        "escalation_required",
        "transfer_required",
        "sla_breached",
        "queue_load",
        "ticket_age_minutes",
        "operational_complexity",
    ]
    available = [col for col in numeric_cols if col in frame.columns]
    corr = frame[available].corr()
    fig, ax = plt.subplots(figsize=(8.5, 6.5))
    im = ax.imshow(corr, cmap="RdBu_r", vmin=-1, vmax=1)
    labels = [c.replace("_code", "") for c in available]
    ax.set_xticks(range(len(available)), labels, rotation=45, ha="right", fontsize=8)
    ax.set_yticks(range(len(available)), labels, fontsize=8)
    ax.set_title("Priority Feature Correlation Heatmap")
    for i in range(len(available)):
        for j in range(len(available)):
            ax.text(j, i, f"{corr.iloc[i, j]:.2f}", ha="center", va="center", fontsize=7)
    fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    return _save(fig, plots_dir / "03_priority_correlation_heatmap.png")


def plot_results_table(results: list[ModelResult], plots_dir: Path) -> str:
    df = pd.DataFrame(result_table(results))
    figure_table = df[["Model", "Accuracy", "Macro Precision", "Macro Recall", "Macro F1", "Weighted F1"]].copy()
    fig, ax = plt.subplots(figsize=(10.5, 2.7))
    ax.axis("off")
    fig.patch.set_facecolor("white")
    ax.set_title(
        "CarePilot Priority Prediction Benchmark",
        fontsize=16,
        fontweight="bold",
        color="#173b6c",
        pad=18,
    )
    table = ax.table(
        cellText=figure_table.values,
        colLabels=figure_table.columns,
        cellLoc="center",
        colLoc="center",
        loc="center",
        colWidths=[0.22, 0.11, 0.14, 0.12, 0.11, 0.12],
    )
    table.auto_set_font_size(False)
    table.set_fontsize(10.5)
    table.scale(1, 1.65)
    for (row, col), cell in table.get_celld().items():
        cell.set_edgecolor("#d5dce8")
        cell.set_linewidth(0.8)
        if row == 0:
            cell.set_facecolor("#173b6c")
            cell.set_text_props(color="white", weight="bold")
        else:
            cell.set_facecolor("#f6f8fb" if row % 2 else "#ffffff")
            cell.set_text_props(color="#111827", weight="bold" if col == 0 else "normal")
    fig.text(
        0.5,
        0.04,
        "Held-out test split · Target: priority (P1–P4) · Dataset: 14,000 operational tickets",
        ha="center",
        fontsize=9,
        color="#5f6b7a",
    )
    fig.tight_layout(rect=[0, 0.06, 1, 0.96])
    path = plots_dir / "03_priority_benchmark_results_table.png"
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=180, bbox_inches="tight")
    plt.close(fig)
    return str(path)


def slug(value: str) -> str:
    return value.lower().replace(" ", "_").replace("-", "_")
