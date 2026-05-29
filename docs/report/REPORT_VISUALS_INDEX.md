# CAREPILOT Report Visuals Index

Curated **report-ready** assets from the ML benchmark pipeline. Prefer `03_*_benchmark_results_table.png` for Chapter 2 summary tables; use supporting plots for appendix depth.

## Primary tables (one per AI task)

| Task | Report figure | PNG path | Summary report |
|------|---------------|----------|----------------|
| 1 Escalation | Benchmark comparison table | `ml/plots/03_escalation_benchmark_results_table.png` | `ml/reports/03_escalation_benchmark_summary.md` |
| 2 Transfer | Benchmark comparison table | `ml/plots/03_transfer_benchmark_results_table.png` | `ml/reports/03_transfer_benchmark_summary.md` |
| 3 Action | Benchmark comparison table | `ml/plots/03_action_recommendation_benchmark_results_table.png` | `ml/reports/03_action_recommendation_benchmark_summary.md` |
| 4 SLA | Benchmark comparison table | `ml/plots/03_sla_benchmark_results_table.png` | `ml/reports/03_sla_prediction_benchmark_summary.md` |
| 5 Priority | Benchmark comparison table | `ml/plots/03_priority_benchmark_results_table.png` | `ml/reports/03_priority_prediction_benchmark_summary.md` |
| 6 KM | Benchmark comparison table | `ml/plots/03_km_benchmark_results_table.png` | `ml/reports/03_km_recommendation_benchmark_summary.md` |
| 7 Similar tickets | Benchmark comparison table | `ml/plots/03_similar_ticket_benchmark_results_table.png` | `ml/reports/03_similar_ticket_retrieval_summary.md` |
| 8 Missing info | Benchmark comparison table | `ml/plots/03_missing_information_benchmark_results_table.png` | `ml/reports/03_missing_information_detection_summary.md` |
| 9 LLM explanation | Benchmark comparison table | `ml/plots/03_llm_explanation_benchmark_results_table.png` | `ml/reports/03_llm_operational_explanation_summary.md` |

## Supporting plots by task

### Task 1 — Escalation
- `ml/plots/03_confusion_matrix_xgboost.png`
- `ml/plots/03_roc_curves.png`
- `ml/plots/03_feature_importance_xgboost.png`

### Task 2 — Transfer
- `ml/plots/03_transfer_model_comparison.png`
- `ml/plots/03_transfer_precision_recall.png`
- `ml/plots/03_perimeter_vs_transfer.png`

### Task 3 — Action recommendation
- `ml/plots/03_action_model_comparison.png`
- `ml/plots/03_action_per_class_metrics.png`
- `ml/plots/03_action_distribution.png`

### Task 4 — SLA prediction
- `ml/plots/03_sla_model_comparison.png`
- `ml/plots/03_sla_roc_curves.png`
- `ml/plots/03_perimeter_vs_sla.png`

### Task 5 — Priority prediction
- `ml/plots/03_priority_model_comparison.png`
- `ml/plots/03_priority_per_class_metrics.png`
- `ml/plots/03_priority_correlation_heatmap.png`

### Task 6 — KM recommendation
- `ml/plots/03_km_method_comparison.png`
- `ml/plots/03_km_precision_at_k.png`
- `ml/plots/03_km_mrr_ndcg.png`

### Task 7 — Similar ticket retrieval
- `ml/plots/03_similar_ticket_method_comparison.png`
- `ml/plots/03_similar_ticket_precision_at_k.png`
- `ml/plots/03_similar_ticket_mrr_ndcg.png`

### Task 8 — Missing information
- `ml/plots/03_missing_information_completeness_distribution.png`
- `ml/plots/03_missing_information_quality_levels.png`
- `ml/plots/03_missing_information_per_label_f1.png`

### Task 9 — LLM operational explanation
- Use benchmark table PNG above
- Example notebook: `ml/notebooks/llm_explanation/03_explanation_examples.ipynb`

## JSON metrics (reproducibility)

| Task | Metrics JSON |
|------|--------------|
| Escalation | `ml/artifacts/03_escalation_benchmark_metrics.json` |
| Transfer | `ml/artifacts/03_transfer_benchmark_metrics.json` |
| Action | `ml/artifacts/03_action_recommendation_benchmark_metrics.json` |
| SLA | `ml/artifacts/03_sla_prediction_benchmark_metrics.json` |
| Priority | `ml/artifacts/03_priority_prediction_benchmark_metrics.json` |
| KM | `ml/artifacts/metrics/km_retrieval_benchmark_metrics.json` |
| Similar | `ml/artifacts/metrics/similar_ticket_retrieval_metrics.json` |
| Missing info | `ml/artifacts/03_missing_information_benchmark_metrics.json` |
| LLM | `ml/artifacts/03_llm_explanation_benchmark_metrics.json` |

## UI screenshots (live product)

Not stored in repo — capture per [SCREENSHOT_CHECKLIST.md](./SCREENSHOT_CHECKLIST.md).

Demo tickets: `docs/demo-scenarios/demo-manifest.json`

## Suggested report chapters

| Chapter | Visuals |
|---------|---------|
| Context & architecture | Mermaid exports from `docs/architecture/` |
| ML methodology | One `03_*_benchmark_results_table.png` per task |
| Product integration | Ticket screenshots C1, C3, C5 from screenshot checklist |
| Orchestration | `03-orchestration-flow.md` diagram + API JSON snippet |
| Demo & validation | Demo scenario table + 2–3 ticket screenshots |

## Notebooks (reproducibility)

Standardized Chapter 2 structure under `ml/notebooks/{task}/03_*_benchmark.ipynb`. Regenerate plots:

```bash
bun run ml:notebooks:standardize   # if structure drift
# Run notebooks with Jupyter / VS Code
```
