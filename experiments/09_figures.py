"""Render README figures from experiments/results/*.json (no model fitting).

Usage: python experiments/09_figures.py
"""
from __future__ import annotations

import json

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

from common import FIGURES, RESULTS  # noqa: E402

SURFACE, INK, INK2, MUTED, GRID, AXIS = "#fcfcfb", "#0b0b0b", "#52514e", "#898781", "#e1e0d9", "#c3c2b7"
SERIES = ["#2a78d6", "#eb6834", "#1baf7a"]  # categorical slots 1-3, validated (light surface)
TASK_LABELS = {"escalation": "Escalation\n(F1)", "transfer": "Transfer\n(F1)", "sla": "SLA breach\n(F1)", "priority": "Priority\n(macro-F1)", "action": "Action\n(macro-F1)"}


def style(ax, title: str, subtitle: str) -> None:
    ax.set_facecolor(SURFACE)
    ax.figure.set_facecolor(SURFACE)
    for side in ("top", "right", "left"):
        ax.spines[side].set_visible(False)
    ax.spines["bottom"].set_color(AXIS)
    ax.tick_params(colors=MUTED, length=0, labelsize=9)
    ax.yaxis.grid(True, color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)
    ax.set_ylim(0, 1.05)
    ax.figure.text(0.012, 0.965, title, fontsize=12.5, color=INK, weight="bold", ha="left", va="top")
    ax.figure.text(0.012, 0.905, subtitle, fontsize=9, color=INK2, ha="left", va="top")


def grouped(ax, groups, series, values, errors, labels):
    n = len(series)
    width = 0.8 / n
    x = np.arange(len(groups))
    for i, name in enumerate(series):
        pos = x - 0.4 + width * (i + 0.5)
        ax.bar(pos, values[i], width=width, color=SERIES[i], edgecolor=SURFACE, linewidth=2, label=name, zorder=2)
        ax.errorbar(pos, values[i], yerr=errors[i], fmt="none", ecolor=INK2, elinewidth=1, capsize=2.5, zorder=3)
        for xp, v, e in zip(pos, values[i], errors[i][1] if np.ndim(errors[i]) == 2 else errors[i]):
            ax.text(xp, v + e + 0.015, f"{v:.2f}", ha="center", va="bottom", fontsize=7.5, color=INK2)
    ax.set_xticks(x, labels)
    ax.legend(frameon=False, fontsize=8.5, labelcolor=INK2, loc="upper right", ncol=n)


def feature_availability() -> None:
    data = json.loads((RESULTS / "03_baselines_and_feature_availability.json").read_text())["tasks"]
    tasks = list(TASK_LABELS)
    series = ["XGBoost - original features", "XGBoost - creation-time features"]
    values, errors = [], []
    for fs in ("original", "creation_time"):
        v, lo, hi = [], [], []
        for t in tasks:
            m = data[t]["feature_sets"][fs]["models"]["XGBoost"]
            key = "f1" if "f1" in m["test"] else "macro_f1"
            v.append(m["test"][key])
            ci = m[f"{key}_ci95"]
            lo.append(m["test"][key] - ci[0])
            hi.append(ci[1] - m["test"][key])
        values.append(v)
        errors.append(np.array([lo, hi]))
    fig, ax = plt.subplots(figsize=(9.2, 4.6), dpi=160)
    fig.subplots_adjust(top=0.80, bottom=0.17, left=0.06, right=0.99)
    grouped(ax, tasks, series, values, errors, [TASK_LABELS[t] for t in tasks])
    style(ax, "Test score with and without post-outcome features", "Same split, preprocessor and XGBoost hyper-parameters; whiskers = bootstrap 95% CI (1,000 resamples, n=2,100)")
    fig.savefig(FIGURES / "feature_availability.png")
    plt.close(fig)


def split_protocols() -> None:
    data = json.loads((RESULTS / "04_split_protocols.json").read_text())["tasks"]
    tasks = list(TASK_LABELS)
    protocols = [("random", "Random split"), ("case_group_disjoint", "Unseen incident groups"), ("store_disjoint", "Unseen stores")]
    values, errors = [], []
    for key, _ in protocols:
        v, e = [], []
        for t in tasks:
            m = data[t][key]["models"]["XGBoost"]
            metric = "f1" if "f1" in m else "macro_f1"
            v.append(m[metric]["mean"])
            e.append(m[metric]["std"])
        values.append(v)
        errors.append(np.array(e))
    fig, ax = plt.subplots(figsize=(9.2, 4.6), dpi=160)
    fig.subplots_adjust(top=0.80, bottom=0.17, left=0.06, right=0.99)
    grouped(ax, tasks, [p[1] for p in protocols], values, errors, [TASK_LABELS[t] for t in tasks])
    style(ax, "XGBoost under group-disjoint evaluation (creation-time features)", "Mean of 3 seeds, 15% held out; whiskers = 1 standard deviation across seeds")
    fig.savefig(FIGURES / "split_protocols.png")
    plt.close(fig)


if __name__ == "__main__":
    FIGURES.mkdir(parents=True, exist_ok=True)
    feature_availability()
    split_protocols()
    print("figures written to", FIGURES)
