"""Shared helpers for CAREPILOT benchmark notebooks (Chapter 2 report style)."""

from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

HEADER_COLOR = "#173b6c"
FOOTER_COLOR = "#5f6b7a"
ALT_ROW = "#f6f8fb"
CHART_COLORS = ["#173b6c", "#46698d", "#6385a9", "#9fb5cd"]


def find_project_root(start: Path | None = None) -> Path:
    start = start or Path.cwd()
    for candidate in [start, *start.parents]:
        if (candidate / "ml" / "artifacts").exists():
            return candidate
    raise FileNotFoundError("Could not locate project root (ml/artifacts missing).")


def plot_results_table(
    df: pd.DataFrame,
    *,
    title: str,
    footer: str,
    output_path: Path,
    col_widths: list[float] | None = None,
) -> Path:
    """Render a report-ready benchmark table PNG (CAREPILOT enterprise style)."""
    fig, ax = plt.subplots(figsize=(14.5, max(2.8, 0.55 * (len(df) + 2))))
    ax.axis("off")
    fig.patch.set_facecolor("white")
    ax.set_title(title, fontsize=16, fontweight="bold", color=HEADER_COLOR, pad=18)
    widths = col_widths or [1 / len(df.columns)] * len(df.columns)
    table = ax.table(
        cellText=df.values,
        colLabels=list(df.columns),
        cellLoc="center",
        colLoc="center",
        loc="center",
        colWidths=widths,
    )
    table.auto_set_font_size(False)
    table.set_fontsize(9)
    table.scale(1, 1.65)
    for (row, col), cell in table.get_celld().items():
        cell.set_edgecolor("#d5dce8")
        cell.set_linewidth(0.8)
        if row == 0:
            cell.set_facecolor(HEADER_COLOR)
            cell.set_text_props(color="white", weight="bold")
        else:
            cell.set_facecolor(ALT_ROW if row % 2 else "#ffffff")
            cell.set_text_props(color="#111827", weight="bold" if col == 0 else "normal")
    fig.text(0.5, 0.04, footer, ha="center", fontsize=9, color=FOOTER_COLOR)
    fig.tight_layout(rect=[0, 0.06, 1, 0.96])
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_path, dpi=180, bbox_inches="tight")
    plt.close(fig)
    return output_path


def display_plot(path: Path, width: int = 960) -> None:
    """Display a PNG inline in Jupyter (absolute path, report screenshot width)."""
    from IPython.display import Image, display

    resolved = Path(path).resolve()
    if resolved.exists():
        display(Image(filename=str(resolved), width=width))
    else:
        print(f"Plot not found: {resolved}")


def display_plots(paths: list[Path], width: int = 960) -> None:
    for path in paths:
        display_plot(path, width=width)
