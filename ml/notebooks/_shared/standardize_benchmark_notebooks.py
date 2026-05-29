"""Generate standardized CAREPILOT benchmark notebooks for Chapter 2."""

from __future__ import annotations

import json
from pathlib import Path
from textwrap import dedent

ROOT = Path(__file__).resolve().parents[2]
NOTEBOOKS = ROOT / "notebooks"

SETUP_CODE = dedent(
    """
    from pathlib import Path
    import json
    import subprocess
    import sys

    import matplotlib.pyplot as plt
    import pandas as pd
    from IPython.display import Image, Markdown, display

    NOTEBOOK_DIR = Path.cwd()
    ROOT = NOTEBOOK_DIR
    for parent in [NOTEBOOK_DIR, *NOTEBOOK_DIR.parents]:
        if (parent / "ml" / "artifacts").exists():
            ROOT = parent
            break

    SHARED = ROOT / "ml" / "notebooks" / "_shared"
    if str(SHARED) not in sys.path:
        sys.path.insert(0, str(SHARED))

    from benchmark_notebook_helpers import display_plot, find_project_root, plot_results_table

    ROOT = find_project_root()
    ARTIFACTS = ROOT / "ml" / "artifacts"
    PLOTS = ROOT / "ml" / "plots"
    REPORTS = ROOT / "ml" / "reports"
    MODELS = ARTIFACTS / "models"

    plt.style.use("seaborn-v0_8-whitegrid")
    pd.set_option("display.max_columns", 20)
    pd.set_option("display.float_format", lambda x: f"{x:.4f}")

    RUN_BENCHMARK = False  # Set True to re-train / re-run the full benchmark pipeline
    """
).strip()


def md(text: str) -> dict:
    return {"cell_type": "markdown", "metadata": {}, "source": dedent(text).strip().splitlines(True)}


def code(text: str) -> dict:
    return {
        "cell_type": "code",
        "metadata": {},
        "outputs": [],
        "source": dedent(text).strip().splitlines(True) + ["\n"],
        "execution_count": None,
    }


def code_lines(lines: list[str]) -> dict:
    return {
        "cell_type": "code",
        "metadata": {},
        "outputs": [],
        "source": [f"{line}\n" for line in lines],
        "execution_count": None,
    }


def notebook(cells: list[dict]) -> dict:
    return {
        "nbformat": 4,
        "nbformat_minor": 5,
        "metadata": {
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            "language_info": {"name": "python", "version": "3.11.0"},
        },
        "cells": cells,
    }


def run_benchmark_cell(script_rel: str, extra_args: list[str] | None = None) -> dict:
    args = extra_args or []
    args_literal = repr(args)
    return code(
        f"""
        BENCHMARK_SCRIPT = ROOT / "{script_rel}"
        if RUN_BENCHMARK:
            cmd = [sys.executable, str(BENCHMARK_SCRIPT), "--project-root", str(ROOT), *{args_literal}]
            print("Running:", " ".join(cmd))
            subprocess.run(cmd, check=True)
        else:
            print("Skipping benchmark run (RUN_BENCHMARK=False). Loading saved artifacts.")
            print("Re-run with RUN_BENCHMARK=True or execute:")
            print(f"  python {{BENCHMARK_SCRIPT}} --project-root {{ROOT}}")
        """
    )


def load_metrics_cell(metrics_file: str, table_builder: str) -> dict:
    body = dedent(table_builder).strip()
    lines = [
        f'metrics_path = ARTIFACTS / "{metrics_file}"',
        "if not metrics_path.exists():",
        '    raise FileNotFoundError(f"Missing metrics artifact: {metrics_path}")',
        'payload = json.loads(metrics_path.read_text(encoding="utf-8"))',
        *body.splitlines(),
        "display(results_df)",
    ]
    return code_lines(lines)


def show_table_and_plots_cell(png_name: str, extra_plots: list[str] | None = None) -> dict:
    plots = [png_name, *(extra_plots or [])]
    lines = ['table_png = PLOTS / "' + png_name + '"', "display_plot(table_png)"]
    for p in extra_plots or []:
        lines.append(f'display_plot(PLOTS / "{p}")')
    return code("\n".join(lines))


TASKS: list[dict] = [
    {
        "path": NOTEBOOKS / "escalation" / "03_escalation_benchmark.ipynb",
        "title": "CAREPILOT — Escalation Prediction Benchmark",
        "objective": "Predict whether an operational ITSM ticket requires **escalation to N3** (`escalation_required`) before manual triage.",
        "problem_type": "- **Binary classification**\n- Target: `escalation_required` (0 = no escalation, 1 = escalation required)\n- Primary metrics: F1-score, Recall, ROC-AUC",
        "dataset": dedent(
            """
            - **Source:** `ml_training.historical_tickets` (PostgreSQL training schema)
            - **Records:** 14,000 operational tickets
            - **Target:** `escalation_required`
            - **Main features:** title, description, perimeter, priority, SLA breach flag, resolution time, incident category, operational metadata
            - **Class distribution:** ~18% positive (escalation required), stratified 70/15/15 train/validation/test split
            """
        ),
        "preprocessing": dedent(
            """
            - Text normalization on title and description
            - TF-IDF vectorization (unigrams + bigrams, English stopwords)
            - Categorical one-hot encoding with unknown-category handling
            - Numeric median imputation and standard scaling
            - Missing-value indicators for sparse fields
            """
        ),
        "models": dedent(
            """
            1. **Logistic Regression** — interpretable linear baseline (low-capacity regularization)
            2. **Random Forest** — nonlinear ensemble with shallow trees to limit overfitting
            3. **XGBoost** — gradient boosting candidate with regularization and class weighting
            """
        ),
        "pipeline": dedent(
            """
            ```
            historical_tickets → text + metadata preprocessing → TF-IDF / encoding
                    → stratified split → 5-fold CV (train) → fit models → evaluate on held-out test
            ```
            """
        ),
        "metrics": "Accuracy · Precision · Recall · F1 · ROC-AUC · 5-fold CV accuracy · Training time · Inference time per row",
        "script": "ml/benchmarks/escalation/benchmark.py",
        "metrics_file": "03_escalation_benchmark_metrics.json",
        "table_builder": dedent(
            """
            if isinstance(payload, list):
                results_df = pd.DataFrame(payload)
            else:
                results_df = pd.DataFrame(payload.get("models", payload.get("results", [])))
            if "model" in results_df.columns:
                cols = [c for c in ["model", "accuracy", "precision", "recall", "f1", "roc_auc"] if c in results_df.columns]
                results_df = results_df[cols]
            """
        ),
        "png_table": "03_escalation_benchmark_results_table.png",
        "extra_plots": ["03_model_comparison.png", "03_roc_curves.png", "03_confusion_matrices.png"],
        "interpretation": dedent(
            """
            This benchmark compares three supervised classifiers in order to select the most suitable model for integration into CAREPILOT.

            - **Logistic Regression** provides a transparent baseline but under-recalls escalation cases.
            - **Random Forest** improves recall with moderate precision — a credible middle tier.
            - **XGBoost** achieves the best F1 and ROC-AUC while maintaining strong recall for escalation detection.

            **Trade-off:** higher recall reduces missed escalations but increases supervisor review load. XGBoost offers the best operational balance on the held-out test split.
            """
        ),
        "selected": "**XGBoost** — highest F1 (~0.85) and ROC-AUC (~0.95) on the test split. Production artifact: `ml/artifacts/models/xgboost.joblib`.",
        "limitations": "- Operational ticket wording is noisy and inconsistent\n- Escalation labels depend on historical routing decisions\n- Rare escalation sub-scenarios may be underrepresented\n- Benchmark scope is offline; online drift requires periodic re-evaluation",
        "artifacts": dedent(
            """
            - Models: `ml/artifacts/models/logistic_regression.joblib`, `random_forest.joblib`, `xgboost.joblib`
            - Metrics: `ml/artifacts/03_escalation_benchmark_metrics.json`
            - PNG table: `ml/plots/03_escalation_benchmark_results_table.png`
            - Plots: `03_model_comparison.png`, `03_roc_curves.png`, `03_confusion_matrices.png`
            - Report: `ml/reports/03_escalation_benchmark_summary.md`
            """
        ),
        "footer": "Held-out test split · Binary classification · Target: escalation_required · Dataset: ml_training.historical_tickets (14,000 tickets)",
    },
    {
        "path": NOTEBOOKS / "transfer" / "03_transfer_benchmark.ipynb",
        "title": "CAREPILOT — Transfer Prediction Benchmark",
        "objective": "Predict whether a ticket requires **cross-perimeter transfer** (`transfer_required`) to another operational team.",
        "problem_type": "- **Binary classification**\n- Target: `transfer_required`\n- Primary metrics: F1-score, Recall, ROC-AUC",
        "dataset": dedent(
            """
            - **Source:** `ml_training.historical_tickets`
            - **Records:** 14,000 tickets
            - **Target:** `transfer_required` (~35% positive)
            - **Features:** title, description, perimeter, priority, SLA breach, resolution time, incident category
            """
        ),
        "preprocessing": "Same CAREPILOT text + metadata pipeline as Task 1 (TF-IDF, one-hot, scaling, stratified 70/15/15 split).",
        "models": "Logistic Regression · Random Forest · XGBoost",
        "pipeline": "Identical sklearn pipeline structure to escalation prediction with `transfer_required` as target.",
        "metrics": "Accuracy · Precision · Recall · F1 · ROC-AUC · CV accuracy · Training/inference time",
        "script": "ml/benchmarks/transfer/benchmark.py",
        "metrics_file": "03_transfer_benchmark_metrics.json",
        "table_builder": dedent(
            """
            rows = payload if isinstance(payload, list) else payload.get("results", payload.get("models", []))
            results_df = pd.DataFrame(rows)
            cols = [c for c in ["model", "Model", "accuracy", "Accuracy", "precision", "recall", "f1", "roc_auc", "ROC-AUC"] if c in results_df.columns]
            if cols:
                results_df = results_df[cols]
            """
        ),
        "png_table": "03_transfer_benchmark_results_table.png",
        "extra_plots": ["03_transfer_model_comparison.png", "03_transfer_roc_curves.png", "03_transfer_distribution.png"],
        "interpretation": dedent(
            """
            - **Logistic Regression:** moderate recall (~49%) — explainable but not sufficient for routing.
            - **Random Forest:** balanced precision/recall (~71% F1).
            - **XGBoost:** best F1 (~0.78) and recall (~81%) — minimizes missed transfer candidates.

            Cross-perimeter symptom overlap and inconsistent operator notes create realistic ambiguity in the dataset.
            """
        ),
        "selected": "**XGBoost** — highest F1 and recall. Production: `xgboost_transfer.joblib`.",
        "limitations": "- Misleading transfer wording on locally resolved tickets\n- Perimeter overlap increases false positives\n- Label noise from historical misroutes",
        "artifacts": "- `ml/artifacts/03_transfer_benchmark_metrics.json`\n- `ml/plots/03_transfer_benchmark_results_table.png`\n- `ml/reports/03_transfer_benchmark_summary.md`",
        "footer": "Held-out test split · Target: transfer_required · Dataset: ml_training.historical_tickets",
    },
    {
        "path": NOTEBOOKS / "action_recommendation" / "03_action_recommendation_benchmark.ipynb",
        "title": "CAREPILOT — Action Recommendation Benchmark",
        "objective": "Recommend the **next operational action** (`recommended_action`) an N1/N2 agent should take on a ticket.",
        "problem_type": dedent(
            """
            - **Multiclass classification** (6 operational action classes)
            - Classes: RESOLVE_LOCALLY, APPLY_KM, ESCALATE_N3, TRANSFER_PERIMETER, REQUEST_INFORMATION, MONITOR
            - Primary metric: **Macro F1**
            """
        ),
        "dataset": dedent(
            """
            - **Source:** `ml_training.historical_tickets` (14,000 tickets)
            - **Class distribution:** RESOLVE_LOCALLY 21.8%, APPLY_KM 20.6%, TRANSFER_PERIMETER 17.3%, ESCALATE_N3 16.7%, REQUEST_INFORMATION 13.0%, MONITOR 10.6%
            - **Split:** 9800 train / 2100 validation / 2100 test (stratified)
            """
        ),
        "preprocessing": "Title + description TF-IDF; one-hot categoricals; numeric imputation; label encoding for six action classes.",
        "models": "Logistic Regression · Random Forest · XGBoost",
        "pipeline": "Multiclass sklearn pipelines with Macro F1 selection on held-out test split.",
        "metrics": "Accuracy · Macro/Weighted Precision · Macro/Weighted Recall · Macro F1 · Weighted F1 · Training/inference time",
        "script": "ml/benchmarks/action_recommendation/benchmark.py",
        "metrics_file": "03_action_recommendation_benchmark_metrics.json",
        "table_builder": """
            rows = payload.get("results", [])
            results_df = pd.DataFrame(rows)
            """,
        "png_table": "03_action_recommendation_benchmark_results_table.png",
        "extra_plots": ["03_action_distribution.png", "03_action_model_comparison.png", "03_action_macro_f1.png"],
        "interpretation": dedent(
            """
            XGBoost achieves the highest Macro F1 (~0.66), balancing performance across all six action classes. Logistic Regression remains interpretable but underperforms on minority classes. Random Forest sits between both.

            Macro F1 ensures rare actions (MONITOR, REQUEST_INFORMATION) contribute equally to model selection — critical for enterprise action routing fairness.
            """
        ),
        "selected": "**XGBoost** — best Macro F1. Artifact: `ml/artifacts/models/xgboost_action.joblib`.",
        "limitations": "- Action labels reflect historical operator decisions, not always optimal\n- Class imbalance affects minority action recall\n- Combined routing depends on Tasks 1–2 predictions in production",
        "artifacts": "- `ml/artifacts/03_action_recommendation_benchmark_metrics.json`\n- `ml/plots/03_action_recommendation_benchmark_results_table.png`\n- `ml/reports/03_action_recommendation_benchmark_summary.md`",
        "footer": "Multiclass classification · Target: recommended_action (6 classes) · Dataset: ml_training.historical_tickets",
    },
    {
        "path": NOTEBOOKS / "sla_prediction" / "03_sla_benchmark.ipynb",
        "title": "CAREPILOT — SLA Breach Prediction Benchmark",
        "objective": "Predict whether a ticket is likely to **violate SLA** before resolution (`sla_breached`).",
        "problem_type": "- **Binary classification**\n- Target: `sla_breached` (~32% positive)\n- Primary metrics: F1, ROC-AUC, Recall",
        "dataset": dedent(
            """
            - **Source:** `ml_training.historical_tickets` (14,000 tickets)
            - **Features:** title, description, perimeter, priority, escalation/transfer flags, ticket age, queue load, resolution time
            - **Positive rate:** 31.82% SLA breached
            """
        ),
        "preprocessing": "Text normalization, TF-IDF, one-hot encoding, numeric scaling, missingness indicators, stratified split.",
        "models": "Logistic Regression · Random Forest · XGBoost",
        "pipeline": "Binary classification pipeline with SLA breach as proactive risk signal for supervision.",
        "metrics": "Accuracy · Precision · Recall · F1 · ROC-AUC · Training/inference time",
        "script": "ml/benchmarks/sla_prediction/benchmark.py",
        "metrics_file": "03_sla_prediction_benchmark_metrics.json",
        "table_builder": dedent(
            """
            rows = payload.get("results", payload) if isinstance(payload, dict) else payload
            results_df = pd.DataFrame(rows if isinstance(rows, list) else payload.get("models", []))
            """
        ),
        "png_table": "03_sla_benchmark_results_table.png",
        "extra_plots": ["03_sla_distribution.png", "03_sla_model_comparison.png", "03_sla_roc_curves.png"],
        "interpretation": "XGBoost delivers the strongest SLA breach detection balance. SLA breach is not perfectly correlated with priority or escalation — the model must learn composite operational signals.",
        "selected": "**XGBoost** for production SLA risk scoring. Artifact: `ml/artifacts/models/xgboost_sla.joblib`.",
        "limitations": "- SLA definitions vary by perimeter and contract\n- Resolution time missing for ~41% of tickets\n- Proactive alerts require threshold tuning in production",
        "artifacts": "- `ml/artifacts/03_sla_prediction_benchmark_metrics.json`\n- `ml/plots/03_sla_benchmark_results_table.png`\n- `ml/reports/03_sla_prediction_benchmark_summary.md`",
        "footer": "Binary classification · Target: sla_breached · Dataset: ml_training.historical_tickets",
    },
    {
        "path": NOTEBOOKS / "priority_prediction" / "03_priority_benchmark.ipynb",
        "title": "CAREPILOT — Priority Prediction Benchmark",
        "objective": "Predict operational ticket **priority level** (`P1`–`P4`) before manual triage.",
        "problem_type": "- **Multiclass classification** (4 priority levels)\n- Primary metric: **Macro F1**",
        "dataset": dedent(
            """
            - **Source:** `ml_training.historical_tickets` (14,000 tickets)
            - **Class distribution:** P3 41.8%, P2 27.0%, P4 16.0%, P1 15.3%
            - **Split:** 9800 / 2100 / 2100 (stratified)
            """
        ),
        "preprocessing": "TF-IDF on ticket text, categorical encoding, numeric scaling. Priority excluded from features to avoid leakage.",
        "models": "Logistic Regression · Random Forest · XGBoost",
        "pipeline": "Multiclass sklearn pipelines evaluated with Macro F1 on held-out test tickets.",
        "metrics": "Accuracy · Macro/Weighted Precision · Macro/Weighted Recall · Macro F1 · Weighted F1",
        "script": "ml/benchmarks/priority_prediction/benchmark.py",
        "metrics_file": "03_priority_prediction_benchmark_metrics.json",
        "table_builder": "results_df = pd.DataFrame(payload.get('results', []))",
        "png_table": "03_priority_benchmark_results_table.png",
        "extra_plots": ["03_priority_distribution.png", "03_priority_model_comparison.png", "03_priority_macro_f1.png"],
        "interpretation": "XGBoost achieves Macro F1 ~0.83, clearly outperforming linear and forest baselines. P3 dominance in the dataset makes Macro F1 essential for fair evaluation across P1–P4.",
        "selected": "**XGBoost** — best Macro F1. Artifact: `ml/artifacts/models/xgboost_priority.joblib`.",
        "limitations": "- Priority labels may reflect subjective triage\n- P1/P4 minority classes harder to classify\n- Should be combined with SLA and escalation signals in operations",
        "artifacts": "- `ml/artifacts/03_priority_prediction_benchmark_metrics.json`\n- `ml/plots/03_priority_benchmark_results_table.png`\n- `ml/reports/03_priority_prediction_benchmark_summary.md`",
        "footer": "Multiclass classification · Target: priority (P1–P4) · Dataset: ml_training.historical_tickets",
    },
    {
        "path": NOTEBOOKS / "km_recommendation" / "03_km_retrieval_benchmark.ipynb",
        "title": "CAREPILOT — KM Recommendation Benchmark",
        "objective": "Recommend the most relevant **Knowledge Management (KM) procedure** for an operational ticket using NLP retrieval.",
        "problem_type": "- **Semantic / lexical retrieval** (not classification)\n- Output: top-3 KM procedures with similarity scores",
        "dataset": dedent(
            """
            - **KM corpus:** `ml_training.km_articles` (~102 articles)
            - **Queries:** held-out tickets from `ml_training.historical_tickets`
            - **Ground truth:** `expected_km_id` + `relevant_km_ids` (multi-relevant evaluation)
            """
        ),
        "preprocessing": dedent(
            """
            - Case normalization, punctuation cleanup, stopword removal (lexical methods)
            - Synonym expansion for operational shorthand (POS, SCO, EMV, VLAN)
            - Ticket text: title + description + perimeter + category + keywords
            - KM text: title + procedure steps + keywords + metadata
            """
        ),
        "models": dedent(
            """
            1. **TF-IDF + Cosine Similarity** — lexical baseline
            2. **BM25** — stronger sparse retrieval for short operational queries
            3. **Sentence Transformers (`all-MiniLM-L6-v2`)** — semantic embeddings with hybrid reranking
            """
        ),
        "pipeline": "Index KM corpus → encode ticket query → rank articles → evaluate top-K hits against ground-truth KM ids.",
        "metrics": "Precision@1 · Precision@3 · Recall@3 · MRR · nDCG@3 · Average retrieval time (ms)",
        "script": "ml/benchmarks/km_recommendation/benchmark.py",
        "metrics_file": "metrics/km_retrieval_benchmark_metrics.json",
        "table_builder": dedent(
            """
            rows = payload.get("results", payload.get("methods", []))
            results_df = pd.DataFrame(rows)
            """
        ),
        "png_table": "03_km_benchmark_results_table.png",
        "extra_plots": ["03_km_method_comparison.png", "03_km_precision_at_k.png", "03_km_mrr_ndcg.png"],
        "interpretation": dedent(
            """
            Sentence Transformers achieve the highest P@1 (~0.93) and nDCG@3 by capturing paraphrased store wording. BM25 outperforms TF-IDF on short queries. Lexical methods remain useful baselines with lower latency (~2–3 ms vs ~42 ms).
            """
        ),
        "selected": "**Sentence Transformers** — best retrieval quality. Artifact: `ml/artifacts/models/km_retrieval_minilm.joblib`.",
        "limitations": "- Ambiguous incidents may have multiple valid KM procedures\n- Corpus coverage depends on CARE KM sync\n- Embedding latency higher than lexical search",
        "artifacts": "- `ml/artifacts/metrics/km_retrieval_benchmark_metrics.json`\n- `ml/plots/03_km_benchmark_results_table.png`\n- `ml/reports/03_km_recommendation_benchmark_summary.md`",
        "footer": "Retrieval benchmark · KM corpus: ml_training.km_articles · Queries: held-out test tickets",
    },
    {
        "path": NOTEBOOKS / "missing_information_detection" / "03_missing_information_benchmark.ipynb",
        "title": "CAREPILOT — Missing Information Detection Benchmark",
        "objective": "Detect **missing operational information** in tickets (multilabel) and compute completeness / quality scores before escalation or transfer.",
        "problem_type": dedent(
            """
            - **Multilabel classification** (12 canonical missing-field types)
            - Outputs: `missing_fields[]`, completeness score, quality level (COMPLETE / ADEQUATE / INCOMPLETE / POOR)
            """
        ),
        "dataset": dedent(
            """
            - **Source:** `ml_training.historical_tickets` (14,000 tickets)
            - **Labels:** 12 missing-information types (e.g. MISSING_LANE_NUMBER, VAGUE_DESCRIPTION)
            - **Quality distribution:** COMPLETE 33.5%, partial 59.8%, POOR 6.7%
            - **Average completeness:** 77.7%
            """
        ),
        "preprocessing": "Lowercase normalization, TF-IDF (1–2 grams), handcrafted pattern features (error codes, lane/register, timestamps), multilabel binarization.",
        "models": dedent(
            """
            1. **Rule-Based Detector** — interpretable enterprise baseline
            2. **Logistic Regression One-vs-Rest** — lightweight multilabel ML
            3. **Random Forest One-vs-Rest** — nonlinear multilabel model
            """
        ),
        "pipeline": "Pattern + TF-IDF features → multilabel prediction → completeness score aggregation → quality level assignment.",
        "metrics": "Micro/Macro Precision · Micro/Macro Recall · Micro/Macro F1 · Hamming Loss · Exact Match Ratio",
        "script": "ml/benchmarks/missing_information_detection/benchmark.py",
        "metrics_file": "03_missing_information_benchmark_metrics.json",
        "table_builder": """
            rows = payload.get("models", [])
            results_df = pd.DataFrame(rows)
            if "name" in results_df.columns:
                results_df = results_df.rename(columns={"name": "Method"})
            display_cols = [c for c in ["Method", "micro_f1", "macro_f1", "hamming_loss", "exact_match_ratio"] if c in results_df.columns]
            if display_cols:
                results_df = results_df[display_cols]
            """,
        "png_table": "03_missing_information_benchmark_results_table.png",
        "extra_plots": ["03_missing_information_model_comparison.png", "03_missing_information_per_label_f1.png"],
        "interpretation": dedent(
            """
            **Rule-Based Detector** selected for production: competitive Micro F1 (~0.60), zero training cost, fast inference, full explainability. Macro F1 is lower due to rare labels (MISSING_STORE_IDENTIFIER, MISSING_PAYMENT_REFERENCE) — expected in multilabel enterprise data.
            """
        ),
        "selected": "**Rule-Based Detector** — best operational trade-off (explainability + latency + Micro F1).",
        "limitations": "- Rare labels drive Macro F1 down\n- Ground-truth labels include operator ambiguity\n- Rule thresholds require periodic calibration",
        "artifacts": "- `ml/artifacts/03_missing_information_benchmark_metrics.json`\n- `ml/plots/03_missing_information_benchmark_results_table.png`\n- `ml/reports/03_missing_information_detection_summary.md`",
        "footer": "Multilabel detection · 12 missing-information labels · Dataset: ml_training.historical_tickets",
    },
    {
        "path": NOTEBOOKS / "llm_explanation" / "02_llm_benchmark.ipynb",
        "title": "CAREPILOT — LLM Operational Explanation Benchmark",
        "objective": "Generate concise **enterprise ITSM explanations** from aggregated CAREPILOT AI signals (Tasks 1–8) using a local LLM (Ollama).",
        "problem_type": "- **LLM qualitative evaluation** (not classification)\n- Rubric-based scoring on clarity, relevance, completeness, hallucination control, latency",
        "dataset": dedent(
            """
            - **Evaluation set:** 50 representative operational scenarios (escalation, transfer, SLA, KM, missing info, local resolution)
            - **Input:** ticket context block + aggregated AI prediction signals
            - **Output:** numbered sections (summary, action, reasoning, missing info, next steps)
            """
        ),
        "preprocessing": "Structured context assembly from ticket fields and AI outputs; enterprise system prompt; temperature 0.15; max ~420 tokens.",
        "models": "Mistral · Llama3 · DeepSeek R1 (via Ollama, local inference)",
        "pipeline": "AI signals → prompt template → Ollama `/api/generate` → parse sections → rubric scoring + hallucination flag.",
        "metrics": "Clarity · Operational Relevance · Completeness · Hallucination Control · Average Latency (ms) · Overall Score (1–5)",
        "script": "ml/benchmarks/llm_explanation/benchmark.py",
        "metrics_file": "03_llm_explanation_benchmark_metrics.json",
        "table_builder": dedent(
            """
            rows = payload.get("results", [])
            results_df = pd.DataFrame(rows)
            rename = {"model": "Model", "relevance": "Operational Relevance", "avg_latency_ms": "Avg Latency (ms)", "overall": "Overall Score"}
            results_df = results_df.rename(columns=rename)
            cols = [c for c in ["Model", "clarity", "Operational Relevance", "completeness", "hallucination_control", "Avg Latency (ms)", "Overall Score"] if c in results_df.columns]
            if cols:
                results_df = results_df[cols]
            """
        ),
        "png_table": "03_llm_explanation_benchmark_results_table.png",
        "extra_plots": [],
        "interpretation": dedent(
            """
            Mistral and Llama3 tie on overall quality (~4.07). Mistral is ~18% faster and uses a smaller footprint. DeepSeek R1 scores lower with higher latency. All models achieve 0% hallucination rate under automated rubric checks with the strict context-only prompt.
            """
        ),
        "selected": "**Mistral** (`OLLAMA_EXPLANATION_MODEL=mistral`) — best latency/quality trade-off for production.",
        "limitations": "- Latency depends on local hardware (CPU/GPU)\n- Qualitative rubric is automated — human review recommended\n- Template fallback available when Ollama is offline",
        "artifacts": "- `ml/artifacts/03_llm_explanation_benchmark_metrics.json`\n- `ml/plots/03_llm_explanation_benchmark_results_table.png`\n- `ml/reports/03_llm_operational_explanation_summary.md`",
        "footer": "50 evaluation tickets · Live Ollama inference · Qualitative rubric (1–5)",
        "run_note": "Requires Ollama running locally. Set RUN_BENCHMARK=True only when Ollama is available.",
    },
]


def build_cells(task: dict) -> list[dict]:
    cells = [
        md(f"# {task['title']}\n\n*Chapter 2 — État de l'art et benchmarking IA · CAREPILOT operational AI*"),
        md(f"## 1. Objective\n\n{task['objective']}"),
        md(f"## 2. Problem Type\n\n{task['problem_type']}"),
        md(f"## 3. Dataset Description\n\n{task['dataset']}"),
        md(f"## 4. Preprocessing\n\n{task['preprocessing']}"),
        md(f"## 5. Models / Methods Compared\n\n{task['models']}\n\nThis benchmark compares multiple approaches in order to select the most suitable method for integration into CAREPILOT."),
        md(f"## 6. Evaluation Metrics\n\n{task['metrics']}"),
        md(f"## 7. Training or Retrieval Pipeline\n\n{task['pipeline']}"),
        code(SETUP_CODE),
        run_benchmark_cell(task["script"]),
        md("## 8. Benchmark Execution — Load Results"),
        load_metrics_cell(task["metrics_file"], task["table_builder"]),
        md("## 9. Benchmark Results\n\nFinal comparison table (report-ready PNG + DataFrame):"),
        show_table_and_plots_cell(task["png_table"], task.get("extra_plots")),
        md("## 10. Visualizations\n\nKey plots are loaded from `ml/plots/` (generated by the benchmark pipeline). Re-run with `RUN_BENCHMARK=True` to regenerate."),
        md(f"## 11. Interpretation\n\n{task['interpretation']}"),
        md(f"## 12. Selected Model / Method\n\n**Selected for CAREPILOT:**\n\n{task['selected']}"),
        md(f"## 13. Limitations\n\n{task['limitations']}"),
        md(f"## 14. Generated Artifacts\n\n{task['artifacts']}"),
    ]
    if task.get("run_note"):
        cells.insert(12, md(f"> **Note:** {task['run_note']}"))
    return cells


def main() -> None:
    for task in TASKS:
        path = task["path"]
        path.parent.mkdir(parents=True, exist_ok=True)
        nb = notebook(build_cells(task))
        path.write_text(json.dumps(nb, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Wrote {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
