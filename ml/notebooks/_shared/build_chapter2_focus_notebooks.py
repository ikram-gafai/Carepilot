"""Build self-sufficient Chapter 2 benchmark notebooks (Similar Ticket, SLA, LLM)."""

from __future__ import annotations

import json
from pathlib import Path
from textwrap import dedent

ROOT = Path(__file__).resolve().parents[2]
NOTEBOOKS = ROOT / "notebooks"

SETUP = dedent(
    """
    from pathlib import Path
    import json
    import subprocess
    import sys

    import matplotlib.pyplot as plt
    import pandas as pd
    from IPython.display import Image, Markdown, display

    NOTEBOOK_DIR = Path.cwd()
    for parent in [NOTEBOOK_DIR, *NOTEBOOK_DIR.parents]:
        if (parent / "ml" / "artifacts").exists():
            ROOT = parent
            break
    else:
        raise FileNotFoundError("Project root not found")

    SHARED = ROOT / "ml" / "notebooks" / "_shared"
    if str(SHARED) not in sys.path:
        sys.path.insert(0, str(SHARED))

    from benchmark_notebook_helpers import display_plot, display_plots, find_project_root, plot_results_table

    ROOT = find_project_root()
    ARTIFACTS = ROOT / "ml" / "artifacts"
    PLOTS = ROOT / "ml" / "plots"
    REPORTS = ROOT / "ml" / "reports"
    BENCHMARKS = ROOT / "ml" / "benchmarks"

    plt.style.use("seaborn-v0_8-whitegrid")
    pd.set_option("display.max_columns", 20)
    pd.set_option("display.float_format", lambda x: f"{x:.4f}")

    try:
        get_ipython().run_line_magic("matplotlib", "inline")
    except NameError:
        pass

    RUN_BENCHMARK = False
    """
).strip()


def md(text: str) -> dict:
    return {"cell_type": "markdown", "metadata": {}, "source": dedent(text).strip().splitlines(True)}


def code(text: str) -> dict:
    return {"cell_type": "code", "metadata": {}, "outputs": [], "source": dedent(text).strip().splitlines(True) + ["\n"], "execution_count": None}


def nb(cells: list[dict]) -> dict:
    return {
        "nbformat": 4,
        "nbformat_minor": 5,
        "metadata": {
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            "language_info": {"name": "python", "version": "3.11.0"},
        },
        "cells": cells,
    }


def write(path: Path, cells: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(nb(cells), indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {path.relative_to(ROOT)}")


def similar_ticket_cells() -> list[dict]:
    return [
        md(
            """
            # CAREPILOT — Similar Ticket Retrieval Benchmark

            *Chapter 2 — État de l'art et benchmarking IA · CAREPILOT operational AI*

            This notebook documents the **Task 7** retrieval benchmark: surfacing historically resolved tickets that match a new operational incident using NLP over the full historical corpus.
            """
        ),
        md(
            """
            ## 1. Objective

            Help N1/N2 agents resolve incidents faster by retrieving **similar resolved tickets** from the historical corpus. The system ranks past tickets by textual and operational similarity, then surfaces resolution patterns, root-cause families, and peer cases for decision support.

            This benchmark compares three retrieval approaches in order to select the most suitable method for integration into CAREPILOT.
            """
        ),
        md(
            """
            ## 2. Problem Type

            - **Semantic / lexical retrieval** (not classification)
            - **Query:** new ticket (title, description, perimeter, category, resolution metadata)
            - **Corpus:** full labeled historical ticket set (`ml_training.historical_tickets`)
            - **Output:** ranked list of similar historical tickets (top-K)
            - **Ground truth:** tickets sharing the same `similar_case_group_id` (excluding the query ticket itself)
            """
        ),
        md(
            """
            ## 3. Dataset Description

            | Property | Value |
            | --- | --- |
            | Source | `ml_training.historical_tickets` |
            | Corpus size | 14,000 tickets |
            | Tickets with group id | 14,000 |
            | Unique similar-case groups | 792 |
            | Group size (min / avg / max) | 9 / 17.7 / 35 |
            | Evaluable test queries | 1,584 |

            **Group metadata:** `incident_family`, `root_cause_family`, `resolution_pattern`

            **Retrieval text per ticket:** title + description + perimeter + incident category + resolution summary + incident/root-cause/resolution families + derived keywords, with operational synonym normalization (POS, SCO, VLAN, EMV, etc.).
            """
        ),
        md(
            """
            ## 4. Preprocessing

            1. **Text normalization** — lowercase, punctuation cleanup, stopword removal (lexical methods)
            2. **Synonym expansion** — operational shorthand (POS, SCO, payment authorization, printer, network)
            3. **Field assembly** — ticket text combines structured metadata and free-text fields
            4. **Corpus indexing** — TF-IDF matrix, BM25 inverted index, or sentence-transformer embeddings depending on method
            5. **Query exclusion** — the query ticket itself is removed from candidate results
            """
        ),
        md(
            """
            ## 5. Methods Compared

            1. **TF-IDF + Cosine Similarity** — sparse lexical baseline; strong when query tokens overlap historical tickets directly
            2. **BM25** — probabilistic lexical retrieval; better ranking for short operational queries and keyword-heavy tickets
            3. **Sentence Transformers (`all-MiniLM-L6-v2`)** — dense semantic embeddings over combined ticket text; evaluated with chunk-level pooling on the historical corpus

            Unlike KM retrieval (Task 6), similar-ticket groups are **large and heterogeneous** — lexical overlap often outperforms semantic embeddings when group labels are broad.
            """
        ),
        md(
            """
            ## 6. Evaluation Metrics

            - **Precision@1 (P@1)** — is the top retrieved ticket relevant?
            - **Precision@3 (P@3)** — relevant hits in top 3 divided by min(3, |relevant|)
            - **Recall@3 (R@3)** — fraction of all relevant peers found in top 3
            - **MRR** — mean reciprocal rank of the first relevant hit
            - **nDCG@3** — ranking quality with position discount
            - **Avg retrieval time (ms)** — operational latency per query
            """
        ),
        md(
            """
            ## 7. Retrieval Pipeline

            ```
            historical_tickets corpus
                    → preprocess + index (TF-IDF / BM25 / embeddings)
                    → test query ticket
                    → rank corpus (exclude self)
                    → top-K similar tickets
                    → compare to similar_case_group_id ground truth
            ```
            """
        ),
        code(SETUP),
        code(
            """
            script = BENCHMARKS / "similar_ticket_retrieval" / "benchmark.py"
            if RUN_BENCHMARK:
                subprocess.run([sys.executable, str(script), "--project-root", str(ROOT)], check=True)
            else:
                print("Loading saved benchmark artifacts (set RUN_BENCHMARK=True to re-run).")
                print(f"  python {script} --project-root {ROOT}")
            """
        ),
        md("## 8. Benchmark Execution — Load Results"),
        code(
            """
            metrics_path = ARTIFACTS / "metrics" / "similar_ticket_retrieval_metrics.json"
            payload = json.loads(metrics_path.read_text(encoding="utf-8"))
            dataset = payload["dataset"]
            validation = dataset["validation"]

            dataset_summary = pd.DataFrame(
                {
                    "Metric": [
                        "Corpus tickets",
                        "Test queries",
                        "Unique similar-case groups",
                        "Avg group size",
                        "Min / max group size",
                    ],
                    "Value": [
                        dataset["corpus_tickets"],
                        dataset["test_queries"],
                        validation["unique_groups"],
                        round(validation["avg_group_size"], 1),
                        f"{validation['min_group_size']} / {validation['max_group_size']}",
                    ],
                }
            )
            display(Markdown("### Dataset validation"))
            display(dataset_summary)

            rows = payload["results"]
            results_df = pd.DataFrame(rows)
            results_df = results_df.rename(
                columns={
                    "method": "Method",
                    "precision_at_1": "P@1",
                    "precision_at_3": "P@3",
                    "recall_at_3": "R@3",
                    "mrr": "MRR",
                    "ndcg_at_3": "nDCG@3",
                    "avg_retrieval_time_ms": "Avg Time (ms)",
                }
            )
            for col in ["P@1", "P@3", "R@3", "MRR", "nDCG@3"]:
                results_df[col] = results_df[col].map(lambda x: f"{x:.4f}")
            results_df["Avg Time (ms)"] = results_df["Avg Time (ms)"].map(lambda x: f"{x:.1f}")

            display(Markdown("### Retrieval metrics (held-out test queries)"))
            display(results_df)
            """
        ),
        md("## 9. Benchmark Results — Report Table"),
        code(
            """
            table_df = pd.DataFrame(rows)
            figure_df = table_df.rename(
                columns={
                    "method": "Method",
                    "precision_at_1": "P@1",
                    "precision_at_3": "P@3",
                    "recall_at_3": "R@3",
                    "mrr": "MRR",
                    "ndcg_at_3": "nDCG@3",
                    "avg_retrieval_time_ms": "Avg Time (ms)",
                }
            )
            for col in ["P@1", "P@3", "R@3", "MRR", "nDCG@3"]:
                figure_df[col] = figure_df[col].map(lambda x: f"{x:.4f}")
            figure_df["Avg Time (ms)"] = figure_df["Avg Time (ms)"].map(lambda x: f"{x:.0f} ms")

            png_path = PLOTS / "03_similar_ticket_benchmark_results_table.png"
            plot_results_table(
                figure_df,
                title="CarePilot Similar Ticket Retrieval Benchmark",
                footer="1,584 test queries · Corpus: 14,000 tickets · Ground truth: similar_case_group_id",
                output_path=png_path,
            )
            display_plot(png_path)
            """
        ),
        md("## 10. Visualizations"),
        code(
            """
            display_plots(
                [
                    PLOTS / "03_similar_ticket_method_comparison.png",
                    PLOTS / "03_similar_ticket_precision_at_k.png",
                    PLOTS / "03_similar_ticket_mrr_ndcg.png",
                    PLOTS / "03_similar_ticket_latency.png",
                    PLOTS / "03_similar_ticket_cluster_distribution.png",
                    PLOTS / "03_similar_ticket_success_cases.png",
                    PLOTS / "03_similar_ticket_failure_cases.png",
                ]
            )
            """
        ),
        md(
            """
            ## 11. Interpretation

            **BM25 achieves the best overall retrieval quality** on this benchmark (P@1 ≈ 0.57, MRR ≈ 0.65, nDCG@3 ≈ 0.49). Operational tickets in the same `similar_case_group_id` often share **exact keywords** (error codes, lane numbers, perimeter names) that BM25 and TF-IDF capture reliably.

            - **TF-IDF + Cosine** (P@1 ≈ 0.36) — usable baseline but weaker ranking when queries are short or vocabulary diverges from historical wording.
            - **BM25** — best precision and MRR; higher latency (~591 ms) due to corpus scoring cost on 14k tickets.
            - **Sentence Transformers** underperform here (P@1 ≈ 0.27) because similar-case groups are **broad operational clusters** — semantic paraphrase helps KM article matching (Task 6) more than large heterogeneous ticket groups.

            **Operational meaning:** agents receive peer tickets that genuinely share incident family and resolution pattern, supporting faster root-cause identification without replacing deterministic AI predictions from Tasks 1–6.
            """
        ),
        md(
            """
            ## 12. Selected Method

            **Selected for CAREPILOT benchmark & reference implementation: BM25**

            - Artifact: `ml/artifacts/models/similar_ticket_bm25.joblib`
            - Supporting artifacts: `similar_ticket_tfidf.joblib`, `similar_ticket_retrieval_minilm.joblib`
            - Metrics: `ml/artifacts/metrics/similar_ticket_retrieval_metrics.json`

            *Note:* Production demo UI may use seeded preview data for stability; this benchmark reflects offline retrieval quality on the full historical corpus.
            """
        ),
        md(
            """
            ## 13. Limitations

            - Similar-case groups are large (avg ~18 tickets) — Recall@3 stays low because many relevant peers exist beyond top-3
            - Wording inconsistency across stores reduces semantic embedding performance
            - Corpus must stay synchronized with resolved-ticket history
            - Retrieval latency scales with corpus size; indexing strategy matters at production volume
            - Benchmark evaluates offline group membership, not agent satisfaction or resolution time saved
            """
        ),
        md(
            """
            ## 14. Generated Artifacts

            - `ml/artifacts/metrics/similar_ticket_retrieval_metrics.json`
            - `ml/artifacts/models/similar_ticket_bm25.joblib`
            - `ml/plots/03_similar_ticket_benchmark_results_table.png`
            - `ml/plots/03_similar_ticket_method_comparison.png`
            - `ml/plots/03_similar_ticket_precision_at_k.png`
            - `ml/plots/03_similar_ticket_mrr_ndcg.png`
            - `ml/plots/03_similar_ticket_latency.png`
            - `ml/reports/03_similar_ticket_retrieval_summary.md`
            """
        ),
    ]


def sla_cells() -> list[dict]:
    return [
        md(
            """
            # CAREPILOT — SLA Breach Prediction Benchmark

            *Chapter 2 — État de l'art et benchmarking IA · CAREPILOT operational AI*

            Task 4 — proactive prediction of SLA violation risk before ticket resolution.
            """
        ),
        md(
            """
            ## 1. Objective

            Predict whether an operational ITSM ticket is likely to **violate SLA** before resolution (`sla_breached`). This enables proactive prioritization, supervisor alerts, and queue balancing — complementing escalation (Task 1), transfer (Task 2), and action recommendation (Task 3).
            """
        ),
        md(
            """
            ## 2. Problem Type

            - **Binary classification**
            - **Target:** `sla_breached` (0 = within SLA, 1 = breach)
            - **Positive class rate:** ~31.8% on the training corpus
            - **Primary metrics:** F1-score, Recall, ROC-AUC (missing risky tickets is operationally costly)
            """
        ),
        md(
            """
            ## 3. Dataset Description

            | Property | Value |
            | --- | --- |
            | Source | `ml_training.historical_tickets` |
            | Total tickets | 14,000 |
            | Historical actions | 32,766 |
            | Historical resolutions | 8,233 |
            | Train / validation / test | 9,800 / 2,100 / 2,100 |
            | SLA breached (positive) | 31.82% |
            | Missing description | 7.96% |
            | Missing resolution time | 41.19% |

            SLA breach is **not perfectly correlated** with priority, escalation, or transfer — the model must learn composite operational signals (queue load, ticket age, perimeter, complexity).
            """
        ),
        md(
            """
            ## 4. Preprocessing

            1. **Text normalization** on title and description
            2. **TF-IDF** vectorization (unigrams + bigrams, English stopwords)
            3. **Categorical one-hot encoding** — perimeter, priority, incident category, environment type
            4. **Numeric features** — ticket age, resolution time, queue load, store size, operational complexity
            5. **Missing-value handling** — median imputation + explicit missingness indicator columns
            6. **Stratified split** — 70% train / 15% validation / 15% test (`random_state=20260525`)

            Priority is retained as a feature but SLA breach remains a distinct operational outcome.
            """
        ),
        md(
            """
            ## 5. Models Compared

            1. **Logistic Regression** — transparent linear baseline; moderate recall, fast inference
            2. **Random Forest** — nonlinear ensemble capturing perimeter and queue interactions
            3. **XGBoost** — regularized gradient boosting; primary production candidate

            This benchmark compares three supervised classifiers to select the most suitable SLA risk model for CAREPILOT integration.
            """
        ),
        md(
            """
            ## 6. Evaluation Metrics

            - **Accuracy** — overall correctness (misleading under class imbalance)
            - **Precision / Recall / F1** — per-class and aggregate; **Recall emphasized** for breach class
            - **ROC-AUC** — ranking quality across thresholds
            - **5-fold CV accuracy** — training-set stability (not used for final selection)
            - **Training time (s)** and **Inference time (ms/row)** — operational deployability
            """
        ),
        md(
            """
            ## 7. Training Pipeline

            ```
            historical_tickets → preprocessing (TF-IDF + encoding + scaling)
                    → stratified split → train LogisticRegression / RandomForest / XGBoost
                    → evaluate on held-out test (2,100 tickets)
                    → confusion matrix, ROC, feature importance
            ```
            """
        ),
        code(SETUP),
        code(
            """
            script = BENCHMARKS / "sla_prediction" / "benchmark.py"
            if RUN_BENCHMARK:
                subprocess.run([sys.executable, str(script), "--project-root", str(ROOT)], check=True)
            else:
                print("Loading saved SLA benchmark artifacts.")
                print(f"  python {script} --project-root {ROOT}")
            """
        ),
        md("## 8. Benchmark Execution — Load Results"),
        code(
            """
            metrics_path = ARTIFACTS / "03_sla_prediction_benchmark_metrics.json"
            payload = json.loads(metrics_path.read_text(encoding="utf-8"))
            ds = payload["dataset"]

            display(Markdown("### Dataset statistics"))
            display(
                pd.DataFrame(
                    {
                        "Metric": [
                            "Total tickets",
                            "SLA breached rate",
                            "Train / val / test",
                            "Missing description",
                            "Missing resolution time",
                        ],
                        "Value": [
                            ds["total_tickets"],
                            f"{ds['class_distribution_pct']['1']:.2f}%",
                            f"{ds['split_sizes']['train']} / {ds['split_sizes']['validation']} / {ds['split_sizes']['test']}",
                            f"{ds['missing_description_pct']:.2f}%",
                            f"{ds['missing_resolution_time_pct']:.2f}%",
                        ],
                    }
                )
            )

            results_df = pd.DataFrame(payload["results"])
            display(Markdown("### Model comparison (held-out test split)"))
            display(results_df)
            """
        ),
        md("## 9. Benchmark Results — Report Table"),
        code(
            """
            figure_df = pd.DataFrame(payload["results"]).copy()
            score_cols = ["Accuracy", "Precision", "Recall", "F1", "ROC-AUC"]
            for col in score_cols:
                if col in figure_df.columns:
                    figure_df[col] = figure_df[col].map(lambda x: f"{float(x):.3f}")

            png_path = PLOTS / "03_sla_benchmark_results_table.png"
            plot_results_table(
                figure_df[["Model", *score_cols]],
                title="CarePilot SLA Breach Prediction Benchmark",
                footer="Held-out test split · Target: sla_breached · Dataset: ml_training.historical_tickets (14,000 tickets)",
                output_path=png_path,
                col_widths=[0.22, 0.12, 0.13, 0.12, 0.10, 0.13],
            )
            display_plot(png_path)
            """
        ),
        md("## 10. Visualizations"),
        code(
            """
            display_plots(
                [
                    PLOTS / "03_sla_distribution.png",
                    PLOTS / "03_priority_vs_sla.png",
                    PLOTS / "03_perimeter_vs_sla.png",
                    PLOTS / "03_sla_correlation_heatmap.png",
                    PLOTS / "03_sla_model_comparison.png",
                    PLOTS / "03_sla_roc_curves.png",
                    PLOTS / "03_sla_precision_recall.png",
                    PLOTS / "03_sla_f1_score.png",
                ]
            )
            """
        ),
        code(
            """
            cm = payload.get("confusion_matrices", {})
            if cm:
                fig, axes = plt.subplots(1, len(cm), figsize=(5 * len(cm), 4.2))
                if len(cm) == 1:
                    axes = [axes]
                for ax, (model_name, matrix) in zip(axes, cm.items()):
                    data = pd.DataFrame(matrix, index=["Actual: No breach", "Actual: SLA breach"], columns=["Pred: No", "Pred: Yes"])
                    im = ax.imshow(data.values, cmap="Blues")
                    ax.set_title(model_name)
                    for i in range(2):
                        for j in range(2):
                            ax.text(j, i, str(matrix[i][j]), ha="center", va="center", color="#111827")
                    ax.set_xticks([0, 1], ["No", "Yes"])
                    ax.set_yticks([0, 1], ["No", "Yes"])
                fig.suptitle("Confusion Matrices — SLA Breach Prediction", y=1.02)
                fig.tight_layout()
                plt.show()
            """
        ),
        md(
            """
            ## 11. Interpretation

            | Model | F1 | Recall (breach) | ROC-AUC | Role |
            | --- | --- | --- | --- | --- |
            | Logistic Regression | 0.692 | 0.807 | 0.855 | Explainable baseline; high recall but lower precision |
            | Random Forest | 0.677 | 0.707 | 0.847 | Nonlinear effects; balanced but weaker than XGBoost |
            | **XGBoost** | **0.811** | **0.889** | **0.952** | **Best operational trade-off** |

            - **Logistic Regression** achieves high recall (~81%) but lower precision — useful for auditability, not final routing.
            - **Random Forest** captures perimeter/queue nonlinearities with moderate performance.
            - **XGBoost** maximizes F1 and recall while maintaining strong precision (~75%) — best for proactive SLA supervision.

            Missing resolution-time signals (41% of tickets) and store-level queue dynamics create irreducible ambiguity — scores remain in realistic enterprise bands, not near-perfect.
            """
        ),
        md(
            """
            ## 12. Selected Model

            **Selected for CAREPILOT: XGBoost**

            - Highest F1 (0.811) and recall (0.889) on held-out test split
            - Production artifact: `ml/artifacts/models/xgboost_sla.joblib`
            - Inference: ~0.09 ms/row — suitable for real-time ticket scoring
            """
        ),
        md(
            """
            ## 13. Limitations

            - Resolution-time features may be unavailable at ticket creation in live workflows
            - SLA contract definitions vary by perimeter and store type
            - Historical breach labels reflect past operations, not future policy changes
            - Threshold tuning required for HIGH/MEDIUM/LOW risk bands in production
            - Model should be monitored as queue patterns and ticket volumes evolve
            """
        ),
        md(
            """
            ## 14. Generated Artifacts

            - `ml/artifacts/03_sla_prediction_benchmark_metrics.json`
            - `ml/artifacts/models/xgboost_sla.joblib`
            - `ml/plots/03_sla_benchmark_results_table.png`
            - `ml/plots/03_sla_distribution.png`, `03_sla_model_comparison.png`, `03_sla_roc_curves.png`
            - `ml/reports/03_sla_prediction_benchmark_summary.md`
            """
        ),
    ]


def llm_cells() -> list[dict]:
    return [
        md(
            """
            # CAREPILOT — LLM Operational Explanation Benchmark

            *Chapter 2 — État de l'art et benchmarking IA · CAREPILOT operational AI*

            Task 9 — local LLM layer that converts aggregated AI signals (Tasks 1–8) into concise enterprise ITSM explanations.
            """
        ),
        md(
            """
            ## 1. Objective

            Generate **concise operational explanations** from aggregated CAREPILOT AI predictions using a **free local LLM** (Ollama). Agents receive a single decision-support narrative covering escalation, transfer, action, SLA, priority, KM, and missing-information signals — without replacing deterministic ML outputs.

            **Flow:** Ticket → AI predictions → Local LLM explanation → Operational decision support
            """
        ),
        md(
            """
            ## 2. Problem Type

            - **LLM qualitative evaluation** (not classification or retrieval)
            - **Input:** structured ticket + AI signal context block
            - **Output:** numbered sections — operational summary, recommended action, reasoning, missing information, next steps
            - **Evaluation:** rubric-based scoring (1–5) + latency + hallucination flag
            """
        ),
        md(
            """
            ## 3. Dataset Description

            | Property | Value |
            | --- | --- |
            | Evaluation cases | 50 representative scenarios |
            | Scenario types | escalation, transfer, SLA, KM, missing info, local resolution |
            | Input | Ticket fields + Tasks 1–8 AI outputs |
            | Models evaluated | Mistral, Llama3, DeepSeek R1 (Ollama local) |
            | Inference | `POST /api/generate` · temperature 0.15 · max ~420 tokens |

            Cases are designed to mirror real Carrefour store ITSM situations: checkout failures, network issues, EMV declines, vague tickets, and local resolutions.
            """
        ),
        md(
            """
            ## 4. Preprocessing & Prompt Design

            1. **Context assembly** — ticket title, description, store, perimeter, priority + all AI prediction strings
            2. **Enterprise system prompt** — use ONLY provided context; no invented facts; no first person; no model internals
            3. **Output format** — five numbered sections enforced by prompt template
            4. **Generation params** — temperature 0.15, `num_predict` ~420 for concise responses
            5. **Parsing** — section extraction + automated rubric scoring per dimension

            When Ollama is offline, a deterministic template fallback preserves functionality without hallucination risk.
            """
        ),
        md(
            """
            ## 5. Models Compared

            1. **Mistral** (`mistral:latest`, 4.4 GB) — default production model
            2. **Llama3** (`llama3:latest`, 4.7 GB) — alternative open-weight instruct model
            3. **DeepSeek R1** (`deepseek-r1:latest`, 5.2 GB) — reasoning-oriented model; evaluated if hardware permits

            All models run locally via Ollama — no paid API dependency.
            """
        ),
        md(
            """
            ## 6. Evaluation Metrics

            | Dimension | Description |
            | --- | --- |
            | **Clarity** | Readable, structured, professional ITSM language |
            | **Operational Relevance** | References provided signals; avoids generic filler |
            | **Completeness** | All five sections present and substantive |
            | **Hallucination Control** | No invented stores, teams, codes, or procedures |
            | **Avg Latency (ms)** | End-to-end Ollama generation time |
            | **Overall Score** | Weighted rubric aggregate (1–5, capped at 4.8) |

            **Hallucination rate** = fraction of responses flagged for invented entities not in context.
            """
        ),
        md(
            """
            ## 7. Inference Pipeline

            ```
            Ticket + AI predictions (Tasks 1–8)
                    → buildExplanationContextBlock()
                    → enterprise system prompt + user prompt
                    → Ollama POST /api/generate
                    → parseExplanationResponse()
                    → store in cp_agent.ai_operational_explanations
            ```
            """
        ),
        code(SETUP),
        code(
            """
            script = BENCHMARKS / "llm_explanation" / "benchmark.py"
            if RUN_BENCHMARK:
                subprocess.run([sys.executable, str(script), "--project-root", str(ROOT)], check=True)
            else:
                print("Loading saved LLM benchmark artifacts (requires prior Ollama benchmark run).")
                print(f"  python {script} --project-root {ROOT}")
            """
        ),
        md("## 8. Benchmark Execution — Load Results"),
        code(
            """
            metrics_path = ARTIFACTS / "03_llm_explanation_benchmark_metrics.json"
            payload = json.loads(metrics_path.read_text(encoding="utf-8"))
            rows = payload["results"]

            results_df = pd.DataFrame(rows)
            label_map = {
                "model": "Model",
                "clarity": "Clarity",
                "relevance": "Operational Relevance",
                "completeness": "Completeness",
                "hallucination_control": "Hallucination Control",
                "avg_latency_ms": "Avg Latency (ms)",
                "overall": "Overall Score",
                "hallucination_rate": "Hallucination Rate",
            }
            results_df = results_df.rename(columns=label_map)
            display_cols = [c for c in label_map.values() if c in results_df.columns]
            display(Markdown(f"### Qualitative benchmark ({payload['cases_evaluated']} cases · Ollama live: {payload['ollama_available']})"))
            display(results_df[display_cols])
            """
        ),
        md("## 9. Benchmark Results — Report Table"),
        code(
            """
            def display_name(model: str) -> str:
                key = model.split(":")[0].lower()
                return {"mistral": "Mistral", "llama3": "Llama3", "deepseek-r1": "DeepSeek R1"}.get(key, model)

            figure_df = pd.DataFrame(
                [
                    {
                        "Model": display_name(r["model"]),
                        "Clarity": f"{r['clarity']:.2f}",
                        "Operational Relevance": f"{r['relevance']:.2f}",
                        "Completeness": f"{r['completeness']:.2f}",
                        "Hallucination Control": f"{r['hallucination_control']:.2f}",
                        "Avg Latency": f"{r['avg_latency_ms']:.0f} ms",
                        "Overall Score": f"{r['overall']:.2f}",
                    }
                    for r in rows
                ]
            )

            png_path = PLOTS / "03_llm_explanation_benchmark_results_table.png"
            plot_results_table(
                figure_df,
                title="CarePilot LLM Operational Explanation Benchmark",
                footer="50 evaluation tickets · Live Ollama inference · Qualitative rubric (1–5)",
                output_path=png_path,
            )
            display_plot(png_path)
            """
        ),
        md("## 10. Visualizations"),
        code(
            """
            chart_df = pd.DataFrame(rows)
            chart_df["label"] = chart_df["model"].map(lambda m: display_name(m))

            fig, axes = plt.subplots(1, 2, figsize=(13, 4.5))
            metrics = ["clarity", "relevance", "completeness", "hallucination_control"]
            x = chart_df["label"]
            width = 0.18
            for i, metric in enumerate(metrics):
                axes[0].bar([j + i * width for j in range(len(x))], chart_df[metric], width=width, label=metric.replace("_", " ").title())
            axes[0].set_xticks([j + 1.5 * width for j in range(len(x))])
            axes[0].set_xticklabels(x)
            axes[0].set_ylim(0, 5)
            axes[0].set_title("Quality Dimensions by Model")
            axes[0].legend(fontsize=8, loc="lower right")
            axes[0].set_ylabel("Rubric score (1–5)")

            colors = ["#173b6c", "#46698d", "#6385a9"][: len(chart_df)]
            axes[1].bar(chart_df["label"], chart_df["avg_latency_ms"], color=colors)
            axes[1].set_title("Average Latency by Model")
            axes[1].set_ylabel("Milliseconds")
            for i, v in enumerate(chart_df["avg_latency_ms"]):
                axes[1].text(i, v + 200, f"{v:.0f} ms", ha="center", fontsize=9)

            fig.suptitle("LLM Explanation Benchmark — Quality vs Latency", y=1.02, fontweight="bold", color="#173b6c")
            fig.tight_layout()
            plt.show()
            """
        ),
        md("## 11. Example Evaluation Case"),
        code(
            """
            cases = json.loads((BENCHMARKS / "llm_explanation" / "eval_cases.json").read_text(encoding="utf-8"))
            example = cases[0]
            display(Markdown(f"**Case {example['case_id']}** - scenario: `{example['scenario_type']}`"))
            display(Markdown("```\\n" + example["context_block"] + "\\n```"))
            """
        ),
        md(
            """
            ### Expected explanation structure (Mistral production output)

            1. **Operational summary** - ticket situation at named store, perimeter context
            2. **Recommended action** - derived from action/escalation/transfer AI signals
            3. **Reasoning** - ties ML predictions together without inventing facts
            4. **Missing information** - from Task 8 completeness analysis
            5. **Next steps** - concrete agent actions (validate, request info, escalate, transfer)

            **Example production excerpt (live Mistral inference):**

            > *Operational summary:* Local orchestration service at Carrefour Market Pau stopped after patch reboot; dependency chain monitored.
            >
            > *Recommended action:* Transfer to Store Infrastructure team.
            >
            > *Reasoning:* Transfer prediction required (100% confidence); resolution confidence locally low (16%).
            """
        ),
        md(
            """
            ## 12. Interpretation

            | Model | Overall | Latency | Assessment |
            | --- | --- | --- | --- |
            | **Mistral** | 4.07 | 7,847 ms | Best latency/quality trade-off |
            | Llama3 | 4.07 | 9,622 ms | Tied quality; slower |
            | DeepSeek R1 | 3.86 | 12,519 ms | Verbose reasoning; lower rubric scores |

            - **Mistral and Llama3** tie on overall score (~4.07) with strong completeness (~4.55) and zero hallucination flags
            - **Mistral is ~18% faster** than Llama3 with the smallest model footprint (4.4 GB)
            - **DeepSeek R1** scores lower on clarity and operational relevance — reasoning traces add latency without quality gain for this structured prompt
            - **Hallucination control** stable at 4.0 / 0% flagged across all models thanks to strict context-only prompting

            Warm inference after model load: typically 4–10 s per explanation; acceptable for batch generation and on-demand ticket detail views.
            """
        ),
        md(
            """
            ## 13. Selected Model

            **Selected for CAREPILOT: Mistral** (`OLLAMA_EXPLANATION_MODEL=mistral`)

            ```env
            OLLAMA_BASE_URL=http://localhost:11434
            OLLAMA_EXPLANATION_MODEL=mistral
            ```

            - 70 production tickets generated with live Mistral inference (no template fallback)
            - Stored in `cp_agent.ai_operational_explanations`
            - UI: minimal operational panel (not chatbot interface)
            """
        ),
        md(
            """
            ## 14. Limitations

            - Latency depends on local hardware (CPU/GPU); cold start can exceed 60 s
            - Qualitative rubric is automated — human agent review recommended for PFE validation
            - Template fallback used when Ollama is offline (deterministic, no invented facts)
            - DeepSeek R1 not recommended for production given latency and lower rubric scores
            - Explanation quality bounded by upstream AI signal quality (Tasks 1–8)
            """
        ),
        md(
            """
            ## 15. Generated Artifacts

            - `ml/artifacts/03_llm_explanation_benchmark_metrics.json`
            - `ml/benchmarks/llm_explanation/eval_cases.json`
            - `ml/plots/03_llm_explanation_benchmark_results_table.png`
            - `ml/reports/03_llm_operational_explanation_summary.md`
            - Production: `cp_agent.ai_operational_explanations`
            """
        ),
    ]


def main() -> None:
    write(NOTEBOOKS / "similar_ticket_retrieval" / "03_similar_ticket_benchmark.ipynb", similar_ticket_cells())
    write(NOTEBOOKS / "sla_prediction" / "03_sla_benchmark.ipynb", sla_cells())
    write(NOTEBOOKS / "llm_explanation" / "02_llm_benchmark.ipynb", llm_cells())


if __name__ == "__main__":
    main()
