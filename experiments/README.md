# Evaluation audit (`experiments/`)

This directory contains the evaluation audit described in the root [README](../README.md#7-experimental-design).
The original benchmarks live in [`ml/benchmarks/`](../ml/benchmarks) and their reports in [`ml/reports/`](../ml/reports).
The audit checks whether those results reproduce from the committed code, and how much they depend on information a live ticket would not have.

Wherever possible the scripts import the original benchmark modules instead of re-implementing them. Comparisons therefore run against the code that produced the committed reports.

| Script | Question | Output |
| --- | --- | --- |
| `00_generator_determinism.py` | Is the dataset a function of the seed? Re-seeds with the pinned clock, the clock +10 min and +1 day, and another timezone; also profiles the pinned data. Requires Bun. | `results/00_generator_determinism.json` |
| `01_reproduce_reported.py` | Do the committed benchmark numbers reproduce from HEAD? How do the committed model files score on the current data? | `results/01_reproduction.json` |
| `02_leakage_probes.py` | Can labels be recovered from post-outcome or label-derived fields alone? How much test text also appears in training? | `results/02_leakage_probes.json` |
| `03_baselines_and_feature_availability.py` | Equal-budget baselines (Dummy, tuned LR, RF, XGBoost) with and without post-outcome features. Bootstrap CIs and paired tests. | `results/03_baselines_and_feature_availability.json` |
| `04_split_protocols.py` | Random vs. unseen-incident-group vs. unseen-store splits (3 seeds each). | `results/04_split_protocols.json` |
| `05_retrieval_ablation.py` | Similar-ticket retrieval with and without the resolution summary (which a new ticket lacks), and with the group metadata described in the committed report. | `results/05_retrieval_ablation.json` |
| `06_inference_robustness.py` | Edge-case and latency behaviour of the `ml/inference/*.py` CLIs that the app spawns. | `results/06_inference_robustness.json` |
| `07_llm_rubric_audit.py` | Does the LLM-explanation rubric score non-LLM and deliberately bad responses differently from the reported LLM scores? | `results/07_llm_rubric_audit.json` |
| `08_operational_shift.py` | Vocabulary coverage and deployed escalation scores on the French operational CARE tickets. Requires the app data path; see the root README §11.4. | `results/08_operational_shift.json` |
| `09_figures.py` | Renders `figures/*.png` from the JSON results. No model fitting. | `figures/` |
| `make_tables.py` | Prints the README result tables from the JSON files, so every published number can be re-checked. | stdout |

`common.py` holds data loading, the task registry, feature-set definitions, metrics, and the bootstrap utilities.

## Protocol

- **Data:** `ml_training.historical_tickets`, regenerated with a pinned generator clock. Each result file records `meta.dataset.fingerprint_sha256`, which is computed over the columns the audit uses. All committed results share one fingerprint (`245b401a…`).
- **Splits:** stratified 70/15/15 with `random_state=20260525`, identical to `stratified_splits()` in every benchmark. Group-disjoint splits use `GroupShuffleSplit` on `similar_case_group_id` or `store_id` with 15% held out.
- **Feature sets:**
  - `original` is the task's own `CAT_COLUMNS` + `NUM_COLUMNS`.
  - `creation_time` drops `resolution_time_minutes`, `resolution_time_missing`, `ticket_age_minutes`, the other tasks' labels (`sla_breached`, `escalation_required`, `transfer_required`, `recommended_action`) and `operational_complexity`. The last one is computed from the escalation and transfer labels in `lib/ml-training/dataset-generator.ts`.
- **Preprocessing (E3/E4):** one shared `ColumnTransformer` for every model: TF-IDF word 1–2 grams with 3,500 features, one-hot categoricals, and median-imputed, scaled numerics. Model comparisons are therefore not confounded by different text budgets.
- **Uncertainty:** 1,000 bootstrap resamples of the test set give the 95% CIs. Model differences use paired resamples. The reported p-value is the two-sided bootstrap proportion. It is a resampling estimate over a single test set, not a test across training runs.

## Reproduce

Requirements: Docker, Bun ≥ 1.3, and Python 3.11+ with `ml/requirements.txt`. The audit was run with Python 3.13.7, scikit-learn 1.7.2 and XGBoost 3.1.2; each JSON file records its environment.

```bash
docker compose up -d                                   # pgvector/pgvector:pg16 on localhost:5433
bun install
export DATABASE_URL=postgresql://carepilot:carepilot@localhost:5433/carepilot
# Deterministic dataset: pin the generator clock and timezone (see README §5.6)
TZ=UTC bun scripts/seed-ml-training.ts --generated-at=2026-05-25T00:00:00Z

pip install -r ml/requirements.txt
python experiments/00_generator_determinism.py   # optional: re-seeds 5x, ends in the pinned state
for e in 01_reproduce_reported 02_leakage_probes 03_baselines_and_feature_availability \
         04_split_protocols 05_retrieval_ablation 06_inference_robustness 07_llm_rubric_audit 09_figures; do
  python experiments/$e.py
done
python experiments/make_tables.py          # Markdown tables used in the root README
# E8 additionally needs the operational app data and a run of the escalation runner (root README §11.4)
python experiments/08_operational_shift.py
```

The Python scripts accept a plain `postgresql://` URL and pick the first available driver: psycopg2, psycopg (v3) or pg8000.
Measured runtimes on a laptop CPU (Windows 11):

| Experiment | E0 | E1 | E2 | E3 | E4 | E5 | E6 | E7 | E8 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Runtime | ≈ 4 min | 2 min | 22 s | 17 min | ≈ 20 min | ≈ 3 min | 2 min | 2 s | < 1 min |

E8's operational features depend on the time at which the escalation runner is executed: SLA breach is derived from `sla_due_at` relative to "now". Its numbers can therefore move slightly between runs. E1–E7 are deterministic for a fixed dataset fingerprint, apart from wall-clock latency.
