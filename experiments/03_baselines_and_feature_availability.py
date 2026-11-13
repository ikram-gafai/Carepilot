"""E3 - Equal-budget baselines and feature-availability ablation.

For every classification task and two feature sets:
  * original       - the task's CAT_COLUMNS + NUM_COLUMNS from ml/benchmarks/<task>/preprocessing.py
  * creation_time  - only fields available when a ticket is opened (no resolution time, ticket age,
                     other task labels, or the label-derived operational_complexity)
fit, on the original 70/15/15 split:
  Dummy (class prior) | Logistic Regression (C tuned on validation) | Random Forest | XGBoost (original
  hyper-parameters), all sharing ONE preprocessor (TF-IDF 1-2 grams, 3,500 features) so model
  comparisons are not confounded by different text budgets.
A third set (creation_time_base_category) strips the "__ROOT_<cause>" suffix from incident_category for
XGBoost only, to test how much the root-cause annotation contributes.

Reports bootstrap 95% CIs (1,000 resamples of the test set) and paired bootstrap differences.

Usage: python experiments/03_baselines_and_feature_availability.py
"""
from __future__ import annotations

import time

import numpy as np
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier

from common import (
    RANDOM_STATE,
    TASKS,
    binary_metrics,
    bootstrap_ci,
    build_preprocessor,
    encode_target,
    feature_set,
    load_tickets,
    metric_fn,
    multiclass_metrics,
    original_split,
    original_xgb_params,
    paired_bootstrap,
    prepare_common,
    primary_metric,
    write_result,
)

C_GRID = [0.01, 0.1, 1.0, 10.0]


def score(model, task, x):
    if task.kind == "binary":
        return model.predict_proba(x)[:, 1]
    return model.predict(x)


def metrics(task, y, s):
    return binary_metrics(y, s) if task.kind == "binary" else multiclass_metrics(y, s)


def make_pipeline(cat, num, estimator):
    return Pipeline([("preprocessor", build_preprocessor(cat, num)), ("model", estimator)])


def fit_timed(pipe, x, y):
    start = time.perf_counter()
    pipe.fit(x, y)
    return time.perf_counter() - start


def run_task(task, df) -> dict:
    train, val, test = original_split(df, task.target)
    y_train, classes = encode_target(task, train)
    y_val, _ = encode_target(task, val, classes)
    y_test, _ = encode_target(task, test, classes)
    select_metric = "roc_auc" if task.kind == "binary" else "macro_f1"
    select = metric_fn(task, select_metric)
    prim = metric_fn(task, primary_metric(task))
    out: dict = {"classes": [str(c) for c in classes], "n_test": int(len(test)), "feature_sets": {}}
    test_scores: dict[str, np.ndarray] = {}

    for fs in ["original", "creation_time", "creation_time_base_category"]:
        cat, num = feature_set(task, fs)
        cols = ["ticket_text", *cat, *num]
        x_train, x_val, x_test = train[cols], val[cols], test[cols]
        block: dict = {"categorical": cat, "numeric": num, "models": {}}

        candidates: dict[str, Pipeline] = {}
        if fs != "creation_time_base_category":
            candidates["Dummy (prior)"] = make_pipeline(cat, num, DummyClassifier(strategy="prior"))
            # Logistic Regression: C chosen on the validation split.
            best = None
            for c in C_GRID:
                lr = make_pipeline(cat, num, LogisticRegression(C=c, max_iter=4000, class_weight="balanced", solver="liblinear" if task.kind == "binary" else "lbfgs"))
                lr.fit(x_train, y_train)
                val_score = select(y_val, score(lr, task, x_val))
                if best is None or val_score > best[0]:
                    best = (val_score, c)
            block["logistic_regression_selected_C"] = best[1]
            block["logistic_regression_validation_" + select_metric] = best[0]
            candidates["Logistic Regression"] = make_pipeline(
                cat, num, LogisticRegression(C=best[1], max_iter=4000, class_weight="balanced", solver="liblinear" if task.kind == "binary" else "lbfgs")
            )
            candidates["Random Forest"] = make_pipeline(
                cat, num, RandomForestClassifier(n_estimators=300, min_samples_leaf=2, class_weight="balanced_subsample", n_jobs=-1, random_state=RANDOM_STATE)
            )
        params = original_xgb_params(task)
        if task.kind == "binary":
            params["scale_pos_weight"] = float((y_train == 0).sum() / max(1, (y_train == 1).sum()))
        candidates["XGBoost"] = make_pipeline(cat, num, XGBClassifier(**params))

        for name, pipe in candidates.items():
            print(f"[{task.key}/{fs}] {name}", flush=True)
            seconds = fit_timed(pipe, x_train, y_train)
            s = score(pipe, task, x_test)
            test_scores[f"{fs}|{name}"] = s
            entry = {"test": metrics(task, y_test, s), "training_time_s": seconds}
            entry[f"{primary_metric(task)}_ci95"] = bootstrap_ci(y_test, s, prim)
            if task.kind == "binary" and name != "Dummy (prior)":
                entry["roc_auc_ci95"] = bootstrap_ci(y_test, s, metric_fn(task, "roc_auc"))
            block["models"][name] = entry
        out["feature_sets"][fs] = block

    comparisons = {
        "XGBoost vs Logistic Regression (original features)": ("original|XGBoost", "original|Logistic Regression"),
        "XGBoost vs Random Forest (original features)": ("original|XGBoost", "original|Random Forest"),
        "XGBoost vs Logistic Regression (creation-time features)": ("creation_time|XGBoost", "creation_time|Logistic Regression"),
        "XGBoost original minus creation-time features": ("original|XGBoost", "creation_time|XGBoost"),
        "XGBoost creation-time minus base-category-only": ("creation_time|XGBoost", "creation_time_base_category|XGBoost"),
    }
    out["paired_bootstrap"] = {}
    for label, (a, b) in comparisons.items():
        out["paired_bootstrap"][label] = {primary_metric(task): paired_bootstrap(y_test, test_scores[a], test_scores[b], prim)}
        if task.kind == "binary":
            out["paired_bootstrap"][label]["roc_auc"] = paired_bootstrap(y_test, test_scores[a], test_scores[b], metric_fn(task, "roc_auc"))
    return out


def main() -> None:
    raw = load_tickets()
    df = prepare_common(raw)
    out = {"tasks": {task.key: run_task(task, df) for task in TASKS.values()}}
    out["protocol"] = {
        "split": "stratified 70/15/15, random_state=20260525 (identical to ml/benchmarks)",
        "text_features": "TF-IDF word 1-2 grams, english stop words, min_df=3, max_df=0.92, max_features=3500 for every model",
        "threshold": "0.5 on predicted probability for binary F1/precision/recall",
        "lr_selection": "C in {0.01, 0.1, 1, 10} chosen by validation ROC-AUC (binary) or macro-F1 (multiclass)",
        "bootstrap": "1,000 resamples of the test set; paired resamples for differences",
    }
    write_result("03_baselines_and_feature_availability", out, raw)


if __name__ == "__main__":
    main()
