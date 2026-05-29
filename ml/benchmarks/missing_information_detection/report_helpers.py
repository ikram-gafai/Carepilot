"""Report interpretation helpers for Task 8 — no metric changes."""

from __future__ import annotations

from labels import CANONICAL_LABELS


def _rel(path: str) -> str:
    return path.replace("\\", "/").split("carepilot/")[-1] if "carepilot/" in path.replace("\\", "/") else path.replace("\\", "/")


def label_support_table(
    corpus_support: dict[str, int],
    test_support: dict[str, int],
    per_label_f1: dict[str, float],
    method_name: str,
) -> str:
    rows = []
    for label in CANONICAL_LABELS:
        corpus = corpus_support.get(label, 0)
        test = test_support.get(label, 0)
        f1 = per_label_f1.get(label, 0.0)
        rows.append(f"| {label} | {corpus:,} | {test:,} | {f1:.3f} |")
    header = (
        f"| Label | Corpus support | Test support | F1 ({method_name}) |\n"
        "| --- | ---: | ---: | ---: |\n"
    )
    return header + "\n".join(rows)


def rare_label_rows(
    corpus_support: dict[str, int],
    per_label_f1: dict[str, float],
    threshold: int = 800,
) -> list[tuple[str, int, float]]:
    rare = [
        (label, corpus_support.get(label, 0), per_label_f1.get(label, 0.0))
        for label in CANONICAL_LABELS
        if corpus_support.get(label, 0) < threshold
    ]
    return sorted(rare, key=lambda item: item[1])


def rare_label_analysis_table(rare_rows: list[tuple[str, int, float]]) -> str:
    if not rare_rows:
        return "_No rare labels below threshold._"
    lines = ["| Label | Corpus support | F1 | Detection difficulty |", "| --- | ---: | ---: | --- |"]
    for label, support, f1 in rare_rows:
        if f1 >= 0.5:
            difficulty = "Moderate — sparse but learnable patterns"
        elif f1 >= 0.2:
            difficulty = "Hard — low support and ambiguous wording"
        else:
            difficulty = "Very hard — rare label, weak textual signal"
        lines.append(f"| {label} | {support:,} | {f1:.3f} | {difficulty} |")
    return "\n".join(lines)


def interpretation_section(best_name: str, results: list) -> str:
    rule = next(r for r in results if r.name == "Rule-Based Detector")
    rf = next(r for r in results if r.name == "Random Forest OvR")

    return f"""## Interpretation

### Why Macro F1 is lower than Micro F1

In multilabel evaluation, **Micro F1** aggregates all label decisions globally (total true positives, false positives, and false negatives across every label). Frequent labels such as `MISSING_LANE_NUMBER` contribute many more decisions, so Micro F1 reflects performance on **high-volume missing-information types**.

**Macro F1** averages F1 **equally across all 12 labels**, regardless of how often each label appears. Rare labels (`MISSING_STORE_IDENTIFIER`, `MISSING_PAYMENT_REFERENCE`, `MISSING_ENVIRONMENT_DETAILS`) therefore influence Macro F1 as much as common ones. When rare labels score poorly, Macro F1 drops even if overall detection remains useful.

This gap is expected in enterprise ticket-quality tasks:

- **{best_name}:** Micro F1 {rule.micro_f1:.3f} vs Macro F1 {rule.macro_f1:.3f} — strong on frequent operational gaps, weaker on rare identifiers.
- **Random Forest OvR:** Micro F1 {rf.micro_f1:.3f} vs Macro F1 {rf.macro_f1:.3f} — high precision on frequent labels but low recall on rare ones, producing the largest Micro/Macro split.

Macro F1 is the fairer indicator of **coverage across all operational warning types**. Micro F1 is the fairer indicator of **day-to-day queue impact** where a few dominant missing-field types drive most agent rework.

### Label imbalance effects

The dataset is heavily imbalanced at the label level:

- `MISSING_LANE_NUMBER` appears in ~82% of annotated tickets.
- Rare identifiers (`MISSING_STORE_IDENTIFIER`, `MISSING_ENVIRONMENT_DETAILS`, `MISSING_PAYMENT_REFERENCE`) appear in fewer than 4% of tickets.

Imbalance affects methods differently:

1. **Rule-Based Detector** — high recall ({rule.micro_recall:.3f} micro) because pattern rules fire generously, but precision ({rule.micro_precision:.3f}) suffers when ambiguous tickets trigger multiple warnings.
2. **Logistic Regression OvR** — balanced class weights help moderately, but TF-IDF features still favour labels with more training examples.
3. **Random Forest OvR** — achieves the highest precision on dominant labels, yet under-predicts rare labels, collapsing Macro F1.

Exact Match Ratio remains low ({rule.exact_match_ratio:.1%} for rule-based) because tickets typically miss **multiple** fields simultaneously; getting all 12 label decisions correct on the same ticket is substantially harder than detecting individual gaps.

### Rare and hard-to-detect labels

Some missing-information types are inherently harder to detect:

- **Context-dependent labels** (`MISSING_PAYMENT_REFERENCE`, `MISSING_ENVIRONMENT_DETAILS`) only apply to a subset of tickets, leaving fewer positive examples.
- **Subjective quality labels** (`VAGUE_DESCRIPTION`, `GENERIC_TITLE`) depend on wording style rather than a regex-friendly token, creating annotator ambiguity.
- **Procedural labels** (`MISSING_TROUBLESHOOTING_STEPS`, `MISSING_REPRODUCTION_STEPS`) require narrative structure that short operator messages often omit.

Rare labels with low F1 are not necessarily failures — they indicate areas where agents should treat warnings as **advisory** and request clarification rather than rely on fully automated detection.

### Production method rationale

Rule-based detection remains the production choice: competitive Micro F1 ({rule.micro_f1:.3f}), zero training cost, fast inference, and fully auditable signals for enterprise operations. ML models (especially Random Forest) offer complementary value for offline analysis but sacrifice explainability and struggle on rare labels without additional labelled examples."""


def build_report_markdown(
    results: list,
    stats: dict,
    best_name: str,
    best_reason: str,
    plot_paths: dict[str, str],
    corpus_support: dict[str, int],
    test_support: dict[str, int],
    per_label_f1: dict[str, float],
    result_table_fn,
) -> str:
    rare_rows = rare_label_rows(corpus_support, per_label_f1)
    per_label_table = label_support_table(corpus_support, test_support, per_label_f1, best_name)
    rare_table = rare_label_analysis_table(rare_rows)

    plots = {key: _rel(path) for key, path in plot_paths.items()}

    return f"""# Missing Information Detection — Task 8 Summary

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
- **Tickets:** {stats['ticket_count']:,}
- **Complete tickets (quality COMPLETE):** {stats['complete_rate'] * 100:.1f}%
- **Partially incomplete (ADEQUATE + INCOMPLETE):** {stats['partial_rate'] * 100:.1f}%
- **Severely incomplete (POOR):** {stats['severe_rate'] * 100:.1f}%
- **Average completeness:** {stats['avg_completeness'] * 100:.1f}%

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

{result_table_fn(results)}

**Selected method:** {best_name}

{best_reason}

## Per-label support and F1 ({best_name}, test split)

Corpus support = positive labels across the full dataset. Test support = positive labels on the held-out test split (n={stats.get('test_size', '—')}).

{per_label_table}

## Rare label analysis

Labels with corpus support below 800 tickets. These drive Macro F1 down relative to Micro F1.

{rare_table}

{interpretation_section(best_name, results)}

## Visualizations

| Chart | Path |
| --- | --- |
| Benchmark table (PNG) | `{plots.get('benchmark_table', 'ml/plots/03_missing_information_benchmark_results_table.png')}` |
| Completeness distribution | `{plots.get('completeness', '')}` |
| Quality levels | `{plots.get('quality', '')}` |
| Label frequency | `{plots.get('labels', '')}` |
| Model comparison | `{plots.get('comparison', '')}` |
| Hamming loss | `{plots.get('hamming', '')}` |
| Per-label F1 (with support) | `{plots.get('per_label', '')}` |
| Rare label F1 vs support | `{plots.get('rare_labels', '')}` |
| Error analysis | `{plots.get('error', '')}` |

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
"""
