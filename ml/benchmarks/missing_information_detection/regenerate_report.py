"""Regenerate Task 8 report and charts from saved metrics — no retraining."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from evaluation import ModelResult, result_table
from labels import CANONICAL_LABELS
from preprocessing import (
    dataset_distribution_stats,
    enrich_missing_information_labels,
    label_frequency,
    load_database_url,
    load_historical_tickets,
    split_frames,
)
from report_helpers import build_report_markdown
from visualization import (
    plot_error_analysis,
    plot_per_label_f1,
    plot_rare_label_analysis,
)


@dataclass
class SavedModel:
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


def main() -> None:
    root = Path(__file__).resolve().parents[3]
    metrics_path = root / "ml" / "artifacts" / "03_missing_information_benchmark_metrics.json"
    metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
    plots_dir = root / "ml" / "plots"

    raw = load_historical_tickets(root, load_database_url(root))
    df = enrich_missing_information_labels(raw, seed=42, force_regenerate=True)
    stats = dataset_distribution_stats(df)
    stats["test_size"] = metrics.get("test_size", 0)
    _, _, test_df = split_frames(df)
    corpus_support = label_frequency(df)
    test_support = {
        label: int(test_df["missing_information_labels"].apply(lambda xs: label in xs).sum())
        for label in CANONICAL_LABELS
    }

    per_label_f1 = metrics["per_label_f1_best"]
    best_name = metrics["best_method"]
    results = [
        ModelResult(
            name=m["name"],
            micro_precision=m["micro_precision"],
            micro_recall=m["micro_recall"],
            micro_f1=m["micro_f1"],
            macro_precision=m["macro_precision"],
            macro_recall=m["macro_recall"],
            macro_f1=m["macro_f1"],
            hamming_loss=m["hamming_loss"],
            exact_match_ratio=m["exact_match_ratio"],
            training_time_s=m["training_time_s"],
            inference_time_ms=m["inference_time_ms"],
        )
        for m in metrics["models"]
    ]

    plot_paths = dict(metrics.get("plot_paths", {}))
    plot_paths["per_label"] = plot_per_label_f1(
        per_label_f1, plots_dir, support=corpus_support, method_name=best_name
    )
    plot_paths["rare_labels"] = plot_rare_label_analysis(per_label_f1, corpus_support, plots_dir)
    plot_paths["error"] = plot_error_analysis(per_label_f1, plots_dir)

    best_reason = (
        "Rule-based detection selected: competitive multilabel F1 with zero training cost, "
        "fast inference, and full explainability for enterprise audit trails."
    )

    report = build_report_markdown(
        results=results,
        stats=stats,
        best_name=best_name,
        best_reason=best_reason,
        plot_paths=plot_paths,
        corpus_support=corpus_support,
        test_support=test_support,
        per_label_f1=per_label_f1,
        result_table_fn=result_table,
    )
    report_path = root / "ml" / "reports" / "03_missing_information_detection_summary.md"
    report_path.write_text(report, encoding="utf-8")

    metrics["label_frequency"] = corpus_support
    metrics["test_label_support"] = test_support
    metrics["plot_paths"] = {k: str(v).replace("\\", "/") for k, v in plot_paths.items()}
    metrics_path.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(f"Updated report: {report_path}")
    print(f"Updated charts: {plot_paths['per_label']}, {plot_paths['rare_labels']}")


if __name__ == "__main__":
    main()
