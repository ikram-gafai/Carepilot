"""Report-ready plots for Task 9 LLM explanation benchmark."""

from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

from evaluation import QualityScores


def plot_results_table(results: list[dict], plots_dir: Path) -> str:
    frame = pd.DataFrame(results)
    fig, ax = plt.subplots(figsize=(14.5, 3.2))
    ax.axis("off")
    fig.patch.set_facecolor("white")
    ax.set_title(
        "CarePilot LLM Operational Explanation Benchmark",
        fontsize=16,
        fontweight="bold",
        color="#173b6c",
        pad=18,
    )
    table = ax.table(
        cellText=frame.values,
        colLabels=list(frame.columns),
        cellLoc="center",
        colLoc="center",
        loc="center",
        colWidths=[0.14, 0.1, 0.15, 0.12, 0.15, 0.12, 0.12],
    )
    table.auto_set_font_size(False)
    table.set_fontsize(9)
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
        "50 evaluation tickets · Live Ollama inference · Qualitative rubric (1–5)",
        ha="center",
        fontsize=9,
        color="#5f6b7a",
    )
    fig.tight_layout(rect=[0, 0.06, 1, 0.96])
    path = plots_dir / "03_llm_explanation_benchmark_results_table.png"
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=180, bbox_inches="tight")
    plt.close(fig)
    return str(path)
