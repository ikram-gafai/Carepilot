from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from evaluation import ModelResult, result_table


def _save(fig: plt.Figure, path: Path) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.tight_layout()
    fig.savefig(path, dpi=160, bbox_inches="tight")
    plt.close(fig)
    return str(path)


def plot_class_distribution(df: pd.DataFrame, plots_dir: Path) -> str:
    counts = df["sla_breached"].map({0: "No breach", 1: "SLA breach"}).value_counts()
    fig, ax = plt.subplots(figsize=(7, 4))
    counts.plot(kind="bar", ax=ax, color=["#6385a9", "#c94c4c"])
    ax.set_title("Class Distribution - SLA Breach")
    ax.set_ylabel("Tickets")
    ax.set_xlabel("")
    ax.tick_params(axis="x", rotation=0)
    return _save(fig, plots_dir / "03_sla_distribution.png")


def plot_priority_vs_sla(df: pd.DataFrame, plots_dir: Path) -> str:
    table = pd.crosstab(df["priority"], df["sla_breached"], normalize="index") * 100
    table = table.rename(columns={0: "No breach", 1: "SLA breach"})
    fig, ax = plt.subplots(figsize=(8, 4.5))
    table[["No breach", "SLA breach"]].plot(kind="bar", stacked=True, ax=ax, color=["#9fb5cd", "#6385a9"])
    ax.set_title("Priority vs SLA Breach Breach Rate")
    ax.set_ylabel("Percentage")
    ax.set_xlabel("Priority")
    ax.legend(loc="upper right")
    ax.tick_params(axis="x", rotation=0)
    return _save(fig, plots_dir / "03_priority_vs_sla.png")


def plot_perimeter_vs_sla(df: pd.DataFrame, plots_dir: Path) -> str:
    rates = df.groupby("perimeter")["sla_breached"].mean().sort_values(ascending=False) * 100
    fig, ax = plt.subplots(figsize=(9, 4.8))
    rates.plot(kind="bar", ax=ax, color="#6385a9")
    ax.set_title("Perimeter vs SLA Breach Breach Rate")
    ax.set_ylabel("SLA Breach Rate (%)")
    ax.set_xlabel("Perimeter")
    ax.tick_params(axis="x", rotation=35, labelsize=8)
    return _save(fig, plots_dir / "03_perimeter_vs_sla.png")


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
    return _save(fig, plots_dir / "03_sla_roc_curves.png")


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
    return _save(fig, plots_dir / "03_sla_model_comparison.png")


def plot_precision_recall(results: list[ModelResult], plots_dir: Path) -> str:
    df = pd.DataFrame(
        {"Model": [r.name for r in results], "Precision": [r.precision for r in results], "Recall": [r.recall for r in results]},
    ).set_index("Model")
    fig, ax = plt.subplots(figsize=(7, 4.5))
    df.plot(kind="bar", ax=ax, color=["#6385a9", "#c94c4c"])
    ax.set_title("Precision / Recall Comparison")
    ax.set_ylim(0, 1)
    ax.tick_params(axis="x", rotation=0)
    return _save(fig, plots_dir / "03_sla_precision_recall.png")


def plot_f1(results: list[ModelResult], plots_dir: Path) -> str:
    fig, ax = plt.subplots(figsize=(7, 4.2))
    ax.bar([r.name for r in results], [r.f1 for r in results], color="#6385a9")
    ax.set_title("F1-score Comparison")
    ax.set_ylim(0, 1)
    ax.set_ylabel("F1-score")
    return _save(fig, plots_dir / "03_sla_f1_score.png")


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
    return _save(fig, plots_dir / f"03_feature_importance_{slug(model_name)}.png")


def plot_results_table(results: list[ModelResult], plots_dir: Path) -> str:
    df = pd.DataFrame(result_table(results))
    figure_table = df[["Model", "Accuracy", "Precision", "Recall", "F1", "ROC-AUC"]].copy()
    for col in ["Accuracy", "Precision", "Recall", "F1", "ROC-AUC"]:
        figure_table[col] = figure_table[col].map(lambda x: f"{x:.3f}")

    fig, ax = plt.subplots(figsize=(10.5, 2.7))
    ax.axis("off")
    fig.patch.set_facecolor("white")
    ax.set_title(
        "CarePilot SLA Breach Prediction Benchmark",
        fontsize=16,
        fontweight="bold",
        color="#173b6c",
        pad=18,
    )
    table = ax.table(
        cellText=figure_table.values,
        colLabels=["Model", "Accuracy", "Precision", "Recall", "F1", "ROC-AUC"],
        cellLoc="center",
        colLoc="center",
        loc="center",
        colWidths=[0.28, 0.12, 0.13, 0.12, 0.10, 0.13],
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
        "Held-out test split · Target: sla_breached · Dataset: 14,000 operational tickets",
        ha="center",
        fontsize=9,
        color="#5f6b7a",
    )
    fig.tight_layout(rect=[0, 0.06, 1, 0.96])
    path = plots_dir / "03_sla_benchmark_results_table.png"
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=180, bbox_inches="tight")
    plt.close(fig)
    return str(path)


def slug(value: str) -> str:
    return value.lower().replace(" ", "_").replace("-", "_")


def plot_correlation_heatmap(df: pd.DataFrame, plots_dir: Path) -> str:
    numeric_cols = [
        "escalation_required",
        "transfer_required",
        "ticket_age_minutes",
        "resolution_time_minutes",
        "queue_load",
        "operational_complexity",
        "sla_breached",
    ]
    available = [col for col in numeric_cols if col in df.columns]
    corr = df[available].corr()
    fig, ax = plt.subplots(figsize=(8.5, 6.5))
    im = ax.imshow(corr, cmap="RdBu_r", vmin=-1, vmax=1)
    ax.set_xticks(range(len(available)), available, rotation=45, ha="right", fontsize=8)
    ax.set_yticks(range(len(available)), available, fontsize=8)
    ax.set_title("SLA Breach Feature Correlation Heatmap")
    for i in range(len(available)):
        for j in range(len(available)):
            ax.text(j, i, f"{corr.iloc[i, j]:.2f}", ha="center", va="center", fontsize=7)
    fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    return _save(fig, plots_dir / "03_sla_correlation_heatmap.png")


def plot_error_analysis(result: ModelResult, y_test: pd.Series, plots_dir: Path) -> str:
    errors = pd.DataFrame({"actual": y_test.to_numpy(), "pred": result.y_pred})
    errors["type"] = np.select(
        [
            (errors["actual"] == 1) & (errors["pred"] == 0),
            (errors["actual"] == 0) & (errors["pred"] == 1),
        ],
        ["Missed breach", "False alarm"],
        default="Correct",
    )
    counts = errors["type"].value_counts()
    fig, ax = plt.subplots(figsize=(6.5, 4.2))
    counts.plot(kind="bar", ax=ax, color=["#6385a9", "#c94c4c", "#9fb5cd"])
    ax.set_title(f"Error Analysis - {result.name}")
    ax.set_ylabel("Tickets")
    ax.tick_params(axis="x", rotation=15)
    return _save(fig, plots_dir / f"03_sla_error_analysis_{slug(result.name)}.png")
