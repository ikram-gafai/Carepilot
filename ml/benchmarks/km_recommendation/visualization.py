from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

from evaluation import RetrievalResult

PALETTE = ["#173b6c", "#6385A9", "#8aa3c2"]
TOP_K = 3


def plot_km_distribution(km: pd.DataFrame, plots_dir: Path) -> None:
    fig, axes = plt.subplots(1, 2, figsize=(12, 4.5))
    sns.countplot(data=km, x="perimeter", order=km["perimeter"].value_counts().index, ax=axes[0], palette="Blues_d")
    axes[0].set_title("KM Articles by Perimeter")
    axes[0].tick_params(axis="x", rotation=35)
    sns.countplot(
        data=km,
        x="incident_category",
        order=km["incident_category"].value_counts().head(10).index,
        ax=axes[1],
        palette="Blues_d",
    )
    axes[1].set_title("KM Articles by Category (Top 10)")
    axes[1].tick_params(axis="x", rotation=35)
    fig.tight_layout()
    fig.savefig(plots_dir / "03_km_distribution.png", dpi=160, bbox_inches="tight")
    plt.close(fig)


def plot_method_comparison(results: list[RetrievalResult], plots_dir: Path) -> None:
    rows = [
        {
            "Method": result.method,
            "P@1": result.precision_at_1,
            "P@3": result.precision_at_3,
            "R@3": result.recall_at_3,
            "MRR": result.mrr,
            "nDCG@3": result.ndcg_at_3,
        }
        for result in results
    ]
    df = pd.DataFrame(rows)
    melted = df.melt(id_vars="Method", var_name="Metric", value_name="Score")
    fig, ax = plt.subplots(figsize=(10, 5))
    sns.barplot(data=melted, x="Metric", y="Score", hue="Method", palette=PALETTE, ax=ax)
    ax.set_ylim(0, 1)
    ax.set_title("KM Retrieval Method Comparison")
    fig.tight_layout()
    fig.savefig(plots_dir / "03_km_method_comparison.png", dpi=160, bbox_inches="tight")
    plt.close(fig)


def plot_precision_at_k(results: list[RetrievalResult], plots_dir: Path) -> None:
    fig, ax = plt.subplots(figsize=(7, 4.5))
    methods = [result.method for result in results]
    p1 = [result.precision_at_1 for result in results]
    p3 = [result.precision_at_3 for result in results]
    x = range(len(methods))
    width = 0.35
    ax.bar([i - width / 2 for i in x], p1, width=width, label="P@1", color=PALETTE[0])
    ax.bar([i + width / 2 for i in x], p3, width=width, label="P@3", color=PALETTE[1])
    ax.set_xticks(list(x), methods, rotation=15)
    ax.set_ylim(0, 1)
    ax.set_title("Precision@K Comparison")
    ax.legend()
    fig.tight_layout()
    fig.savefig(plots_dir / "03_km_precision_at_k.png", dpi=160, bbox_inches="tight")
    plt.close(fig)


def plot_mrr_ndcg(results: list[RetrievalResult], plots_dir: Path) -> None:
    fig, axes = plt.subplots(1, 2, figsize=(10, 4.5))
    methods = [result.method for result in results]
    axes[0].bar(methods, [result.mrr for result in results], color=PALETTE[0])
    axes[0].set_title("MRR")
    axes[0].set_ylim(0, 1)
    axes[0].tick_params(axis="x", rotation=15)
    axes[1].bar(methods, [result.ndcg_at_3 for result in results], color=PALETTE[2])
    axes[1].set_title("nDCG@3")
    axes[1].set_ylim(0, 1)
    axes[1].tick_params(axis="x", rotation=15)
    fig.tight_layout()
    fig.savefig(plots_dir / "03_km_mrr_ndcg.png", dpi=160, bbox_inches="tight")
    plt.close(fig)


def plot_results_table(results: list[RetrievalResult], plots_dir: Path) -> Path:
    columns = ["Method", "P@1", "P@3", "R@3", "MRR", "nDCG@3", "Avg Time (ms)"]
    rows = [
        [
            result.method,
            f"{result.precision_at_1:.4f}",
            f"{result.precision_at_3:.4f}",
            f"{result.recall_at_3:.4f}",
            f"{result.mrr:.4f}",
            f"{result.ndcg_at_3:.4f}",
            f"{result.avg_retrieval_time_ms:.2f}",
        ]
        for result in results
    ]
    fig, ax = plt.subplots(figsize=(12, 2.8))
    ax.axis("off")
    table = ax.table(cellText=rows, colLabels=columns, loc="center", cellLoc="center")
    table.auto_set_font_size(False)
    table.set_fontsize(10)
    table.scale(1, 1.5)
    for (row, col), cell in table.get_celld().items():
        cell.set_edgecolor("#d5dce8")
        if row == 0:
            cell.set_facecolor("#173b6c")
            cell.set_text_props(color="white", weight="bold")
        else:
            cell.set_facecolor("#f6f8fb" if row % 2 else "#ffffff")
    ax.set_title("CarePilot KM Retrieval Benchmark", fontsize=14, fontweight="bold", color="#173b6c", pad=16)
    path = plots_dir / "03_km_benchmark_results_table.png"
    fig.savefig(path, dpi=180, bbox_inches="tight")
    plt.close(fig)
    return path


def plot_failure_cases(
    tickets: pd.DataFrame,
    km: pd.DataFrame,
    rankings: list[list[str]],
    plots_dir: Path,
    sample_size: int = 8,
) -> None:
    km_titles = dict(zip(km["km_id"].astype(str), km["title"].astype(str), strict=False))
    failures: list[tuple[str, str, str, str]] = []
    for (_, row), ranked in zip(tickets.iterrows(), rankings, strict=True):
        relevant = set(row["ground_truth_ids"])
        if any(item in relevant for item in ranked[:TOP_K]):
            continue
        expected = ", ".join(relevant)
        got = ", ".join(km_titles.get(item, item) for item in ranked[:TOP_K])
        failures.append((str(row.get("title", "")), str(row.get("perimeter", "")), expected, got))
        if len(failures) >= sample_size:
            break

    if not failures:
        return

    fig, ax = plt.subplots(figsize=(12, max(4, len(failures) * 0.55)))
    ax.axis("off")
    rows = [[title[:42], perimeter[:16], expected[:24], got[:48]] for title, perimeter, expected, got in failures]
    table = ax.table(
        cellText=rows,
        colLabels=["Ticket", "Perimeter", "Expected KM", "Top-3 Retrieved"],
        loc="center",
        cellLoc="left",
    )
    table.auto_set_font_size(False)
    table.set_fontsize(8)
    table.scale(1, 1.35)
    ax.set_title("KM Retrieval Failure Cases (Sentence Transformers)", fontsize=13, fontweight="bold", pad=12)
    fig.tight_layout()
    fig.savefig(plots_dir / "03_km_failure_cases.png", dpi=160, bbox_inches="tight")
    plt.close(fig)


def plot_success_cases(
    tickets: pd.DataFrame,
    km: pd.DataFrame,
    rankings: list[list[str]],
    plots_dir: Path,
    sample_size: int = 6,
) -> None:
    km_titles = dict(zip(km["km_id"].astype(str), km["title"].astype(str), strict=False))
    successes: list[tuple[str, str, str, str]] = []
    for (_, row), ranked in zip(tickets.iterrows(), rankings, strict=True):
        relevant = set(row["ground_truth_ids"])
        hits = [item for item in ranked[:TOP_K] if item in relevant]
        if len(hits) < 2:
            continue
        expected = ", ".join(relevant)
        got = ", ".join(km_titles.get(item, item) for item in ranked[:TOP_K])
        successes.append((str(row.get("title", "")), str(row.get("perimeter", "")), expected, got))
        if len(successes) >= sample_size:
            break

    if not successes:
        return

    fig, ax = plt.subplots(figsize=(12, max(4, len(successes) * 0.55)))
    ax.axis("off")
    rows = [[title[:42], perimeter[:16], expected[:24], got[:48]] for title, perimeter, expected, got in successes]
    table = ax.table(
        cellText=rows,
        colLabels=["Ticket", "Perimeter", "Expected KM", "Top-3 Retrieved"],
        loc="center",
        cellLoc="left",
    )
    table.auto_set_font_size(False)
    table.set_fontsize(8)
    table.scale(1, 1.35)
    ax.set_title("KM Retrieval Success Cases (Sentence Transformers)", fontsize=13, fontweight="bold", pad=12)
    fig.tight_layout()
    fig.savefig(plots_dir / "03_km_success_cases.png", dpi=160, bbox_inches="tight")
    plt.close(fig)
