"""Print the Markdown result tables used in the root README, straight from experiments/results/*.json.

Re-run after the experiments to check that every number in the README matches an artifact:
    python experiments/make_tables.py > /tmp/tables.md && diff <(grep '^|' /tmp/tables.md) <(grep '^|' README.md)
"""
from __future__ import annotations

import json

from common import RESULTS

TASK_NAMES = {"escalation": "Escalation", "transfer": "Transfer", "sla": "SLA breach", "priority": "Priority", "action": "Action"}


def load(name: str) -> dict:
    return json.loads((RESULTS / f"{name}.json").read_text(encoding="utf-8"))


def f(x, digits: int = 3) -> str:
    return "–" if x is None else f"{x:.{digits}f}"


def ci(pair) -> str:
    return f"[{pair[0]:.3f}, {pair[1]:.3f}]"


def table(header: list[str], rows: list[list[str]]) -> str:
    out = ["| " + " | ".join(header) + " |", "| " + " | ".join("---" if i == 0 else "---:" for i in range(len(header))) + " |"]
    out += ["| " + " | ".join(r) + " |" for r in rows]
    return "\n".join(out)


def e1() -> str:
    d = load("01_reproduction")["tasks"]
    rows = []
    for t, e in d.items():
        key = "f1" if "f1" in e["reproduced"]["XGBoost"] else "macro_f1"
        for model in ["Logistic Regression", "Random Forest", "XGBoost"]:
            rep, now = e["reported"][model], e["reproduced"][model]
            auc_rep = f(rep.get("roc_auc")) if key == "f1" else "–"
            auc_now = f(now.get("roc_auc")) if key == "f1" else "–"
            rows.append([TASK_NAMES[t], model, "F1" if key == "f1" else "macro-F1", f(rep[key]), f(now[key]), f"{round(now[key] - rep[key], 3) + 0.0:+.3f}".replace("-", "−"), auc_rep, auc_now])
    s = table(["Task", "Model", "Metric", "Reported", "Re-run at HEAD", "Δ", "ROC-AUC reported", "ROC-AUC re-run"], rows)
    rows = []
    for t, e in d.items():
        c = e["committed_artifact"]
        key = "f1" if "f1" in c else "macro_f1"
        rows.append([TASK_NAMES[t], f"`{c['file']}`", f(c[key]), f(c.get("roc_auc")) if key == "f1" else "–", f(e["reproduced"]["XGBoost"][key])])
    s += "\n\n" + table(["Task", "Committed artifact", "F1 / macro-F1 on current test split", "ROC-AUC", "Freshly trained XGBoost (same split)"], rows)
    return s


def e3() -> str:
    d = load("03_baselines_and_feature_availability")["tasks"]
    rows = []
    for t, e in d.items():
        for fs, label in [("original", "original"), ("creation_time", "creation-time")]:
            models = e["feature_sets"][fs]["models"]
            key = "f1" if "f1" in models["XGBoost"]["test"] else "macro_f1"
            cells = [TASK_NAMES[t], label]
            for m in ["Dummy (prior)", "Logistic Regression", "Random Forest", "XGBoost"]:
                v = models[m]
                cells.append(f"{f(v['test'][key])} {ci(v[key + '_ci95'])}" if m != "Dummy (prior)" else f(v["test"][key]))
            if key == "f1":
                cells.append(f"{f(models['XGBoost']['test']['roc_auc'])} {ci(models['XGBoost']['roc_auc_ci95'])}")
            else:
                cells.append("–")
            rows.append(cells)
    return table(["Task", "Features", "Dummy", "Logistic Reg. (tuned C)", "Random Forest", "XGBoost", "XGBoost ROC-AUC"], rows)


def e3_paired() -> str:
    d = load("03_baselines_and_feature_availability")["tasks"]
    rows = []
    for t, e in d.items():
        for label, res in e["paired_bootstrap"].items():
            key = "f1" if "f1" in res else "macro_f1"
            r = res[key]
            p = r["bootstrap_p_two_sided"]
            rows.append([TASK_NAMES[t], label, f"{r['observed_diff']:+.3f}", ci(r["ci95"]), "< 0.002" if p == 0 else f(p)])
    return table(["Task", "Comparison", "Δ F1 / macro-F1", "95% CI", "bootstrap p"], rows)


def e3_root_cause() -> str:
    d = load("03_baselines_and_feature_availability")["tasks"]
    rows = []
    for t, e in d.items():
        m = e["feature_sets"]["creation_time_base_category"]["models"]["XGBoost"]
        key = "f1" if "f1" in m["test"] else "macro_f1"
        full = e["feature_sets"]["creation_time"]["models"]["XGBoost"]["test"][key]
        rows.append([TASK_NAMES[t], f(full), f(m["test"][key]), f"{m['test'][key] - full:+.3f}"])
    return table(["Task", "creation-time (category with `__ROOT_` suffix)", "base category only", "Δ"], rows)


def e4() -> str:
    d = load("04_split_protocols")["tasks"]
    rows = []
    for t, e in d.items():
        for model in ["XGBoost", "Logistic Regression"]:
            cells = [TASK_NAMES[t], model]
            for p in ["random", "case_group_disjoint", "store_disjoint"]:
                m = e[p]["models"][model]
                key = "f1" if "f1" in m else "macro_f1"
                cells.append(f"{m[key]['mean']:.3f} ± {m[key]['std']:.3f}")
            rows.append(cells)
    return table(["Task", "Model", "Random split", "Unseen incident groups", "Unseen stores"], rows)


def e5() -> str:
    d = load("05_retrieval_ablation")
    rows = []
    names = {
        "A_as_benchmarked": "A. HEAD code: query + corpus include resolution summary",
        "B_realistic_query": "B. new-ticket query (no resolution summary), resolved corpus",
        "C_no_resolution_text": "C. no resolution summary on either side",
        "D_report_text_with_group_metadata": "D. A + group metadata (text described in the committed report)",
    }
    for p, label in names.items():
        for method in ["tfidf", "bm25"]:
            r = d["results"][p][method]
            rows.append([label, "TF-IDF" if method == "tfidf" else "BM25", f(r.get("precision_at_1")), f(r.get("precision_at_3")), f(r.get("mrr")), f(r.get("ndcg_at_3")), f(r.get("top1_same_base_category")), f(r.get("avg_retrieval_time_ms"), 1)])
    return table(["Protocol", "Method", "P@1", "P@3", "MRR", "nDCG@3", "Top-1 same category", "ms/query"], rows)


def e6() -> str:
    d = load("06_inference_robustness")["tasks"]
    cases = list(next(iter(d.values())).keys())
    rows = []
    for c in cases:
        cells = [c.replace("_", " ")]
        for t in d:
            r = d[t][c]
            if c.startswith("determinism"):
                cells.append("identical" if r["identical_outputs"] else "DIFFERENT")
            elif r.get("ok"):
                cells.append(f"ok ({r['latency_ms'] / 1000:.1f}s)")
            else:
                cells.append(f"error (exit {r['exit_code']})")
        rows.append(cells)
    return table(["Case", *[TASK_NAMES[t] for t in d]], rows)


def e7() -> str:
    d = load("07_llm_rubric_audit")
    rows = [[f"{m} (reported, live LLM)", f(s["clarity"], 2), f(s["relevance"], 2), f(s["completeness"], 2), "–", f(s["hallucination_control"], 2), f(s["overall"], 2), "–"] for m, s in d["reported_llm_scores"].items()]
    for name, s in d["strategies"].items():
        m = s["mean_scores"]
        rows.append([name.replace("_", " "), f(m["clarity"], 2), f(m["relevance"], 2), f(m["completeness"], 2), f(m["consistency"], 2), f(m["hallucination_control"], 2), f(m["overall"], 2), f"{s['hallucination_flag_rate']:.0%}"])
    return table(["Response source", "Clarity", "Relevance", "Completeness", "Consistency", "Halluc. control", "Overall", "Halluc. flag rate"], rows)


if __name__ == "__main__":
    for title, fn in [("E1", e1), ("E3", e3), ("E3 paired", e3_paired), ("E3 root cause", e3_root_cause), ("E4", e4), ("E5", e5), ("E6", e6), ("E7", e7)]:
        try:
            print(f"### {title}\n\n{fn()}\n")
        except FileNotFoundError as exc:
            print(f"### {title}\n\n(missing: {exc.filename})\n")
