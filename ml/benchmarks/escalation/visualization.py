from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from evaluation import ModelResult


def _save(fig: plt.Figure, path: Path) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.tight_layout()
    fig.savefig(path, dpi=160, bbox_inches="tight")
    plt.close(fig)
    return str(path)


def plot_class_distribution(df: pd.DataFrame, plots_dir: Path) -> str:
    counts = df["escalation_required"].map({0: "No escalation", 1: "Escalation"}).value_counts()
    fig, ax = plt.subplots(figsize=(7, 4))
    counts.plot(kind="bar", ax=ax, color=["#6385a9", "#c94c4c"])
    ax.set_title("Class Distribution - Escalation Required")
    ax.set_ylabel("Tickets")
    ax.set_xlabel("")
    ax.tick_params(axis="x", rotation=0)
    return _save(fig, plots_dir / "class_distribution.png")


def plot_priority_vs_escalation(df: pd.DataFrame, plots_dir: Path) -> str:
    table = pd.crosstab(df["priority"], df["escalation_required"], normalize="index") * 100
    table = table.rename(columns={0: "No escalation", 1: "Escalation"})
    fig, ax = plt.subplots(figsize=(8, 4.5))
    table[["No escalation", "Escalation"]].plot(kind="bar", stacked=True, ax=ax, color=["#9fb5cd", "#6385a9"])
    ax.set_title("Priority vs Escalation Rate")
    ax.set_ylabel("Percentage")
    ax.set_xlabel("Priority")
    ax.legend(loc="upper right")
    ax.tick_params(axis="x", rotation=0)
    return _save(fig, plots_dir / "priority_vs_escalation.png")


def plot_perimeter_vs_escalation(df: pd.DataFrame, plots_dir: Path) -> str:
    rates = df.groupby("perimeter")["escalation_required"].mean().sort_values(ascending=False) * 100
    fig, ax = plt.subplots(figsize=(9, 4.8))
    rates.plot(kind="bar", ax=ax, color="#6385a9")
    ax.set_title("Perimeter vs Escalation Rate")
    ax.set_ylabel("Escalation rate (%)")
    ax.set_xlabel("Perimeter")
    ax.tick_params(axis="x", rotation=35, labelsize=8)
    return _save(fig, plots_dir / "perimeter_vs_escalation.png")


def plot_confusion_matrix(result: ModelResult, plots_dir: Path) -> str:
    matrix = np.asarray(result.confusion_matrix)
    fig, ax = plt.subplots(figsize=(4.8, 4.2))
    im = ax.imshow(matrix, cmap="Blues")
    ax.set_title(f"Confusion Matrix - {result.name}")
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    ax.set_xticks([0, 1], ["No", "Yes"])
    ax.set_yticks([0, 1], ["No", "Yes"])
    for i in range(matrix.shape[0]):
        for j in range(matrix.shape[1]):
            ax.text(j, i, str(matrix[i, j]), ha="center", va="center", color="#111827")
    fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    return _save(fig, plots_dir / f"confusion_matrix_{slug(result.name)}.png")


def plot_normalized_confusion_matrix(result: ModelResult, plots_dir: Path) -> str:
    matrix = np.asarray(result.normalized_confusion_matrix) * 100
    fig, ax = plt.subplots(figsize=(4.8, 4.2))
    im = ax.imshow(matrix, cmap="Blues", vmin=0, vmax=100)
    ax.set_title(f"Normalized Confusion Matrix - {result.name}")
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    ax.set_xticks([0, 1], ["No", "Yes"])
    ax.set_yticks([0, 1], ["No", "Yes"])
    for i in range(matrix.shape[0]):
        for j in range(matrix.shape[1]):
            ax.text(j, i, f"{matrix[i, j]:.1f}%", ha="center", va="center", color="#111827")
    fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    return _save(fig, plots_dir / f"normalized_confusion_matrix_{slug(result.name)}.png")


def plot_roc_curves(results: list[ModelResult], plots_dir: Path) -> str:
    fig, ax = plt.subplots(figsize=(7, 5))
    for result in results:
        ax.plot(result.fpr, result.tpr, label=f"{result.name} (AUC={result.roc_auc:.3f})")
    ax.plot([0, 1], [0, 1], linestyle="--", color="#9ca3af", label="Random")
    ax.set_title("ROC Curve Comparison")
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.legend(loc="lower right")
    ax.grid(alpha=0.25)
    return _save(fig, plots_dir / "roc_curve_comparison.png")


def plot_model_comparison(results: list[ModelResult], plots_dir: Path) -> str:
    df = pd.DataFrame(
        {
            "Model": [r.name for r in results],
            "Accuracy": [r.accuracy for r in results],
            "Precision": [r.precision for r in results],
            "Recall": [r.recall for r in results],
            "F1": [r.f1 for r in results],
            "ROC-AUC": [r.roc_auc for r in results],
        },
    ).set_index("Model")
    fig, ax = plt.subplots(figsize=(9, 4.8))
    df.plot(kind="bar", ax=ax, color=["#6385a9", "#7ea0c2", "#9fb5cd", "#46698d", "#284b70"])
    ax.set_title("Model Comparison")
    ax.set_ylim(0, 1)
    ax.set_ylabel("Score")
    ax.tick_params(axis="x", rotation=0)
    ax.legend(loc="lower right", ncol=3, fontsize=8)
    return _save(fig, plots_dir / "model_comparison.png")


def plot_precision_recall(results: list[ModelResult], plots_dir: Path) -> str:
    df = pd.DataFrame(
        {"Model": [r.name for r in results], "Precision": [r.precision for r in results], "Recall": [r.recall for r in results]},
    ).set_index("Model")
    fig, ax = plt.subplots(figsize=(7, 4.5))
    df.plot(kind="bar", ax=ax, color=["#6385a9", "#c94c4c"])
    ax.set_title("Precision / Recall Comparison")
    ax.set_ylim(0, 1)
    ax.tick_params(axis="x", rotation=0)
    return _save(fig, plots_dir / "precision_recall_comparison.png")


def plot_f1(results: list[ModelResult], plots_dir: Path) -> str:
    fig, ax = plt.subplots(figsize=(7, 4.2))
    ax.bar([r.name for r in results], [r.f1 for r in results], color="#6385a9")
    ax.set_title("F1-score Comparison")
    ax.set_ylim(0, 1)
    ax.set_ylabel("F1-score")
    return _save(fig, plots_dir / "f1_score_comparison.png")


def plot_feature_importance(
    model_name: str,
    feature_names: np.ndarray,
    importances: np.ndarray,
    plots_dir: Path,
    top_n: int = 20,
) -> str:
    order = np.argsort(importances)[::-1][:top_n]
    names = feature_names[order]
    values = importances[order]
    fig, ax = plt.subplots(figsize=(8, 6))
    ax.barh(range(len(names)), values[::-1], color="#6385a9")
    ax.set_yticks(range(len(names)), names[::-1], fontsize=8)
    ax.set_title(f"Top Feature Importance - {model_name}")
    ax.set_xlabel("Importance")
    return _save(fig, plots_dir / f"feature_importance_{slug(model_name)}.png")


def slug(value: str) -> str:
    return value.lower().replace(" ", "_").replace("-", "_")
