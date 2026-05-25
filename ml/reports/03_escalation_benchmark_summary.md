# Escalation Prediction Notebook Benchmark Summary

This summary comes from `03_escalation_benchmark.ipynb`.

![Escalation Benchmark Results](../plots/03_escalation_benchmark_results_table.png)

| model | accuracy | precision | recall | f1 | roc_auc | training_time_s | inference_time_ms_per_row |
| --- | --- | --- | --- | --- | --- | --- | --- |
| XGBoost | 0.873 | 0.806 | 0.899 | 0.850 | 0.954 | 2.2846 | 0.0762 |
| Random Forest | 0.852 | 0.859 | 0.755 | 0.804 | 0.931 | 0.3970 | 0.0852 |
| Logistic Regression | 0.817 | 0.875 | 0.633 | 0.735 | 0.927 | 0.2085 | 0.0321 |

Best model by F1-score: **XGBoost**.

All results are computed from the held-out test split. No predictions were written to operational dashboards or `cp_agent` tables.
