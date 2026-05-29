# Action Recommendation Benchmark Summary

## Objective

Predict the next operational action an N1/N2 agent should take for a ticket (`recommended_action`). Task 3 complements escalation (Task 1) and transfer (Task 2) prediction to form CAREPILOT operational decision support.

## Target Definition

Multiclass label: `recommended_action` with six operational classes:

1. **RESOLVE_LOCALLY** — handle on current perimeter without routing
2. **APPLY_KM** — follow a documented KM procedure
3. **ESCALATE_N3** — hand over to N3 specialist queue
4. **TRANSFER_PERIMETER** — route to another perimeter team
5. **REQUEST_INFORMATION** — gather missing store/device context first
6. **MONITOR** — observe intermittent symptoms before routing

Primary evaluation metric: **Macro F1** (equal weight per action class).

## Dataset Distribution

Source: `ml_training.historical_tickets` (14000 tickets)

| Class | Share (%) |
| --- | --- |
| APPLY_KM | 20.61 |
| ESCALATE_N3 | 16.69 |
| MONITOR | 10.64 |
| REQUEST_INFORMATION | 12.96 |
| RESOLVE_LOCALLY | 21.84 |
| TRANSFER_PERIMETER | 17.27 |

- Missing descriptions: 7.69%
- Missing resolution time: 26.48%
- Split: 9800 train / 2100 validation / 2100 test (stratified, `random_state=20260525`)

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

| Model               |   Accuracy |   Macro Precision |   Macro Recall |   Macro F1 |   Weighted F1 |   Training Time (s) |   Inference Time (ms/row) |
|:--------------------|-----------:|------------------:|---------------:|-----------:|--------------:|--------------------:|--------------------------:|
| Logistic Regression |     0.6648 |            0.7236 |         0.63   |     0.6397 |        0.6512 |              1.233  |                    0.0625 |
| Random Forest       |     0.6805 |            0.7866 |         0.648  |     0.6518 |        0.6618 |              0.9667 |                    0.1036 |
| XGBoost             |     0.681  |            0.7282 |         0.6507 |     0.6584 |        0.6691 |             39.2691 |                    0.1065 |

![Model comparison](../plots/03_action_model_comparison.png)

![Macro F1 comparison](../plots/03_action_macro_f1.png)

![Per-class metrics — best model](../plots/03_action_per_class_metrics.png)

## Confusion Matrix Interpretation

- **ESCALATE_N3** and **TRANSFER_PERIMETER** show the strongest diagonal signal — aligned with `escalation_required` / `transfer_required` features plus routing text.
- **APPLY_KM** vs **RESOLVE_LOCALLY** overlap when KM-friendly incidents are closed locally without formal KM wording.
- **REQUEST_INFORMATION** vs **MONITOR** confuse when descriptions are sparse but not fully empty.
- Controlled label noise and cross-routing ambiguity keep all metrics below 0.95 — no suspicious near-perfect scores.

## Best Model Selection

**XGBoost** selected for production inference (`xgboost_action_v1`) based on highest **Macro F1** (0.658) on the test split.

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
