# CarePilot Escalation Prediction Benchmark

## 1. Objective
This benchmark evaluates the prediction of `escalation_required` for Carrefour France operational ITSM tickets. The goal is to compare three academically clean and enterprise-relevant models before any operational AI activation.

## 2. Dataset Description
The benchmark uses the isolated `ml_training.historical_tickets` dataset. It is intentionally realistic: noisy text, incomplete descriptions, inconsistent perimeter formatting, ambiguous root causes, and controlled class imbalance. The dataset is not connected to `care_source`, `cp_agent`, or dashboard AI metrics.

## 3. Dataset Statistics
- Total tickets: 14000
- Historical actions: 34856
- Historical resolutions: 10356
- KM articles: 92
- Train / validation / test: 9800 / 2100 / 2100
- Positive class rate: 40.0%
- Missing description rate: 8.1%
- Missing resolution time rate: 26.03%

### Class Distribution
![Class Distribution](../../../plots/class_distribution.png)

### Exploratory Analysis
![Priority vs Escalation](../../../plots/priority_vs_escalation.png)

![Perimeter vs Escalation](../../../plots/perimeter_vs_escalation.png)

## 4. Preprocessing Pipeline
The preprocessing pipeline applies lowercase normalization, punctuation cleanup, English stopword removal through TF-IDF, categorical one-hot encoding, and median imputation for numeric fields. Missing text is converted to an empty string while numeric missing values are imputed within the pipeline.

## 5. Feature Engineering
The benchmark uses the requested features:
- `title`
- `description`
- `perimeter`
- `priority`
- `sla_breached`
- `resolution_time_minutes`
- `incident_category`

Title and description are concatenated into a text feature and vectorized with TF-IDF using unigrams and bigrams. Categorical fields are one-hot encoded. Numeric features are imputed and scaled.

## 6. Train/Test Split Strategy
A deterministic stratified split is used with `random_state=20260525`:
- Train: 70%
- Validation: 15%
- Test: 15%

The final metrics below are reported on the test split only.

## 7. Models Used
1. **Logistic Regression**: interpretable baseline.
2. **Random Forest**: explainable ensemble model for nonlinear effects.
3. **XGBoost**: main enterprise candidate model.

No SVM, LightGBM, deep learning, BERT, or Transformers were used.

## 8. Evaluation Metrics
Each model is evaluated with Accuracy, Precision, Recall, F1-score, ROC-AUC, training time, and inference time.

### 5-Fold Cross Validation
Cross-validation is computed on the training split using accuracy as the scoring metric. It estimates score stability across different folds without touching the held-out test split.

| Model | Mean Accuracy | Std Deviation |
| --- | --- | --- |
| Logistic Regression | 0.828 | 0.006 |
| Random Forest | 0.850 | 0.004 |
| XGBoost | 0.886 | 0.005 |

## 9. Benchmark Results
![Escalation Benchmark Results](../../../plots/03_escalation_benchmark_results_table.png)

| Model | Accuracy | Precision | Recall | F1 | ROC-AUC |
| --- | --- | --- | --- | --- | --- |
| Logistic Regression | 0.817 | 0.875 | 0.633 | 0.735 | 0.927 |
| Random Forest | 0.852 | 0.859 | 0.755 | 0.803 | 0.931 |
| XGBoost | 0.873 | 0.806 | 0.899 | 0.850 | 0.954 |

![Model Comparison](../../../plots/model_comparison.png)

### Runtime Metrics
| Model | Training Time (s) | Inference Time (ms/row) |
| --- | --- | --- |
| Logistic Regression | 0.2219 | 0.0325 |
| Random Forest | 0.3634 | 0.0658 |
| XGBoost | 2.2218 | 0.0739 |

## 10. Confusion Matrix Interpretation
The confusion matrices show how each model trades off false escalations and missed escalations. For enterprise support, false negatives are operationally important because missed escalations can increase SLA risk. False positives also matter because unnecessary N3 escalation increases support cost.

Best model by F1-score: **XGBoost**.

![Logistic Regression Confusion Matrix](../../../plots/confusion_matrix_logistic_regression.png)

![Random Forest Confusion Matrix](../../../plots/confusion_matrix_random_forest.png)

![XGBoost Confusion Matrix](../../../plots/confusion_matrix_xgboost.png)

### Normalized Confusion Matrices
The normalized matrices express each actual class as percentages. This is useful for reading recall behavior directly.

![Logistic Regression Normalized Confusion Matrix](../../../plots/normalized_confusion_matrix_logistic_regression.png)

![Random Forest Normalized Confusion Matrix](../../../plots/normalized_confusion_matrix_random_forest.png)

![XGBoost Normalized Confusion Matrix](../../../plots/normalized_confusion_matrix_xgboost.png)

## 11. Classification Report
The per-class classification report shows the precision, recall, and F1-score for both escalation and non-escalation classes.

### Logistic Regression
| Class | Precision | Recall | F1-score | Support |
| --- | --- | --- | --- | --- |
| No escalation | 0.794 | 0.940 | 0.860 | 1260 |
| Escalation | 0.875 | 0.633 | 0.735 | 840 |

### Random Forest
| Class | Precision | Recall | F1-score | Support |
| --- | --- | --- | --- | --- |
| No escalation | 0.849 | 0.917 | 0.882 | 1260 |
| Escalation | 0.859 | 0.755 | 0.804 | 840 |

### XGBoost
| Class | Precision | Recall | F1-score | Support |
| --- | --- | --- | --- | --- |
| No escalation | 0.927 | 0.856 | 0.890 | 1260 |
| Escalation | 0.806 | 0.899 | 0.850 | 840 |


## 12. ROC Curve Interpretation
The ROC curve compares model discrimination across decision thresholds. Higher ROC-AUC indicates better ability to rank tickets by escalation risk, which is useful for supervisor triage.

![ROC Curve](../../../plots/roc_curve_comparison.png)

![Precision Recall Comparison](../../../plots/precision_recall_comparison.png)

![F1 Score Comparison](../../../plots/f1_score_comparison.png)

## 13. Feature Importance Analysis
Feature importance is reported for Random Forest and XGBoost. The most useful signals usually include priority, SLA breach, perimeter, incident category, and key text terms from operational descriptions.

### Random Forest
![Random Forest Feature Importance](../../../plots/feature_importance_random_forest.png)

### XGBoost
![XGBoost Feature Importance](../../../plots/feature_importance_xgboost.png)

## 14. Executive Interpretation
- Logistic Regression provides strong interpretability but lower escalation recall, making it useful as a transparent baseline rather than the operational candidate.
- Random Forest improves nonlinear pattern handling and provides feature importance, but its recall remains below XGBoost in this benchmark.
- XGBoost achieved the best operational balance between recall, F1-score, ROC-AUC, and inference latency.

## 15. Model Selection Justification
**XGBoost** is selected because it provides the strongest recall, the best F1-score, strong ROC-AUC, and acceptable inference latency for an enterprise triage workflow. This makes it the best candidate for escalation-risk ranking in the current benchmark phase.

## 16. Limitations
- Operational noise may evolve as store processes, systems, and support practices change.
- Additional historical coverage may improve generalization across regions, stores, and incident families.
- Resolution-time features are useful for benchmarking but may be unavailable at ticket creation time in a live real-time model.
- No model predictions are connected to operational dashboards or agent workflows.
- Hyperparameter optimization was not explored in this phase.

## 17. Future Improvements
- Add real CARE historical exports.
- Benchmark preprocessing variants: raw text, cleaned text, TF-IDF, CountVectorizer, and embeddings.
- Add confusion matrices per perimeter and priority.
- Add calibration curves and threshold optimization.
- Add model comparison across multiple seeds.
- Evaluate train-time versus inference-time cost for production readiness.

## Saved Visuals
- Class distribution: `class_distribution.png`
- Priority vs escalation: `priority_vs_escalation.png`
- Perimeter vs escalation: `perimeter_vs_escalation.png`
- ROC curves: `roc_curve_comparison.png`
- Precision/Recall: `precision_recall_comparison.png`
- F1-score: `f1_score_comparison.png`
