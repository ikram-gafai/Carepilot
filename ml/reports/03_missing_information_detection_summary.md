# Missing Information Detection — Task 8 Summary

## Objective

Automatically detect missing operational information inside tickets before escalation, transfer, or action recommendation. Multilabel ticket quality detection across 12 canonical missing-information types.

## Problem Definition

Each ticket may miss zero or more operational fields simultaneously (store identifier, lane number, error message, vague description, etc.). The system outputs:

- `missing_fields[]` — multilabel gaps
- `completeness_score` — 0–1 operational completeness
- `quality_level` — COMPLETE / ADEQUATE / INCOMPLETE / POOR
- operational warnings for N1/N2 agents

## Dataset

- **Source:** `ml_training.historical_tickets`
- **Tickets:** 14,000
- **Complete tickets (quality COMPLETE):** 33.5%
- **Partially incomplete (ADEQUATE + INCOMPLETE):** 59.8%
- **Severely incomplete (POOR):** 6.7%
- **Average completeness:** 77.7%

Ground truth uses **noisy multilabel annotation** (`missing_information_labels` JSONB) — not identical to the production rule detector, to reflect real operator ambiguity.

## Preprocessing

- Lowercase normalization, punctuation handling, English stopwords
- TF-IDF (1–2 grams, max 1200 features) on title + description + metadata text
- Handcrafted pattern features (length, numeric IDs, error codes, lane/register, timestamps, payment refs)
- Multilabel binarization over 12 canonical labels
- Split: train 70% / validation 15% / test 15% (via `split` column when present)

## Methods Benchmarked

1. **Rule-Based Detector** — interpretable enterprise baseline (threshold on pattern signals)
2. **Logistic Regression One-vs-Rest** — lightweight multilabel ML baseline
3. **Random Forest One-vs-Rest** — nonlinear multilabel model

## Evaluation Metrics

Micro/Macro Precision, Recall, F1 · Hamming Loss · Exact Match Ratio · Training/Inference time

## Benchmark Results (held-out test split)

| Method | Micro Precision | Micro Recall | Micro F1 | Macro F1 | Hamming Loss | Exact Match |
| --- | --- | --- | --- | --- | --- | --- |
| Rule-Based Detector | 0.4346 | 0.9459 | 0.5956 | 0.4723 | 0.2901 | 0.0458 |
| Logistic Regression OvR | 0.4176 | 0.6737 | 0.5156 | 0.4254 | 0.2858 | 0.0229 |
| Random Forest OvR | 0.7594 | 0.5164 | 0.6147 | 0.2622 | 0.1462 | 0.1918 |

**Selected method:** Rule-Based Detector

Rule-based detection selected: competitive multilabel F1 with zero training cost, fast inference, and full explainability for enterprise audit trails.

## Per-label support and F1 (Rule-Based Detector, test split)

Corpus support = positive labels across the full dataset. Test support = positive labels on the held-out test split (n=1658).

| Label | Corpus support | Test support | F1 (Rule-Based Detector) |
| --- | ---: | ---: | ---: |
| MISSING_STORE_IDENTIFIER | 213 | 35 | 0.000 |
| MISSING_LANE_NUMBER | 11,529 | 1,375 | 0.907 |
| MISSING_TERMINAL_ID | 5,889 | 680 | 0.773 |
| MISSING_ERROR_MESSAGE | 5,023 | 589 | 0.634 |
| MISSING_SCREENSHOT_REFERENCE | 4,613 | 565 | 0.508 |
| MISSING_TIMESTAMP | 3,018 | 387 | 0.378 |
| MISSING_TROUBLESHOOTING_STEPS | 1,489 | 173 | 0.265 |
| MISSING_PAYMENT_REFERENCE | 457 | 66 | 0.231 |
| MISSING_ENVIRONMENT_DETAILS | 382 | 49 | 0.063 |
| VAGUE_DESCRIPTION | 1,355 | 143 | 0.852 |
| GENERIC_TITLE | 2,731 | 341 | 0.901 |
| MISSING_REPRODUCTION_STEPS | 683 | 90 | 0.155 |

## Rare label analysis

Labels with corpus support below 800 tickets. These drive Macro F1 down relative to Micro F1.

| Label | Corpus support | F1 | Detection difficulty |
| --- | ---: | ---: | --- |
| MISSING_STORE_IDENTIFIER | 213 | 0.000 | Very hard — rare label, weak textual signal |
| MISSING_ENVIRONMENT_DETAILS | 382 | 0.063 | Very hard — rare label, weak textual signal |
| MISSING_PAYMENT_REFERENCE | 457 | 0.231 | Hard — low support and ambiguous wording |
| MISSING_REPRODUCTION_STEPS | 683 | 0.155 | Very hard — rare label, weak textual signal |

## Interpretation

### Why Macro F1 is lower than Micro F1

In multilabel evaluation, **Micro F1** aggregates all label decisions globally (total true positives, false positives, and false negatives across every label). Frequent labels such as `MISSING_LANE_NUMBER` contribute many more decisions, so Micro F1 reflects performance on **high-volume missing-information types**.

**Macro F1** averages F1 **equally across all 12 labels**, regardless of how often each label appears. Rare labels (`MISSING_STORE_IDENTIFIER`, `MISSING_PAYMENT_REFERENCE`, `MISSING_ENVIRONMENT_DETAILS`) therefore influence Macro F1 as much as common ones. When rare labels score poorly, Macro F1 drops even if overall detection remains useful.

This gap is expected in enterprise ticket-quality tasks:

- **Rule-Based Detector:** Micro F1 0.596 vs Macro F1 0.472 — strong on frequent operational gaps, weaker on rare identifiers.
- **Random Forest OvR:** Micro F1 0.615 vs Macro F1 0.262 — high precision on frequent labels but low recall on rare ones, producing the largest Micro/Macro split.

Macro F1 is the fairer indicator of **coverage across all operational warning types**. Micro F1 is the fairer indicator of **day-to-day queue impact** where a few dominant missing-field types drive most agent rework.

### Label imbalance effects

The dataset is heavily imbalanced at the label level:

- `MISSING_LANE_NUMBER` appears in ~82% of annotated tickets.
- Rare identifiers (`MISSING_STORE_IDENTIFIER`, `MISSING_ENVIRONMENT_DETAILS`, `MISSING_PAYMENT_REFERENCE`) appear in fewer than 4% of tickets.

Imbalance affects methods differently:

1. **Rule-Based Detector** — high recall (0.946 micro) because pattern rules fire generously, but precision (0.435) suffers when ambiguous tickets trigger multiple warnings.
2. **Logistic Regression OvR** — balanced class weights help moderately, but TF-IDF features still favour labels with more training examples.
3. **Random Forest OvR** — achieves the highest precision on dominant labels, yet under-predicts rare labels, collapsing Macro F1.

Exact Match Ratio remains low (4.6% for rule-based) because tickets typically miss **multiple** fields simultaneously; getting all 12 label decisions correct on the same ticket is substantially harder than detecting individual gaps.

### Rare and hard-to-detect labels

Some missing-information types are inherently harder to detect:

- **Context-dependent labels** (`MISSING_PAYMENT_REFERENCE`, `MISSING_ENVIRONMENT_DETAILS`) only apply to a subset of tickets, leaving fewer positive examples.
- **Subjective quality labels** (`VAGUE_DESCRIPTION`, `GENERIC_TITLE`) depend on wording style rather than a regex-friendly token, creating annotator ambiguity.
- **Procedural labels** (`MISSING_TROUBLESHOOTING_STEPS`, `MISSING_REPRODUCTION_STEPS`) require narrative structure that short operator messages often omit.

Rare labels with low F1 are not necessarily failures — they indicate areas where agents should treat warnings as **advisory** and request clarification rather than rely on fully automated detection.

### Production method rationale

Rule-based detection remains the production choice: competitive Micro F1 (0.596), zero training cost, fast inference, and fully auditable signals for enterprise operations. ML models (especially Random Forest) offer complementary value for offline analysis but sacrifice explainability and struggle on rare labels without additional labelled examples.

## Visualizations

| Chart | Path |
| --- | --- |
| Benchmark table (PNG) | `ml/plots/03_missing_information_benchmark_results_table.png` |
| Completeness distribution | `ml/plots/03_missing_information_completeness_distribution.png` |
| Quality levels | `ml/plots/03_missing_information_quality_levels.png` |
| Label frequency | `ml/plots/03_missing_information_label_frequency.png` |
| Model comparison | `ml/plots/03_missing_information_model_comparison.png` |
| Hamming loss | `ml/plots/03_missing_information_hamming_loss.png` |
| Per-label F1 (with support) | `ml/plots/03_missing_information_per_label_f1.png` |
| Rare label F1 vs support | `ml/plots/03_missing_information_rare_label_analysis.png` |
| Error analysis | `ml/plots/03_missing_information_error_analysis.png` |

## Limitations

- Ground truth is synthetically noisy — not human-annotated QA labels
- Heuristics tuned for Carrefour France operational vocabulary
- Screenshot detection relies on textual references, not attachment metadata
- Rare labels remain advisory; low F1 reflects data sparsity, not necessarily production uselessness

## Enterprise Value

- Reduces bad escalations by flagging missing context early
- Guides agents to request specific operational fields before KM/transfer/escalation
- Improves input quality for Tasks 1–7 AI predictions
- Provides auditable completeness warnings on ticket detail, recommendations, and dashboard

## Integration

- Table: `cp_agent.ai_missing_information_analysis`
- Run: `bun run ai:missing-information:run`
- Benchmark: `bun run ml:missing-information:benchmark`
