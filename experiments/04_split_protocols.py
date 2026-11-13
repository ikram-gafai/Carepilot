"""E4 - Generalisation under group-disjoint splits.

The committed benchmarks use a random stratified split, so near-identical tickets from the same
incident group (similar_case_group_id) and the same store appear on both sides. This experiment
compares, with creation-time features only:
  random            - stratified 85/15 (3 seeds)
  case_group_disjoint - GroupShuffleSplit on similar_case_group_id, 15% of groups held out (3 seeds)
  store_disjoint    - GroupShuffleSplit on store_id, 15% of stores held out (3 seeds)
Models: XGBoost (original hyper-parameters) and Logistic Regression (C=1, balanced).

Usage: python experiments/04_split_protocols.py
"""
from __future__ import annotations

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GroupShuffleSplit, train_test_split
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier

from common import (
    RANDOM_STATE,
    TASKS,
    binary_metrics,
    build_preprocessor,
    encode_target,
    feature_set,
    load_tickets,
    multiclass_metrics,
    original_xgb_params,
    prepare_common,
    write_result,
)

SEEDS = [RANDOM_STATE, RANDOM_STATE + 1, RANDOM_STATE + 2]
TEST_SIZE = 0.15


def splits(df, protocol, target, seed):
    if protocol == "random":
        train, test = train_test_split(df, test_size=TEST_SIZE, random_state=seed, stratify=df[target])
        return train, test
    groups = df["similar_case_group_id" if protocol == "case_group_disjoint" else "store_id"]
    train_idx, test_idx = next(GroupShuffleSplit(n_splits=1, test_size=TEST_SIZE, random_state=seed).split(df, groups=groups))
    return df.iloc[train_idx], df.iloc[test_idx]


def evaluate(task, df) -> dict:
    cat, num = feature_set(task, "creation_time")
    cols = ["ticket_text", *cat, *num]
    _, classes = encode_target(task, df)
    out: dict = {}
    for protocol in ["random", "case_group_disjoint", "store_disjoint"]:
        runs = {"XGBoost": [], "Logistic Regression": []}
        sizes = []
        for seed in SEEDS:
            train, test = splits(df, protocol, task.target, seed)
            y_train, _ = encode_target(task, train, classes)
            y_test, _ = encode_target(task, test, classes)
            if len(np.unique(y_train)) < len(classes):
                continue
            sizes.append({"train": len(train), "test": len(test), "test_stores": int(test["store_id"].nunique()), "test_groups": int(test["similar_case_group_id"].nunique())})
            params = original_xgb_params(task)
            params["random_state"] = seed
            if task.kind == "binary":
                params["scale_pos_weight"] = float((y_train == 0).sum() / max(1, (y_train == 1).sum()))
            models = {
                "XGBoost": XGBClassifier(**params),
                "Logistic Regression": LogisticRegression(C=1.0, max_iter=4000, class_weight="balanced", solver="liblinear" if task.kind == "binary" else "lbfgs"),
            }
            for name, estimator in models.items():
                print(f"[{task.key}/{protocol}/seed={seed}] {name}", flush=True)
                pipe = Pipeline([("preprocessor", build_preprocessor(cat, num)), ("model", estimator)]).fit(train[cols], y_train)
                if task.kind == "binary":
                    runs[name].append(binary_metrics(y_test, pipe.predict_proba(test[cols])[:, 1]))
                else:
                    runs[name].append(multiclass_metrics(y_test, pipe.predict(test[cols])))
        summary = {}
        for name, results in runs.items():
            keys = results[0].keys()
            summary[name] = {k: {"mean": float(np.mean([r[k] for r in results])), "std": float(np.std([r[k] for r in results], ddof=1)) if len(results) > 1 else 0.0} for k in keys}
            summary[name]["n_repeats"] = len(results)
        out[protocol] = {"split_sizes": sizes, "models": summary}
    return out


def main() -> None:
    raw = load_tickets()
    df = prepare_common(raw).reset_index(drop=True)
    out = {
        "protocol": {"features": "creation_time (see common.py)", "test_size": TEST_SIZE, "seeds": SEEDS},
        "group_counts": {"similar_case_group_id": int(df["similar_case_group_id"].nunique()), "store_id": int(df["store_id"].nunique())},
        "tasks": {task.key: evaluate(task, df) for task in TASKS.values()},
    }
    write_result("04_split_protocols", out, raw)


if __name__ == "__main__":
    main()
