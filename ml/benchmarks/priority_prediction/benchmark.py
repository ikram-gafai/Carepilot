from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier

from evaluation import ModelResult, best_by_macro_f1, fit_and_evaluate, result_table
from preprocessing import (
    PRIORITY_CLASSES,
    TARGET_COLUMN,
    build_label_encoder,
    build_preprocessor,
    encode_labels,
    ensure_columns,
    feature_matrix,
    load_database_url,
    load_ml_training_table_counts,
    load_priority_dataset,
    prepare_dataframe,
)
from visualization import (
    plot_confusion_matrix,
    plot_correlation_heatmap,
    plot_error_analysis,
    plot_feature_importance,
    plot_macro_f1,
    plot_model_comparison,
    plot_per_class_metrics,
    plot_priority_distribution,
    plot_results_table,
    slug,
)

RANDOM_STATE = 20260525


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="CarePilot priority prediction benchmark.")
    parser.add_argument("--project-root", default=str(Path(__file__).resolve().parents[3]))
    parser.add_argument("--database-url", default=None)
    return parser.parse_args()


def build_models() -> dict[str, Pipeline]:
    return {
        "Logistic Regression": Pipeline(
            steps=[
                ("preprocessor", build_preprocessor(max_text_features=38)),
                (
                    "model",
                    LogisticRegression(
                        max_iter=2200,
                        C=0.005,
                        solver="lbfgs",
                        random_state=RANDOM_STATE,
                    ),
                ),
            ],
        ),
        "Random Forest": Pipeline(
            steps=[
                ("preprocessor", build_preprocessor(max_text_features=450)),
                (
                    "model",
                    RandomForestClassifier(
                        n_estimators=240,
                        max_depth=14,
                        min_samples_split=6,
                        min_samples_leaf=3,
                        max_features="sqrt",
                        class_weight="balanced_subsample",
                        random_state=RANDOM_STATE,
                        n_jobs=-1,
                    ),
                ),
            ],
        ),
        "XGBoost": Pipeline(
            steps=[
                ("preprocessor", build_preprocessor(max_text_features=650)),
                (
                    "model",
                    XGBClassifier(
                        n_estimators=145,
                        max_depth=3,
                        learning_rate=0.042,
                        subsample=0.8,
                        colsample_bytree=0.75,
                        reg_lambda=4.2,
                        reg_alpha=0.2,
                        min_child_weight=6,
                        objective="multi:softprob",
                        num_class=len(PRIORITY_CLASSES),
                        eval_metric="mlogloss",
                        random_state=RANDOM_STATE,
                        n_jobs=-1,
                    ),
                ),
            ],
        ),
    }


def stratified_splits(df: pd.DataFrame):
    train_df, holdout_df = train_test_split(
        df,
        train_size=0.70,
        random_state=RANDOM_STATE,
        stratify=df[TARGET_COLUMN],
    )
    validation_df, test_df = train_test_split(
        holdout_df,
        train_size=0.50,
        random_state=RANDOM_STATE,
        stratify=holdout_df[TARGET_COLUMN],
    )
    return train_df, validation_df, test_df


def dataset_stats(df, train_df, validation_df, test_df, table_counts) -> dict:
    def pct(series: pd.Series) -> dict[str, float]:
        values = series.value_counts(normalize=True).sort_index() * 100
        return {str(k): round(float(v), 2) for k, v in values.items()}

    return {
        "total_tickets": int(len(df)),
        "table_counts": table_counts,
        "class_distribution_pct": pct(df[TARGET_COLUMN]),
        "split_sizes": {
            "train": int(len(train_df)),
            "validation": int(len(validation_df)),
            "test": int(len(test_df)),
        },
        "missing_description_pct": round(float((df["description"] == "").mean() * 100), 2),
        "missing_resolution_time_pct": round(float(df["resolution_time_minutes"].isna().mean() * 100), 2),
    }


def feature_names_for(pipeline: Pipeline) -> np.ndarray:
    return pipeline.named_steps["preprocessor"].get_feature_names_out()


def save_feature_importance(name: str, pipeline: Pipeline, plots_dir: Path) -> str | None:
    model = pipeline.named_steps["model"]
    if not hasattr(model, "feature_importances_"):
        return None
    return plot_feature_importance(name, feature_names_for(pipeline), np.asarray(model.feature_importances_), plots_dir)


def main() -> None:
    args = parse_args()
    project_root = Path(args.project_root).resolve()
    ml_root = project_root / "ml"
    artifacts_dir = ml_root / "artifacts"
    plots_dir = ml_root / "plots"
    reports_dir = ml_root / "benchmarks" / "priority_prediction" / "reports"
    models_dir = artifacts_dir / "models"
    for directory in [artifacts_dir, plots_dir, reports_dir, models_dir]:
        directory.mkdir(parents=True, exist_ok=True)

    database_url = args.database_url or load_database_url(project_root)
    raw_df = load_priority_dataset(database_url)
    ensure_columns(
        raw_df,
        [
            "ticket_id",
            "title",
            "description",
            "perimeter",
            "priority",
            "incident_category",
            "store_size",
            "queue_load",
            "escalation_required",
            "transfer_required",
            "sla_breached",
            "recommended_action",
            "ticket_age_minutes",
            "resolution_time_minutes",
            "environment_type",
            "operational_complexity",
        ],
    )
    table_counts = load_ml_training_table_counts(database_url)
    df = prepare_dataframe(raw_df)
    label_encoder = build_label_encoder(df[TARGET_COLUMN])
    joblib.dump(label_encoder, models_dir / "priority_label_encoder.joblib")

    train_df, validation_df, test_df = stratified_splits(df)
    x_train, y_train_raw = feature_matrix(train_df)
    x_test, y_test_raw = feature_matrix(test_df)
    y_train = encode_labels(y_train_raw, label_encoder)
    y_test = encode_labels(y_test_raw, label_encoder)

    models = build_models()
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    cv_rows = []
    for name, model in models.items():
        scores = cross_val_score(model, x_train, y_train, cv=cv, scoring="f1_macro", n_jobs=None)
        cv_rows.append(
            {"Model": name, "Mean Macro F1": round(float(scores.mean()), 4), "Std Deviation": round(float(scores.std()), 4)},
        )

    results: list[ModelResult] = []
    trained_models: dict[str, Pipeline] = {}
    for name, model in models.items():
        result = fit_and_evaluate(name, model, x_train, y_train, x_test, y_test, PRIORITY_CLASSES, label_encoder)
        results.append(result)
        trained_models[name] = model
        joblib.dump(
            {"pipeline": model, "classes": PRIORITY_CLASSES, "label_encoder": label_encoder},
            models_dir / f"{slug(name)}_priority.joblib",
        )

    stats = dataset_stats(df, train_df, validation_df, test_df, table_counts)
    plot_paths = {
        "priority_distribution": plot_priority_distribution(df, plots_dir),
        "model_comparison": plot_model_comparison(results, plots_dir),
        "macro_f1": plot_macro_f1(results, plots_dir),
        "per_class_metrics": plot_per_class_metrics(results, plots_dir),
        "benchmark_results_table": plot_results_table(results, plots_dir),
        "correlation_heatmap": plot_correlation_heatmap(df, plots_dir),
    }
    for result in results:
        plot_confusion_matrix(result, plots_dir)
        plot_error_analysis(result, y_test_raw, plots_dir)

    feature_importance_paths = {}
    for name in ["Random Forest", "XGBoost"]:
        path = save_feature_importance(name, trained_models[name], plots_dir)
        if path:
            feature_importance_paths[name] = path

    payload = {
        "dataset": stats,
        "results": result_table(results),
        "best_model": best_by_macro_f1(results).name,
        "confusion_matrices": {r.name: r.confusion_matrix for r in results},
        "classification_reports": {r.name: r.classification_report for r in results},
        "cross_validation": cv_rows,
        "plots": plot_paths,
        "feature_importance_plots": feature_importance_paths,
    }
    (artifacts_dir / "03_priority_prediction_benchmark_metrics.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    pd.DataFrame(result_table(results)).to_csv(artifacts_dir / "03_priority_prediction_benchmark_metrics.csv", index=False)

    best = best_by_macro_f1(results)
    results_df = pd.DataFrame(result_table(results))
    report = f"""# Priority Prediction Benchmark Summary

## Objective

Predict operational ticket priority (`P1`–`P4`) before manual triage. Task 5 complements escalation, transfer, action recommendation, and SLA prediction to complete the CAREPILOT operational prediction layer.

## Problem Definition

- **Target:** `priority` (multiclass)
- **Classes:** P1, P2, P3, P4
- **Primary metric:** Macro F1

## Dataset Characteristics

Source: `ml_training.historical_tickets` ({stats["total_tickets"]} tickets)

| Priority | Share (%) |
| --- | --- |
{chr(10).join(f"| {label} | {pct} |" for label, pct in stats["class_distribution_pct"].items())}

- Missing descriptions: {stats["missing_description_pct"]}%
- Missing resolution time: {stats["missing_resolution_time_pct"]}%
- Split: {stats["split_sizes"]["train"]} train / {stats["split_sizes"]["validation"]} validation / {stats["split_sizes"]["test"]} test (stratified)

## Preprocessing

Text normalization, TF-IDF, categorical one-hot encoding, numeric imputation/scaling, label encoding for P1–P4. Priority is excluded from features.

## Benchmark Results

{results_df.to_markdown(index=False)}

**Best model:** {best.name} (Macro F1 {best.macro_f1:.3f})

Production artifact: `ml/artifacts/models/xgboost_priority.joblib`

## Operational Implications

- Predicted P1/P2 tickets support proactive queue prioritization and SLA supervision.
- Combined with Tasks 1–4, agents receive a full operational intelligence stack on each ticket.

## Limitations

- Priority labels remain partially correlated with routing outcomes despite controlled ambiguity.
- Live inference uses predicted routing signals from other models when available.
"""
    (reports_dir / "priority_prediction_benchmark_report.md").write_text(report, encoding="utf-8")
    (ml_root / "reports" / "03_priority_prediction_benchmark_summary.md").write_text(report, encoding="utf-8")
    print(results_df.to_string(index=False))
    print(f"\nReport: {reports_dir / 'priority_prediction_benchmark_report.md'}")


if __name__ == "__main__":
    main()
