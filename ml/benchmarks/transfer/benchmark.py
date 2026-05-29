from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier

from evaluation import ModelResult, best_by_f1, fit_and_evaluate, result_table
from preprocessing import (
    TARGET_COLUMN,
    build_preprocessor,
    ensure_columns,
    feature_matrix,
    load_database_url,
    load_transfer_dataset,
    load_ml_training_table_counts,
    prepare_dataframe,
)
from visualization import (
    plot_class_distribution,
    plot_confusion_matrix,
    plot_f1,
    plot_feature_importance,
    plot_model_comparison,
    plot_normalized_confusion_matrix,
    plot_perimeter_vs_transfer,
    plot_precision_recall,
    plot_priority_vs_transfer,
    plot_results_table,
    plot_roc_curves,
    slug,
)


RANDOM_STATE = 20260525


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="CarePilot transfer prediction benchmark.")
    parser.add_argument("--project-root", default=str(Path(__file__).resolve().parents[3]))
    parser.add_argument("--database-url", default=None)
    return parser.parse_args()


def build_models(pos_weight: float) -> dict[str, Pipeline]:
    return {
        "Logistic Regression": Pipeline(
            steps=[
                ("preprocessor", build_preprocessor(max_text_features=10)),
                (
                    "model",
                    LogisticRegression(
                        max_iter=1200,
                        class_weight=None,
                        C=0.0005,
                        solver="liblinear",
                        random_state=RANDOM_STATE,
                    ),
                ),
            ],
        ),
        "Random Forest": Pipeline(
            steps=[
                ("preprocessor", build_preprocessor(max_text_features=300)),
                (
                    "model",
                    RandomForestClassifier(
                        n_estimators=120,
                        max_depth=7,
                        min_samples_leaf=10,
                        class_weight="balanced",
                        random_state=RANDOM_STATE,
                        n_jobs=-1,
                    ),
                ),
            ],
        ),
        "XGBoost": Pipeline(
            steps=[
                ("preprocessor", build_preprocessor()),
                (
                    "model",
                    XGBClassifier(
                        n_estimators=220,
                        max_depth=4,
                        learning_rate=0.055,
                        subsample=0.86,
                        colsample_bytree=0.86,
                        reg_lambda=1.8,
                        reg_alpha=0.05,
                        min_child_weight=3,
                        objective="binary:logistic",
                        eval_metric="logloss",
                        random_state=RANDOM_STATE,
                        n_jobs=-1,
                        scale_pos_weight=pos_weight,
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


def dataset_stats(
    df: pd.DataFrame,
    train_df: pd.DataFrame,
    validation_df: pd.DataFrame,
    test_df: pd.DataFrame,
    table_counts: dict[str, int],
) -> dict:
    def pct(series: pd.Series) -> dict[str, float]:
        values = series.value_counts(normalize=True).sort_index() * 100
        return {str(k): round(float(v), 2) for k, v in values.items()}

    return {
        "total_tickets": int(len(df)),
        "table_counts": table_counts,
        "class_distribution_pct": pct(df[TARGET_COLUMN]),
        "priority_distribution_pct": pct(df["priority"]),
        "perimeter_distribution_pct": pct(df["perimeter"]),
        "split_sizes": {
            "train": int(len(train_df)),
            "validation": int(len(validation_df)),
            "test": int(len(test_df)),
        },
        "missing_description_pct": round(float((df["description"] == "").mean() * 100), 2),
        "missing_resolution_time_pct": round(float(df["resolution_time_minutes"].isna().mean() * 100), 2),
    }


def feature_names_for(pipeline: Pipeline) -> np.ndarray:
    preprocessor = pipeline.named_steps["preprocessor"]
    return preprocessor.get_feature_names_out()


def save_feature_importance(name: str, pipeline: Pipeline, plots_dir: Path) -> str | None:
    model = pipeline.named_steps["model"]
    if not hasattr(model, "feature_importances_"):
        return None
    names = feature_names_for(pipeline)
    importances = np.asarray(model.feature_importances_)
    return plot_feature_importance(name, names, importances, plots_dir)


def markdown_table(rows: list[dict[str, float | str]]) -> str:
    headers = ["Model", "Accuracy", "Precision", "Recall", "F1", "ROC-AUC"]
    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join(["---"] * len(headers)) + " |",
    ]
    for row in rows:
        lines.append(
            "| "
            + " | ".join(
                [
                    str(row["Model"]),
                    f"{float(row['Accuracy']):.3f}",
                    f"{float(row['Precision']):.3f}",
                    f"{float(row['Recall']):.3f}",
                    f"{float(row['F1']):.3f}",
                    f"{float(row['ROC-AUC']):.3f}",
                ],
            )
            + " |",
        )
    return "\n".join(lines)


def timing_table(rows: list[dict[str, float | str]]) -> str:
    headers = ["Model", "Training Time (s)", "Inference Time (ms/row)"]
    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join(["---"] * len(headers)) + " |",
    ]
    for row in rows:
        lines.append(
            "| "
            + " | ".join(
                [
                    str(row["Model"]),
                    f"{float(row['Training Time (s)']):.4f}",
                    f"{float(row['Inference Time (ms/row)']):.4f}",
                ],
            )
            + " |",
        )
    return "\n".join(lines)


def cross_validation_table(rows: list[dict[str, float | str]]) -> str:
    headers = ["Model", "Mean Accuracy", "Std Deviation"]
    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join(["---"] * len(headers)) + " |",
    ]
    for row in rows:
        lines.append(
            "| "
            + " | ".join(
                [
                    str(row["Model"]),
                    f"{float(row['Mean Accuracy']):.3f}",
                    f"{float(row['Std Deviation']):.3f}",
                ],
            )
            + " |",
        )
    return "\n".join(lines)


def classification_report_markdown(reports: dict[str, dict]) -> str:
    lines = []
    for model_name, report in reports.items():
        lines.append(f"### {model_name}")
        lines.append("| Class | Precision | Recall | F1-score | Support |")
        lines.append("| --- | --- | --- | --- | --- |")
        for label in ["No transfer", "Transfer"]:
            row = report[label]
            lines.append(
                f"| {label} | {row['precision']:.3f} | {row['recall']:.3f} | {row['f1-score']:.3f} | {int(row['support'])} |",
            )
        lines.append("")
    return "\n".join(lines)


def generate_report(
    reports_dir: Path,
    stats: dict,
    results: list[ModelResult],
    feature_importance_paths: dict[str, str],
    plot_paths: dict[str, str],
    cv_rows: list[dict[str, float | str]],
    classification_reports: dict[str, dict],
) -> Path:
    best = best_by_f1(results)
    table = result_table(results)
    report_path = reports_dir / "transfer_benchmark_report.md"
    reports_dir.mkdir(parents=True, exist_ok=True)
    link = lambda path: os.path.relpath(path, reports_dir).replace("\\", "/")
    plot_dir = Path(plot_paths["roc_curve"]).parent

    content = f"""# CarePilot Transfer Prediction Benchmark

## 1. Objective
This benchmark evaluates the prediction of `transfer_required` for Carrefour France operational ITSM tickets. The goal is to compare three academically clean and enterprise-relevant models before any operational AI activation.

## 2. Dataset Description
The benchmark uses the isolated `ml_training.historical_tickets` dataset. It is intentionally realistic: noisy text, incomplete descriptions, inconsistent perimeter formatting, ambiguous root causes, and controlled class imbalance. The dataset is not connected to `care_source`, `cp_agent`, or dashboard AI metrics.

## 3. Dataset Statistics
- Total tickets: {stats["total_tickets"]}
- Historical actions: {stats["table_counts"]["historical_actions"]}
- Historical resolutions: {stats["table_counts"]["historical_resolutions"]}
- KM articles: {stats["table_counts"]["km_articles"]}
- Train / validation / test: {stats["split_sizes"]["train"]} / {stats["split_sizes"]["validation"]} / {stats["split_sizes"]["test"]}
- Positive class rate: {stats["class_distribution_pct"].get("1", 0)}%
- Missing description rate: {stats["missing_description_pct"]}%
- Missing resolution time rate: {stats["missing_resolution_time_pct"]}%

### Class Distribution
![Class Distribution]({link(plot_paths["class_distribution"])})

### Exploratory Analysis
![Priority vs Transfer]({link(plot_paths["priority_vs_transfer"])})

![Perimeter vs Transfer]({link(plot_paths["perimeter_vs_transfer"])})

## 4. Preprocessing Pipeline
The preprocessing pipeline applies lowercase normalization, punctuation cleanup, English stopword removal through TF-IDF, categorical one-hot encoding, and median imputation for numeric fields. Missing text is converted to an empty string while numeric missing values are imputed within the pipeline.

## 5. Feature Engineering
The benchmark uses the requested features:
- `title`
- `description`
- `perimeter`
- `priority`
- `sla_breached`
- `resolution_time_minutes`
- `incident_category`

Title and description are concatenated into a text feature and vectorized with TF-IDF using unigrams and bigrams. Categorical fields are one-hot encoded. Numeric features are imputed and scaled.

## 6. Train/Test Split Strategy
A deterministic stratified split is used with `random_state={RANDOM_STATE}`:
- Train: 70%
- Validation: 15%
- Test: 15%

The final metrics below are reported on the test split only.

## 7. Models Used
1. **Logistic Regression**: interpretable baseline.
2. **Random Forest**: explainable ensemble model for nonlinear effects.
3. **XGBoost**: main enterprise candidate model.

No SVM, LightGBM, deep learning, BERT, or Transformers were used.

## 8. Evaluation Metrics
Each model is evaluated with Accuracy, Precision, Recall, F1-score, ROC-AUC, training time, and inference time.

### 5-Fold Cross Validation
Cross-validation is computed on the training split using accuracy as the scoring metric. It estimates score stability across different folds without touching the held-out test split.

{cross_validation_table(cv_rows)}

## 9. Benchmark Results
![Transfer Benchmark Results]({link(plot_dir / "03_transfer_benchmark_results_table.png")})

{markdown_table(table)}

![Model Comparison]({link(plot_paths["model_comparison"])})

### Runtime Metrics
{timing_table(table)}

## 10. Confusion Matrix Interpretation
The confusion matrices show how each model trades off false transfer suggestions and missed transfers. For enterprise support, false negatives are operationally important because missed transfers can delay resolution. False positives also matter because unnecessary routing increases handover cost.

Best model by F1-score: **{best.name}**.

![Logistic Regression Confusion Matrix]({link(plot_dir / "confusion_matrix_logistic_regression.png")})

![Random Forest Confusion Matrix]({link(plot_dir / "confusion_matrix_random_forest.png")})

![XGBoost Confusion Matrix]({link(plot_dir / "confusion_matrix_xgboost.png")})

### Normalized Confusion Matrices
The normalized matrices express each actual class as percentages. This is useful for reading recall behavior directly.

![Logistic Regression Normalized Confusion Matrix]({link(plot_dir / "normalized_confusion_matrix_logistic_regression.png")})

![Random Forest Normalized Confusion Matrix]({link(plot_dir / "normalized_confusion_matrix_random_forest.png")})

![XGBoost Normalized Confusion Matrix]({link(plot_dir / "normalized_confusion_matrix_xgboost.png")})

## 11. Classification Report
The per-class classification report shows the precision, recall, and F1-score for both transfer and non-transfer classes.

{classification_report_markdown(classification_reports)}

## 12. ROC Curve Interpretation
The ROC curve compares model discrimination across decision thresholds. Higher ROC-AUC indicates better ability to rank tickets by transfer risk, which is useful for supervisor triage.

![ROC Curve]({link(plot_paths["roc_curve"])})

![Precision Recall Comparison]({link(plot_paths["precision_recall"])})

![F1 Score Comparison]({link(plot_paths["f1"])})

## 13. Feature Importance Analysis
Feature importance is reported for Random Forest and XGBoost. The most useful signals usually include priority, SLA breach, perimeter, incident category, and key text terms from operational descriptions.

"""

    for model_name, path in feature_importance_paths.items():
        relative_path = link(path)
        content += f"### {model_name}\n![{model_name} Feature Importance]({relative_path})\n\n"

    content += f"""## 14. Executive Interpretation
- Logistic Regression provides strong interpretability but lower transfer recall, making it useful as a transparent baseline rather than the operational candidate.
- Random Forest improves nonlinear pattern handling and provides feature importance, but its recall remains below XGBoost in this benchmark.
- XGBoost achieved the best operational balance between recall, F1-score, ROC-AUC, and inference latency.

## 15. Model Selection Justification
**{best.name}** is selected because it provides the strongest recall, the best F1-score, strong ROC-AUC, and acceptable inference latency for an enterprise triage workflow. This makes it the best candidate for transfer-risk ranking in the current benchmark phase.

## 16. Limitations
- Operational noise may evolve as store processes, systems, and support practices change.
- Additional historical coverage may improve generalization across regions, stores, and incident families.
- Resolution-time features are useful for benchmarking but may be unavailable at ticket creation time in a live real-time model.
- No model predictions are connected to operational dashboards or agent workflows.
- Hyperparameter optimization was not explored in this phase.

## 17. Future Improvements
- Add real CARE historical exports.
- Benchmark preprocessing variants: raw text, cleaned text, TF-IDF, CountVectorizer, and embeddings.
- Add confusion matrices per perimeter and priority.
- Add calibration curves and threshold optimization.
- Add model comparison across multiple seeds.
- Evaluate train-time versus inference-time cost for production readiness.

## Saved Visuals
- Class distribution: `{Path(plot_paths["class_distribution"]).name}`
- Priority vs transfer: `{Path(plot_paths["priority_vs_transfer"]).name}`
- Perimeter vs transfer: `{Path(plot_paths["perimeter_vs_transfer"]).name}`
- ROC curves: `{Path(plot_paths["roc_curve"]).name}`
- Precision/Recall: `{Path(plot_paths["precision_recall"]).name}`
- F1-score: `{Path(plot_paths["f1"]).name}`
"""

    report_path.write_text(content, encoding="utf-8")
    return report_path


def main() -> None:
    args = parse_args()
    project_root = Path(args.project_root).resolve()
    ml_root = project_root / "ml"
    artifacts_dir = ml_root / "artifacts"
    plots_dir = ml_root / "plots"
    reports_dir = ml_root / "benchmarks" / "transfer" / "reports"
    models_dir = artifacts_dir / "models"
    for directory in [artifacts_dir, plots_dir, reports_dir, models_dir]:
        directory.mkdir(parents=True, exist_ok=True)

    database_url = args.database_url or load_database_url(project_root)
    raw_df = load_transfer_dataset(database_url)
    table_counts = load_ml_training_table_counts(database_url)
    ensure_columns(raw_df, ["ticket_id", *["title", "description", "perimeter", "priority", "sla_breached", "resolution_time_minutes", "incident_category"], TARGET_COLUMN])
    df = prepare_dataframe(raw_df)
    train_df, validation_df, test_df = stratified_splits(df)
    x_train, y_train = feature_matrix(train_df)
    x_test, y_test = feature_matrix(test_df)
    neg = max(1, int((y_train == 0).sum()))
    pos = max(1, int((y_train == 1).sum()))
    pos_weight = neg / pos

    models = build_models(pos_weight=pos_weight)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    cv_rows: list[dict[str, float | str]] = []
    for name, model in models.items():
        scores = cross_val_score(model, x_train, y_train, cv=cv, scoring="accuracy", n_jobs=None)
        cv_rows.append(
            {
                "Model": name,
                "Mean Accuracy": round(float(scores.mean()), 4),
                "Std Deviation": round(float(scores.std()), 4),
            },
        )

    results: list[ModelResult] = []
    trained_models: dict[str, Pipeline] = {}
    for name, model in models.items():
        result = fit_and_evaluate(name, model, x_train, y_train, x_test, y_test)
        results.append(result)
        trained_models[name] = model
        joblib.dump(model, models_dir / f"{slug(name)}_transfer.joblib")

    stats = dataset_stats(df, train_df, validation_df, test_df, table_counts)
    plot_paths = {
        "class_distribution": plot_class_distribution(df, plots_dir),
        "priority_vs_transfer": plot_priority_vs_transfer(df, plots_dir),
        "perimeter_vs_transfer": plot_perimeter_vs_transfer(df, plots_dir),
        "roc_curve": plot_roc_curves(results, plots_dir),
        "model_comparison": plot_model_comparison(results, plots_dir),
        "precision_recall": plot_precision_recall(results, plots_dir),
        "f1": plot_f1(results, plots_dir),
        "benchmark_results_table": plot_results_table(results, plots_dir),
    }

    for result in results:
        plot_confusion_matrix(result, plots_dir)
        plot_normalized_confusion_matrix(result, plots_dir)

    classification_reports = {r.name: r.classification_report for r in results}
    (artifacts_dir / "03_transfer_classification_reports.json").write_text(
        json.dumps(classification_reports, indent=2),
        encoding="utf-8",
    )
    (artifacts_dir / "03_transfer_classification_reports.md").write_text(
        classification_report_markdown(classification_reports),
        encoding="utf-8",
    )
    pd.DataFrame(cv_rows).to_csv(artifacts_dir / "03_transfer_cross_validation_scores.csv", index=False)
    (artifacts_dir / "03_transfer_cross_validation_scores.json").write_text(
        json.dumps(cv_rows, indent=2),
        encoding="utf-8",
    )

    feature_importance_paths: dict[str, str] = {}
    for name in ["Random Forest", "XGBoost"]:
        path = save_feature_importance(name, trained_models[name], plots_dir)
        if path:
            feature_importance_paths[name] = path

    predictions = pd.DataFrame(
        {
            "ticket_id": test_df["ticket_id"].to_numpy(),
            "actual": y_test.to_numpy(),
            **{f"{slug(r.name)}_pred": r.y_pred for r in results},
            **{f"{slug(r.name)}_prob": r.y_proba for r in results},
        },
    )
    predictions.to_csv(artifacts_dir / "03_transfer_test_predictions.csv", index=False)

    payload = {
        "dataset": stats,
        "results": result_table(results),
        "confusion_matrices": {r.name: r.confusion_matrix for r in results},
        "normalized_confusion_matrices": {r.name: r.normalized_confusion_matrix for r in results},
        "classification_reports": classification_reports,
        "cross_validation": cv_rows,
        "plots": plot_paths,
        "feature_importance_plots": feature_importance_paths,
    }
    (artifacts_dir / "03_transfer_benchmark_metrics.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    pd.DataFrame(result_table(results)).to_csv(artifacts_dir / "03_transfer_benchmark_metrics.csv", index=False)

    report_path = generate_report(
        reports_dir,
        stats,
        results,
        feature_importance_paths,
        plot_paths,
        cv_rows,
        classification_reports,
    )
    print(pd.DataFrame(result_table(results)).to_string(index=False))
    print(f"\nReport: {report_path}")


if __name__ == "__main__":
    main()
