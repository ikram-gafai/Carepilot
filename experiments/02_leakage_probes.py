"""E2 - Leakage probes.

(a) Can a label be recovered from post-outcome / label-derived fields alone?
    - SLA: the generator computes ticket_age_minutes from resolution_time_minutes with a multiplier that
      depends on sla_breached (lib/ml-training/dataset-generator.ts). A one-line ratio rule is tested.
    - Single-feature ROC-AUC of every post-outcome numeric field for each binary target.
    - Action: purity of recommended_action given (escalation_required, transfer_required).
(b) Train/test text overlap under the original random 70/15/15 split (near-duplicate memorisation risk).

Usage: python experiments/02_leakage_probes.py
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import roc_auc_score

from common import TASKS, clean_text, load_tickets, original_split, prepare_common, write_result

POST_OUTCOME_NUMERIC = ["resolution_time_minutes", "ticket_age_minutes", "operational_complexity", "resolution_time_missing"]
LABEL_FEATURES = ["sla_breached", "escalation_required", "transfer_required"]


def directional_auc(y: np.ndarray, x: pd.Series) -> dict:
    filled = x.fillna(x.median()).to_numpy(dtype=float)
    auc = roc_auc_score(y, filled)
    return {"auc": auc, "auc_direction_free": max(auc, 1 - auc), "missing_rate": float(x.isna().mean())}


def sla_ratio_probe(df: pd.DataFrame) -> dict:
    both = df["resolution_time_minutes"].notna() & df["ticket_age_minutes"].notna()
    sub = df[both]
    ratio = sub["ticket_age_minutes"] / sub["resolution_time_minutes"]
    y = sub["sla_breached"].to_numpy()
    rule = (ratio >= 0.64).astype(int).to_numpy()
    # Best single threshold on the ratio (upper bound for a 1-feature rule).
    thresholds = np.quantile(ratio, np.linspace(0.01, 0.99, 197))
    accs = [((ratio >= t).astype(int).to_numpy() == y).mean() for t in thresholds]
    return {
        "rows_with_both_fields": int(both.sum()),
        "coverage_of_dataset": float(both.mean()),
        "rule": "predict breach iff ticket_age_minutes / resolution_time_minutes >= 0.64",
        "rule_accuracy_on_covered_rows": float((rule == y).mean()),
        "best_threshold": float(thresholds[int(np.argmax(accs))]),
        "best_threshold_accuracy": float(np.max(accs)),
        "ratio_roc_auc": float(roc_auc_score(y, ratio)),
        "positive_rate_on_covered_rows": float(y.mean()),
    }


def action_purity(df: pd.DataFrame) -> dict:
    table = pd.crosstab([df["escalation_required"], df["transfer_required"]], df["recommended_action"], normalize="index")
    counts = df.groupby(["escalation_required", "transfer_required"]).size()
    rows = {}
    for (esc, tr), dist in table.iterrows():
        rows[f"escalation={esc},transfer={tr}"] = {
            "n": int(counts.loc[(esc, tr)]),
            "majority_action": str(dist.idxmax()),
            "majority_share": float(dist.max()),
            "distribution": {str(k): float(v) for k, v in dist.items() if v > 0},
        }
    # Accuracy of predicting the action from the two flags alone (majority per cell), in-sample.
    majority = table.idxmax(axis=1)
    pred = [majority.loc[(e, t)] for e, t in zip(df["escalation_required"], df["transfer_required"])]
    return {"cells": rows, "in_sample_accuracy_from_two_flags": float((np.asarray(pred) == df["recommended_action"].to_numpy()).mean())}


def text_overlap(df: pd.DataFrame, target: str) -> dict:
    train, _, test = original_split(df, target)
    norm_title = lambda s: s.map(clean_text)  # noqa: E731
    train_titles = set(norm_title(train["title"]))
    train_desc = set(d for d in norm_title(train["description"]) if d)
    test_desc = norm_title(test["description"])
    vec = TfidfVectorizer(ngram_range=(1, 2), min_df=1, sublinear_tf=True).fit(train["ticket_text"])
    a, b = vec.transform(test["ticket_text"]), vec.transform(train["ticket_text"])
    nn = np.asarray((a @ b.T).max(axis=1).todense()).ravel()
    return {
        "unique_titles_in_dataset": int(df["title"].map(clean_text).nunique()),
        "test_title_seen_in_train": float(norm_title(test["title"]).isin(train_titles).mean()),
        "test_description_seen_in_train": float(test_desc[test_desc != ""].isin(train_desc).mean()),
        "nearest_train_cosine": {
            "median": float(np.median(nn)),
            "p10": float(np.percentile(nn, 10)),
            "share_ge_0.8": float((nn >= 0.8).mean()),
            "share_ge_0.95": float((nn >= 0.95).mean()),
        },
        "same_similar_case_group_in_train": float(test["similar_case_group_id"].isin(set(train["similar_case_group_id"])).mean()),
        "same_store_in_train": float(test["store_id"].isin(set(train["store_id"])).mean()),
    }


def main() -> None:
    raw = load_tickets()
    df = prepare_common(raw)
    out: dict = {"sla_ratio_rule": sla_ratio_probe(df), "single_feature_auc": {}, "action_given_routing_flags": action_purity(df)}
    for target in ["escalation_required", "transfer_required", "sla_breached"]:
        y = df[target].to_numpy()
        features = POST_OUTCOME_NUMERIC + [f for f in LABEL_FEATURES if f != target]
        out["single_feature_auc"][target] = {f: directional_auc(y, df[f].astype(float)) for f in features}
    out["operational_complexity_by_label"] = {
        f"escalation={e},transfer={t}": float(g["operational_complexity"].mean())
        for (e, t), g in df.groupby(["escalation_required", "transfer_required"])
    }
    out["text_overlap_original_split"] = {task.key: text_overlap(df, task.target) for task in TASKS.values()}
    write_result("02_leakage_probes", out, raw)


if __name__ == "__main__":
    main()
