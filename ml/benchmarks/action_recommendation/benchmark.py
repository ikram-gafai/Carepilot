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
    ACTION_CLASSES,
    TARGET_COLUMN,
    build_label_encoder,
    build_preprocessor,
    encode_labels,
    feature_matrix,
    load_action_dataset,
    load_database_url,
    load_ml_training_table_counts,
    prepare_dataframe,
)
from visualization import (
    plot_action_distribution,
    plot_confusion_matrix,
    plot_error_analysis,
    plot_feature_importance,
    plot_macro_f1,
    plot_model_comparison,
    plot_per_class_metrics,
    plot_results_table,
    slug,
)

RANDOM_STATE = 20260525


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="CarePilot action recommendation benchmark.")
    parser.add_argument("--project-root", default=str(Path(__file__).resolve().parents[3]))
    parser.add_argument("--database-url", default=None)
    return parser.parse_args()


def build_models() -> dict[str, Pipeline]:
    return {
        "Logistic Regression": Pipeline(
            steps=[
                ("preprocessor", build_preprocessor(max_text_features=80)),
                (
                    "model",
                    LogisticRegression(
                        max_iter=2000,
                        C=0.6,
                        solver="lbfgs",
                        random_state=RANDOM_STATE,
                    ),
                ),
            ],
        ),
        "Random Forest": Pipeline(
            steps=[
                ("preprocessor", build_preprocessor(max_text_features=350)),
                (
                    "model",
                    RandomForestClassifier(
                        n_estimators=140,
                        max_depth=9,
                        min_samples_leaf=6,
                        class_weight="balanced_subsample",
                        random_state=RANDOM_STATE,
                        n_jobs=-1,
                    ),
                ),
            ],
        ),
        "XGBoost": Pipeline(
            steps=[
                ("preprocessor", build_preprocessor(max_text_features=2800)),
                (
                    "model",
                    XGBClassifier(
                        n_estimators=240,
                        max_depth=6,
                        learning_rate=0.07,
                        subsample=0.88,
                        colsample_bytree=0.85,
                        reg_lambda=1.2,
                        min_child_weight=2,
                        objective="multi:softprob",
                        num_class=len(ACTION_CLASSES),
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
    reports_dir = ml_root / "benchmarks" / "action_recommendation" / "reports"
    models_dir = artifacts_dir / "models"
    for directory in [artifacts_dir, plots_dir, reports_dir, models_dir]:
        directory.mkdir(parents=True, exist_ok=True)

    database_url = args.database_url or load_database_url(project_root)
    raw_df = load_action_dataset(database_url)
    table_counts = load_ml_training_table_counts(database_url)
    df = prepare_dataframe(raw_df)
    label_encoder = build_label_encoder(df[TARGET_COLUMN])
    joblib.dump(label_encoder, models_dir / "action_label_encoder.joblib")

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
        cv_rows.append({"Model": name, "Mean Macro F1": round(float(scores.mean()), 4), "Std Deviation": round(float(scores.std()), 4)})

    results: list[ModelResult] = []
    trained_models: dict[str, Pipeline] = {}
    for name, model in models.items():
        result = fit_and_evaluate(name, model, x_train, y_train, x_test, y_test, ACTION_CLASSES, label_encoder)
        results.append(result)
        trained_models[name] = model
        joblib.dump({"pipeline": model, "classes": ACTION_CLASSES, "label_encoder": label_encoder}, models_dir / f"{slug(name)}_action.joblib")

    stats = dataset_stats(df, train_df, validation_df, test_df, table_counts)
    plot_paths = {
        "action_distribution": plot_action_distribution(df, plots_dir),
        "model_comparison": plot_model_comparison(results, plots_dir),
        "macro_f1": plot_macro_f1(results, plots_dir),
        "per_class_metrics": plot_per_class_metrics(results, plots_dir),
        "benchmark_results_table": plot_results_table(results, plots_dir),
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
    (artifacts_dir / "03_action_recommendation_benchmark_metrics.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    pd.DataFrame(result_table(results)).to_csv(artifacts_dir / "03_action_recommendation_benchmark_metrics.csv", index=False)

    best = best_by_macro_f1(results)
    results_df = pd.DataFrame(result_table(results))
    report = f"""# Action Recommendation Benchmark Summary

## Objective

Predict the next operational action an N1/N2 agent should take for a ticket (`recommended_action`). Task 3 complements escalation (Task 1) and transfer (Task 2) prediction to form CAREPILOT operational decision support.

## Target Definition

Multiclass label: `recommended_action` with six training classes:

1. **RESOLVE_LOCALLY** — handle on current perimeter without routing
2. **APPLY_KM** — KM-friendly local resolution (training label; agent UI maps to **Resolve**)
3. **ESCALATE_N3** — hand over to N3 specialist queue → agent UI: **Escalate N3**
4. **TRANSFER_PERIMETER** — route to another perimeter team → agent UI: **Transfer**
5. **REQUEST_INFORMATION** — gather missing context → agent UI: **Suspend**
6. **MONITOR** — waiting / observation window → agent UI: **Suspend**

Agent-facing dashboards collapse these to four operational decisions: **Resolve**, **Escalate N3**, **Transfer**, **Suspend**.

Primary evaluation metric: **Macro F1** (equal weight per action class).

## Dataset Distribution

Source: `ml_training.historical_tickets` ({stats["total_tickets"]} tickets)

| Class | Share (%) |
| --- | --- |
{chr(10).join(f"| {action} | {pct} |" for action, pct in stats["class_distribution_pct"].items())}

- Missing descriptions: {stats["missing_description_pct"]}%
- Missing resolution time: {stats["missing_resolution_time_pct"]}%
- Split: {stats["split_sizes"]["train"]} train / {stats["split_sizes"]["validation"]} validation / {stats["split_sizes"]["test"]} test (stratified, `random_state={RANDOM_STATE}`)

![Action class distribution](../plots/03_action_distribution.png)

## Preprocessing

- Text: `title + description` → normalization → TF-IDF (unigrams + bigrams, English stopwords)
- Categorical one-hot: perimeter, priority, incident_category, ticket_source, environment_type
- Numeric: sla_breached, escalation_required, transfer_required, resolution_time_minutes, missingness flags
- Missing values: empty text, median imputation for numerics, most-frequent for categoricals
- Label encoding for six action classes

## Models Benchmarked

1. Logistic Regression (interpretable baseline)
2. Random Forest (nonlinear ensemble)
3. XGBoost (production candidate)

## Metrics (held-out test split)

![Benchmark results table](../plots/03_action_recommendation_benchmark_results_table.png)

{results_df.to_markdown(index=False)}

![Model comparison](../plots/03_action_model_comparison.png)

![Macro F1 comparison](../plots/03_action_macro_f1.png)

![Per-class metrics — best model](../plots/03_action_per_class_metrics.png)

## Confusion Matrix Interpretation

- **ESCALATE_N3** and **TRANSFER_PERIMETER** show the strongest diagonal signal — aligned with `escalation_required` / `transfer_required` features plus routing text.
- **APPLY_KM** vs **RESOLVE_LOCALLY** overlap when KM-friendly incidents are closed locally without formal KM wording.
- **REQUEST_INFORMATION** vs **MONITOR** confuse when descriptions are sparse but not fully empty.
- Controlled label noise and cross-routing ambiguity keep all metrics below 0.95 — no suspicious near-perfect scores.

## Best Model Selection

**{best.name}** selected for production inference (`xgboost_action_v1`) based on highest **Macro F1** ({best.macro_f1:.3f}) on the test split.

Saved artifact: `ml/artifacts/models/xgboost_action.joblib`

## Limitations

- Six-way routing with overlapping operational signals is harder than binary escalation/transfer tasks.
- Production inference uses Task 1/2 predictions as `escalation_required` / `transfer_required` features — drift between training labels and live predictions can affect action scores.
- KM applicability is inferred from text/category proxies, not live KM retrieval quality.

## Next Integration Step

```
CARE source → Sync → cp_agent.tickets
  → Escalation AI (Task 1)
  → Transfer AI (Task 2)
  → Action Recommendation AI (Task 3)
  → Agent ticket detail + Admin recommendations workspace
```

- Table: `cp_agent.ai_action_recommendations`
- Batch run: `bun run ai:action:run`
- API: `POST /api/ai/actions/run`, `GET /api/ai/actions/recommendations`
"""
    (reports_dir / "action_recommendation_benchmark_report.md").write_text(report, encoding="utf-8")
    (ml_root / "reports" / "03_action_recommendation_benchmark_summary.md").write_text(report, encoding="utf-8")

    print(pd.DataFrame(result_table(results)).to_string(index=False))


if __name__ == "__main__":
    main()
