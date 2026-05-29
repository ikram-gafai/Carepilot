from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from evaluation import ModelResult, result_table
from preprocessing import ACTION_CLASSES


def _save(fig: plt.Figure, path: Path) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.tight_layout()
    fig.savefig(path, dpi=160, bbox_inches="tight")
    plt.close(fig)
    return str(path)


def plot_action_distribution(df: pd.DataFrame, plots_dir: Path) -> str:
    counts = df["recommended_action"].value_counts().reindex(ACTION_CLASSES, fill_value=0)
    fig, ax = plt.subplots(figsize=(9, 4.5))
    counts.plot(kind="bar", ax=ax, color="#6385a9")
    ax.set_title("Recommended Action Class Distribution")
    ax.set_ylabel("Tickets")
    ax.set_xlabel("Action")
    ax.tick_params(axis="x", rotation=35, labelsize=8)
    return _save(fig, plots_dir / "03_action_distribution.png")


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
    ax.set_title("Action Recommendation Model Comparison")
    ax.set_ylim(0, 1)
    ax.set_ylabel("Score")
    ax.tick_params(axis="x", rotation=0)
    ax.legend(loc="lower right")
    return _save(fig, plots_dir / "03_action_model_comparison.png")


def plot_macro_f1(results: list[ModelResult], plots_dir: Path) -> str:
    fig, ax = plt.subplots(figsize=(7, 4.2))
    ax.bar([r.name for r in results], [r.macro_f1 for r in results], color="#6385a9")
    ax.set_title("Macro F1 Comparison")
    ax.set_ylim(0, 1)
    ax.set_ylabel("Macro F1")
    return _save(fig, plots_dir / "03_action_macro_f1.png")


def plot_per_class_metrics(results: list[ModelResult], plots_dir: Path) -> str:
    rows = []
    for result in results:
        for action in ACTION_CLASSES:
            rows.append(
                {
                    "Model": result.name,
                    "Action": action,
                    "Precision": result.per_class_precision.get(action, 0.0),
                    "Recall": result.per_class_recall.get(action, 0.0),
                },
            )
    df = pd.DataFrame(rows)
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    for idx, metric in enumerate(["Precision", "Recall"]):
        pivot = df.pivot(index="Action", columns="Model", values=metric).reindex(ACTION_CLASSES)
        pivot.plot(kind="bar", ax=axes[idx], rot=35)
        axes[idx].set_title(f"Per-class {metric}")
        axes[idx].set_ylim(0, 1)
    return _save(fig, plots_dir / "03_action_per_class_metrics.png")


def plot_confusion_matrix(result: ModelResult, plots_dir: Path) -> str:
    matrix = np.asarray(result.confusion_matrix)
    fig, ax = plt.subplots(figsize=(7.5, 6))
    im = ax.imshow(matrix, cmap="Blues")
    ax.set_title(f"Confusion Matrix - {result.name}")
    ax.set_xticks(range(len(ACTION_CLASSES)), ACTION_CLASSES, rotation=35, ha="right", fontsize=8)
    ax.set_yticks(range(len(ACTION_CLASSES)), ACTION_CLASSES, fontsize=8)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    for i in range(matrix.shape[0]):
        for j in range(matrix.shape[1]):
            ax.text(j, i, str(matrix[i, j]), ha="center", va="center", color="#111827", fontsize=7)
    fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    return _save(fig, plots_dir / f"03_confusion_matrix_{slug(result.name)}.png")


def plot_error_analysis(result: ModelResult, y_test: pd.Series, plots_dir: Path) -> str:
    errors = pd.DataFrame({"actual": y_test.to_numpy(), "pred": result.y_pred})
    errors["wrong"] = errors["actual"] != errors["pred"]
    rates = errors.groupby("actual")["wrong"].mean().reindex(ACTION_CLASSES, fill_value=0) * 100
    fig, ax = plt.subplots(figsize=(8, 4.5))
    rates.plot(kind="bar", ax=ax, color="#c94c4c")
    ax.set_title(f"Error Rate by Class - {result.name}")
    ax.set_ylabel("Misclassification rate (%)")
    ax.tick_params(axis="x", rotation=35, labelsize=8)
    return _save(fig, plots_dir / f"03_error_analysis_{slug(result.name)}.png")


def plot_feature_importance(model_name: str, feature_names: np.ndarray, importances: np.ndarray, plots_dir: Path, top_n: int = 20) -> str:
    order = np.argsort(importances)[::-1][:top_n]
    names = feature_names[order]
    values = importances[order]
    fig, ax = plt.subplots(figsize=(8, 6))
    ax.barh(range(len(names)), values[::-1], color="#6385a9")
    ax.set_yticks(range(len(names)), names[::-1], fontsize=8)
    ax.set_title(f"Top Feature Importance - {model_name}")
    ax.set_xlabel("Importance")
    return _save(fig, plots_dir / f"03_feature_importance_{slug(model_name)}.png")


def plot_results_table(results: list[ModelResult], plots_dir: Path) -> str:
    df = pd.DataFrame(result_table(results))
    figure_table = df[["Model", "Accuracy", "Macro Precision", "Macro Recall", "Macro F1", "Weighted F1"]].copy()
    fig, ax = plt.subplots(figsize=(10.5, 2.7))
    ax.axis("off")
    fig.patch.set_facecolor("white")
    ax.set_title(
        "CarePilot Action Recommendation Benchmark",
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
        "Held-out test split · Target: recommended_action · Dataset: 14,000 operational tickets",
        ha="center",
        fontsize=9,
        color="#5f6b7a",
    )
    fig.tight_layout(rect=[0, 0.06, 1, 0.96])
    path = plots_dir / "03_action_recommendation_benchmark_results_table.png"
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=180, bbox_inches="tight")
    plt.close(fig)
    return str(path)


def slug(value: str) -> str:
    return value.lower().replace(" ", "_").replace("-", "_")
