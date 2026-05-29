# Missing Information Detection Benchmark Report

## Dataset

- Source: `ml_training.historical_tickets`
- Tickets: 14,000
- Incomplete rate (<65% completeness): 86.2%
- Average completeness score: 51.5%

## Benchmark Results (held-out test split)

| Model | Precision | Recall | F1 | Accuracy | Multilabel F1 (macro) | Completeness MAE |
| --- | --- | --- | --- | --- | --- | --- |
| Operational Heuristics | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 0.8333 | 0.0000 |
| Logistic Regression | 0.9839 | 0.8881 | 0.9336 | 0.8911 | 0.7989 | 0.0133 |
| Random Forest | 0.9427 | 0.9884 | 0.9650 | 0.9382 | 0.8032 | 0.0071 |

**Selected production method:** Operational Heuristics (binary incomplete F1 1.0000)

## Most Common Missing Fields (full corpus)

- **lane number:** 14000
- **screenshot reference:** 14000
- **timestamp:** 14000
- **error message:** 10422
- **terminal id:** 10139
- **troubleshooting steps:** 9206
- **reproduction steps:** 6229
- **environment details:** 1270

## Artifacts

- **Final model table (CSV):** `ml/artifacts/03_missing_information_benchmark_metrics.csv`
- **Final model table (JSON):** `ml/artifacts/03_missing_information_benchmark_metrics.json`
- Metrics copy: `ml/artifacts/metrics/missing_information_detection_metrics.json`
- Charts: `ml/benchmarks/missing_information_detection/reports/`
