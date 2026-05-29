"""Report-ready plots for Task 8 missing information detection."""

from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from evaluation import ModelResult


def _save(fig, path: Path) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=160, bbox_inches="tight")
    plt.close(fig)
    return str(path)


def plot_missing_count_distribution(df: pd.DataFrame, plots_dir: Path) -> str:
    fig, ax = plt.subplots(figsize=(8, 4))
    ax.hist(df["missing_count"], bins=range(0, 14), color="#475569", edgecolor="white", align="left")
    ax.set_title("Missing Information Count Distribution")
    ax.set_xlabel("Missing label count per ticket")
    ax.set_ylabel("Tickets")
    return _save(fig, plots_dir / "03_missing_information_count_distribution.png")


def plot_completeness_distribution(df: pd.DataFrame, plots_dir: Path) -> str:
    fig, ax = plt.subplots(figsize=(8, 4))
    ax.hist(df["completeness_score"], bins=20, color="#64748b", edgecolor="white")
    ax.set_title("Completeness Score Distribution")
    ax.set_xlabel("Completeness score")
    ax.set_ylabel("Tickets")
    return _save(fig, plots_dir / "03_missing_information_completeness_distribution.png")


def plot_quality_level_distribution(df: pd.DataFrame, plots_dir: Path) -> str:
    counts = df["quality_level"].value_counts().reindex(["COMPLETE", "ADEQUATE", "INCOMPLETE", "POOR"]).fillna(0)
    fig, ax = plt.subplots(figsize=(7, 4))
    counts.plot(kind="bar", color="#475569", ax=ax)
    ax.set_title("Operational Quality Level Distribution")
    ax.set_ylabel("Tickets")
    plt.xticks(rotation=20)
    return _save(fig, plots_dir / "03_missing_information_quality_levels.png")


def plot_label_frequency(counts: dict[str, int], plots_dir: Path) -> str:
    series = pd.Series(counts).sort_values(ascending=True)
    fig, ax = plt.subplots(figsize=(9, 5))
    series.plot(kind="barh", color="#334155", ax=ax)
    ax.set_title("Missing Information Label Frequency")
    ax.set_xlabel("Ticket count")
    return _save(fig, plots_dir / "03_missing_information_label_frequency.png")


def plot_model_comparison(results: list[ModelResult], plots_dir: Path) -> str:
    frame = pd.DataFrame([r.__dict__ for r in results])
    fig, ax = plt.subplots(figsize=(8, 4))
    frame.set_index("name")[["micro_f1", "macro_f1"]].plot(kind="bar", ax=ax, color=["#173b6c", "#64748b"])
    ax.set_ylim(0, 1)
    ax.set_title("Micro vs Macro F1")
    plt.xticks(rotation=10)
    return _save(fig, plots_dir / "03_missing_information_model_comparison.png")


def plot_hamming_loss(results: list[ModelResult], plots_dir: Path) -> str:
    fig, ax = plt.subplots(figsize=(7, 4))
    names = [r.name for r in results]
    vals = [r.hamming_loss for r in results]
    ax.bar(names, vals, color="#94a3b8")
    ax.set_title("Hamming Loss (lower is better)")
    plt.xticks(rotation=10)
    return _save(fig, plots_dir / "03_missing_information_hamming_loss.png")


def plot_per_label_f1(
    per_label: dict[str, float],
    plots_dir: Path,
    support: dict[str, int] | None = None,
    method_name: str = "Best Method",
) -> str:
    labels = list(per_label.keys())
    f1_vals = [per_label[l] for l in labels]
    supports = [support.get(l, 0) if support else 0 for l in labels]
    order = sorted(range(len(labels)), key=lambda i: f1_vals[i])
    ordered_labels = [labels[i] for i in order]
    ordered_f1 = [f1_vals[i] for i in order]
    ordered_support = [supports[i] for i in order]
    y_labels = [
        f"{label.replace('MISSING_', '').replace('_', ' ').title()} (n={n:,})"
        for label, n in zip(ordered_labels, ordered_support)
    ]
    colors = ["#1e3a5f" if n >= 800 else "#b45309" for n in ordered_support]
    fig, ax = plt.subplots(figsize=(10, 5.5))
    ax.barh(y_labels, ordered_f1, color=colors)
    ax.set_xlim(0, 1)
    ax.set_title(f"Per-label F1 — {method_name}")
    ax.set_xlabel("F1 score")
    ax.axvline(0.5, color="#94a3b8", linestyle="--", linewidth=0.8, label="F1 = 0.5")
    ax.legend(loc="lower right", fontsize=8)
    fig.text(0.01, 0.01, "Dark blue = frequent labels (n≥800) · Orange = rare labels", fontsize=8, color="#64748b")
    fig.tight_layout(rect=[0, 0.03, 1, 1])
    return _save(fig, plots_dir / "03_missing_information_per_label_f1.png")


def plot_rare_label_analysis(
    per_label: dict[str, float],
    support: dict[str, int],
    plots_dir: Path,
    rare_threshold: int = 800,
) -> str:
    labels = [l for l in per_label if support.get(l, 0) < rare_threshold]
    x = [support[l] for l in labels]
    y = [per_label[l] for l in labels]
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.scatter(x, y, s=90, color="#b45309", edgecolors="#7c2d12", linewidths=0.8, alpha=0.85)
    for label, sx, sy in zip(labels, x, y):
        short = label.replace("MISSING_", "").replace("_", " ")[:18]
        ax.annotate(short, (sx, sy), textcoords="offset points", xytext=(4, 4), fontsize=7, color="#334155")
    ax.set_xlabel("Corpus support (positive labels)")
    ax.set_ylabel("F1 score (test split)")
    ax.set_title("Rare Label Analysis — F1 vs Support")
    ax.set_ylim(0, 1)
    ax.axhline(0.5, color="#94a3b8", linestyle="--", linewidth=0.8)
    ax.text(0.98, 0.05, f"Rare threshold: n < {rare_threshold}", transform=ax.transAxes, ha="right", fontsize=8, color="#64748b")
    return _save(fig, plots_dir / "03_missing_information_rare_label_analysis.png")


def plot_error_analysis(per_label: dict[str, float], plots_dir: Path) -> str:
    series = pd.Series(per_label).sort_values()
    fig, ax = plt.subplots(figsize=(9, 4))
    ax.barh(series.index, 1 - series.values, color="#b45309")
    ax.set_title("Error Analysis by Label (1 - F1)")
    ax.set_xlabel("Error rate")
    return _save(fig, plots_dir / "03_missing_information_error_analysis.png")


def plot_results_table(results: list[ModelResult], plots_dir: Path) -> str:
    figure_table = pd.DataFrame(
        [
            {
                "Method": r.name,
                "Micro Precision": f"{r.micro_precision:.3f}",
                "Micro Recall": f"{r.micro_recall:.3f}",
                "Micro F1": f"{r.micro_f1:.3f}",
                "Macro F1": f"{r.macro_f1:.3f}",
                "Hamming Loss": f"{r.hamming_loss:.3f}",
                "Exact Match": f"{r.exact_match_ratio:.3f}",
            }
            for r in results
        ]
    )
    fig, ax = plt.subplots(figsize=(12.5, 2.8))
    ax.axis("off")
    fig.patch.set_facecolor("white")
    ax.set_title(
        "CarePilot Missing Information Detection Benchmark",
        fontsize=16,
        fontweight="bold",
        color="#173b6c",
        pad=18,
    )
    table = ax.table(
        cellText=figure_table.values,
        colLabels=list(figure_table.columns),
        cellLoc="center",
        colLoc="center",
        loc="center",
        colWidths=[0.22, 0.13, 0.12, 0.11, 0.11, 0.13, 0.12],
    )
    table.auto_set_font_size(False)
    table.set_fontsize(10)
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
        "Held-out test split · Multilabel missing information · Dataset: ml_training.historical_tickets",
        ha="center",
        fontsize=9,
        color="#5f6b7a",
    )
    fig.tight_layout(rect=[0, 0.06, 1, 0.96])
    path = plots_dir / "03_missing_information_benchmark_results_table.png"
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=180, bbox_inches="tight")
    plt.close(fig)
    return str(path)
