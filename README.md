# CarePilot

**A decision-support console for store IT ticket triage. It combines classical ML predictors, lexical and semantic retrieval, a deterministic workflow and a local LLM, and it is evaluated with a reproducibility and leakage audit on a synthetic ticket corpus.**

CarePilot helps front-office (N1/N2) support agents handle IT incidents raised by retail stores: checkout lanes, payment terminals, self-checkout, network, loyalty, back-office sync. It mirrors tickets from an ITSM source and pre-computes model signals for each ticket:
- escalation to N3;
- cross-perimeter transfer;
- SLA-breach risk;
- priority;
- next action;
- missing information.

It also retrieves knowledge-base (KM) procedures and similar past tickets, and has a local LLM summarise the signals for the agent. All of this appears in a Next.js agent console and a supervisor console.

The repository contains two things that should be judged separately:

1. **A working full-stack application.** Next.js 16 App Router and PostgreSQL 16 with pgvector, 61 API route handlers, batch ML inference via Python subprocesses, and an Ollama-backed explanation layer.
2. **An ML workstream.** Nine benchmarked tasks with notebooks, reports and serialised models, plus the **evaluation audit added in this revision** ([`experiments/`](experiments)). The audit re-runs the benchmarks from the committed code and measures how much of the reported performance survives realistic evaluation.

> **Evidence status.**
> - **Synthetic data.** All ML training and evaluation data are produced by a seeded generator ([`lib/ml-training/dataset-generator.ts`](lib/ml-training/dataset-generator.ts)). No real tickets were used and no result here is a field measurement.
> - **The original reports did not reproduce.** The metrics in [`ml/reports/`](ml/reports) could not be reproduced from the committed code: the generator was not deterministic, and its versions drifted between runs. §8 reports re-measured values on a pinned, fingerprinted dataset.
> - **The final recommendation is not model-driven.** The recommendation shown to agents comes from a deterministic workflow. The escalation and transfer model outputs are stored and displayed, but they do not change that decision (§4.4).

## Contents

1. [Project overview](#1-project-overview)
2. [Research problem and motivation](#2-research-problem-and-motivation)
3. [Research questions and hypotheses](#3-research-questions-and-hypotheses)
4. [System architecture](#4-system-architecture)
5. [Dataset and data preprocessing](#5-dataset-and-data-preprocessing)
6. [Machine learning methodology](#6-machine-learning-methodology)
7. [Experimental design](#7-experimental-design)
8. [Evaluation metrics and results](#8-evaluation-metrics-and-results)
9. [Experimental findings and interpretation](#9-experimental-findings-and-interpretation)
10. [Failure analysis and limitations](#10-failure-analysis-and-limitations)
11. [Reproducibility](#11-reproducibility)
12. [Project structure](#12-project-structure)
13. [Technology stack](#13-technology-stack)
14. [Future research and improvements](#14-future-research-and-improvements)

---

## 1. Project overview

### Problem

Front-office support for a store network gets a steady stream of short, noisy tickets ("lane 4 frozen after update", "TPE refuses contactless"). For each one an agent must decide within the SLA:
- whether to resolve it locally or apply a documented procedure;
- whether to ask the store for missing details;
- whether to transfer it to another perimeter team or escalate it to N3.

Those decisions depend on information that is spread across the ticket text, the store context, KM procedures and the history of similar incidents.

### Objectives

- **Mirror tickets** from an ITSM source (the "CARE" simulator in this repo) into an operational workspace with history, comments and KM references.
- **Pre-compute decision signals** with supervised models:
  - escalation, transfer and SLA breach (binary);
  - priority and next action (multiclass);
  - missing information (multilabel).
- **Retrieve** relevant KM procedures and similar historical tickets.
- **Present** one recommended next step per ticket, with an explanation, and record agent overrides and feedback for supervision.
- **Benchmark** each ML component offline against simpler baselines.

### Capabilities as implemented

| Capability | Implementation | Runtime path |
| --- | --- | --- |
| Ticket ingestion | CARE simulator REST API → batched sync into `cp_agent.*` | `lib/services/sync/`, `POST /api/sync/run` |
| Escalation / transfer / SLA / priority / action prediction | scikit-learn pipelines (TF-IDF + one-hot + XGBoost) | Batch: `lib/ai/run-*.ts` spawns `ml/inference/*.py`; results in `cp_agent.ai_*` |
| KM recommendation | `all-MiniLM-L6-v2` embeddings with lexical re-ranking | `ml/inference/km_recommend.py` |
| Similar tickets | Benchmarked TF-IDF, BM25 and MiniLM | Live run **disabled** (`SIMILAR_TICKET_RETRIEVAL_RUN_ENABLED=false`); the UI shows seeded preview rows |
| Missing-information detection | Rule-based detector (selected over LR/RF in the benchmark) | TypeScript heuristics, `lib/ai/missing-information.ts` |
| Final recommendation | Deterministic front-office workflow tree | `lib/ai/orchestration/fo-workflow-decision.ts` |
| Operational explanation | Local LLM (Ollama, `mistral`), with a deterministic template fallback | `lib/ai/llm-explanation.ts` |
| Agent / supervisor UI | Next.js App Router, shadcn/ui, Recharts | `app/agent/*`, `app/admin/*` |

### Core technologies

TypeScript, Next.js 16, React 19, Drizzle ORM on postgres.js, PostgreSQL 16 + pgvector, Bun. Python 3.11+ with pandas, scikit-learn, XGBoost, rank-bm25 and sentence-transformers. Ollama for local LLM inference.

---

## 2. Research problem and motivation

### Why triage is a learning problem at all

Fixed routing rules ("payment errors go to the payments team") work for clean tickets and fail on the ones that matter. Three cases are typical:
- the symptom crosses perimeters, for example a network fault that shows up as a payment error;
- the description is too vague to act on;
- the same wording hides different root causes.

Historical tickets encode how such cases were actually resolved. A model trained on them could rank escalation or transfer risk earlier than an agent reading the queue top-down. It could also point to the KM procedure that resolved similar incidents.

### What the ML layer actually predicts

| Task | Target | Type | Production artifact |
| --- | --- | --- | --- |
| 1. Escalation | `escalation_required` (ticket went to N3) | binary | `ml/artifacts/models/xgboost.joblib` |
| 2. Transfer | `transfer_required` (ticket changed perimeter) | binary | `xgboost_transfer.joblib` |
| 3. Action | `recommended_action`, one of 6 classes | multiclass | `xgboost_action.joblib` |
| 4. SLA breach | `sla_breached` | binary | `xgboost_sla.joblib` |
| 5. Priority | `priority`, P1–P4 | multiclass | `xgboost_priority.joblib` |
| 6. KM recommendation | top-3 KM procedures (`expected_km_id`, `relevant_km_ids`) | retrieval | `km_retrieval_minilm.joblib` |
| 7. Similar tickets | tickets with the same `similar_case_group_id` | retrieval | `similar_ticket_*.joblib` |
| 8. Missing information | 12 missing-field labels | multilabel | rule-based (TypeScript) |
| 9. Explanation | free-text narrative from tasks 1–8 | generation | Ollama `mistral` |

### The question that matters for credibility

Every supervised target above is an *outcome*: it is known only after the ticket has been worked.

A model is useful only if it predicts that outcome from what is known **when the ticket is opened**. The original benchmarks did not enforce that constraint. Several of their input features are themselves outcomes:
- resolution time;
- other tasks' labels;
- one generated field that is computed from the labels.

The main contribution of this revision is to measure how much this matters (§7–§9).

---

## 3. Research questions and hypotheses

Each question can be answered with the code and data in this repository. Results are in §8.

| ID | Question | Hypothesis before measuring | Experiment |
| --- | --- | --- | --- |
| RQ1 | Do the committed benchmark results reproduce from the committed code and seed? | They should: the generator is seeded (`mulberry32`, seed 20260525). | E1 |
| RQ2 | Can labels be recovered from fields that only exist after resolution, or that the generator derives from other labels? | Yes for SLA breach, because the generator derives resolution time and ticket age from the SLA label. | E2 |
| RQ3 | How much test performance remains when models only see creation-time information? | A large drop for SLA, a moderate drop for escalation and transfer, and text-driven tasks are less affected. | E3 |
| RQ4 | Does XGBoost's reported advantage survive baselines with the same text budget and tuned regularisation? | The margin shrinks: the committed baselines use 10–85 text features and very strong regularisation. | E3 |
| RQ5 | Do models generalise to unseen incident groups and unseen stores? | The drop is larger for unseen groups, since the text is templated per group. | E4 |
| RQ6 | Does similar-ticket retrieval depend on the resolution summary, which a new ticket lacks? | Yes, materially. | E5 |
| RQ7 | Is the production inference contract robust to malformed or out-of-distribution input? | Partially: unseen categories are handled by `handle_unknown="ignore"`, but schema violations are not validated. | E6 |
| RQ8 | Does the LLM-explanation rubric measure explanation quality? | No: it scores format compliance, so non-LLM responses with the right layout should score like the LLMs. | E7 |

---

## 4. System architecture

### 4.1 Component view

```mermaid
flowchart LR
  subgraph SIM["CARE simulator (served by the same Next.js app)"]
    CS[("care_source.*<br/>stores · tickets · KM")] --> CAPI["/api/care/* (REST)"]
  end
  CAPI -- "HTTP pull, batched" --> SYNC["Sync service<br/>lib/services/sync"]
  SYNC --> CPA[("cp_agent.tickets<br/>history · comments · km_references")]

  subgraph OFF["Offline ML (Python)"]
    GEN["dataset-generator.ts<br/>seeded synthetic corpus"] --> MLT[("ml_training.*")]
    MLT --> BEN["ml/benchmarks/*<br/>train · evaluate · report"]
    BEN --> ART["ml/artifacts/models/*.joblib"]
  end

  CPA --> RUN["Batch runners<br/>lib/ai/run-*.ts"]
  RUN -- "spawn per 50 tickets<br/>JSON over stdin/stdout" --> INF["ml/inference/*.py"]
  ART --> INF
  INF --> RUN
  RUN --> AIT[("cp_agent.ai_* prediction tables")]
  AIT --> LLM["Ollama mistral<br/>(template fallback)"]
  LLM --> EXP[("ai_operational_explanations")]
  AIT --> ORC["Orchestrator<br/>lib/ai/orchestration"]
  WF["Deterministic FO workflow<br/>fo-workflow-decision.ts"] --> ORC
  ORC --> UI["Agent & supervisor consoles<br/>Next.js App Router"]
  EXP --> UI
  UI -- "decisions · overrides · feedback" --> FB[("ticket_history · ai_feedback · audit_logs")]
```

### 4.2 Frontend

- **Agent console** (`app/agent/*`): dashboard, ticket queue, ticket detail (signals, KM, timeline, decision form), actions, procedures.
- **Supervisor console** (`app/admin/*`): dashboard, escalations, queues, recommendations audit, AI feedback, users.
- **Interaction model:** server components read Postgres through `lib/*` services. Mutations are server actions (`app/agent/tickets/[id]/actions.ts`) that update `cp_agent.tickets` and write `ticket_history` and `audit_logs`.
- **Access control:** layout guards check a cookie session (scrypt-hashed passwords, sessions in `carepilot.sessions`). Agent and admin areas are separated by role. When `DATABASE_URL` is unset, the layouts render without authentication (demo mode).

### 4.3 Backend and ML inference

- **API:** 61 route handlers under `app/api/**/route.ts`. They cover sync, tickets, KM, the AI read/run endpoints for each task, the orchestration bundle, dashboards and the CARE simulator API.
- **Database:**
  - Drizzle ORM schemas in `lib/db/schema/*`.
  - Six PostgreSQL schemas: `care_source` (simulator), `cp_agent` (operational mirror and AI tables), `carepilot` (auth and the legacy pipeline), `cp_admin`, `ml_training` (offline data only), `public`.
- **Inference is batch, not per request.** The runners (`lib/ai/run-*.ts`, triggered by `bun run ai:<task>:run` or the admin-only `POST /api/ai/<task>/run`) do the following:
  1. Select CARE tickets and build feature rows in TypeScript.
  2. Spawn `python ml/inference/<task>.py --model <artifact>` once per chunk of 50 tickets.
  3. Exchange `{"tickets": [...]}` → `{"ok": true, "predictions": [...]}` over stdin/stdout.
  4. Upsert one row per ticket into `cp_agent.ai_*`.
- **Page loads only read the stored rows.**
- **Order matters:** the action, SLA and priority runners read the stored escalation and transfer predictions as features.
- **Model loading:** each subprocess calls `joblib.load` on a full scikit-learn `Pipeline`. For the priority and action models it loads a dict bundle `{"model", "label_encoder"}`. The model is loaded once per chunk.
- **Input validation:** the Python CLIs check the JSON shape (`{"tickets": list}`) and that the model file exists. Field-level coercion happens in `prepare_dataframe()`: text cleaning, perimeter normalisation and `pd.to_numeric(errors="coerce")`. There is no schema validation of field names (see E6).

### 4.4 From predictions to the recommendation shown to an agent

The orchestrator (`lib/ai/orchestration/operational-intelligence-orchestrator.ts`) aggregates the stored predictions for a ticket. The **final suggested decision**, however, comes from a deterministic workflow, `resolveFoWorkflowDecision` (`fo-workflow-decision.ts:95-130`). It evaluates these conditions in order:

```text
waiting status            → SUSPEND
incomplete ticket         → REQUEST_INFORMATION   (quality POOR/INCOMPLETE, completeness < 0.55, or ≥ 6 missing fields)
catalogued demo ticket    → planned outcome        (CARE-OP-* tickets, lib/care-operational/*)
outside FO ownership      → TRANSFER
resolvable KM available   → RESOLVE
FO scope                  → ESCALATE_N3
otherwise                 → TRANSFER
```

How the model outputs relate to that decision:
- **Ignored by the decision:** `runWorkflow()` (`final-suggested-decision.ts:34-47`) never forwards the escalation or transfer model outputs. They are carried in the input type, but they do not influence the decision.
- **What does influence it:**
  - KM retrieval, through `hasKm` and `hasResolvableKm`;
  - the missing-information heuristics, through the incomplete-ticket gate;
  - the transfer-target name, as a fallback.
- **Displayed only:** SLA and priority predictions are shown as signals.
- **Displayed confidence:** a fixed band per decision with a deterministic per-ticket jitter (`lib/ai/recommendation-confidence.ts`, which says "Raw ML scores are not shown"), not a model probability. The bands are RESOLVE 85–95, TRANSFER and ESCALATE_N3 80–90, SUSPEND 70–85, REQUEST_INFORMATION 60–75.

Operating thresholds:
- **Escalation:** positive when $p \ge 0.45$ (`ml/inference/escalation_predict.py`), followed by a post-hoc rule (`lib/ai/escalation-calibration.ts`). The rule forces escalation for P1 tickets with a breached SLA and floors the confidence of positive predictions at 0.72 (P1/P2) or 0.65.
- **SLA risk:** HIGH when $p \ge 0.72$ and MEDIUM when $p \ge 0.48$ (`ml/inference/sla_predict.py`).

### 4.5 End-to-end inference flow (escalation example)

```mermaid
flowchart TD
  A["bun scripts/run-escalation-predictions.ts<br/>or POST /api/ai/escalation/run (admin)"] --> B["Select cp_agent.tickets where source = 'CARE'"]
  B --> C["Build feature rows in TS:<br/>title · description · perimeter · priority ·<br/>sla_breached · resolution_time_minutes · incident_category"]
  C --> D["Chunk of 50 → spawn<br/>python ml/inference/escalation_predict.py --model xgboost.joblib"]
  D --> E["prepare_dataframe(): clean text, normalise perimeter,<br/>coerce numerics (invalid → NaN → median)"]
  E --> F["Pipeline: TF-IDF(1–2g) ⊕ one-hot ⊕ scaled numerics → XGBClassifier.predict_proba"]
  F --> G{"p ≥ 0.45 ?"}
  G -- yes --> H["Escalate to N3"]
  G -- no --> I["No N3 escalation"]
  H --> J["Calibration: P1 ∧ SLA breached ⇒ escalate; confidence floor"]
  I --> J
  J --> K[("Upsert cp_agent.ai_escalation_predictions")]
  K --> L["Ticket page load: orchestrator reads stored rows"]
  L --> M["resolveFoWorkflowDecision()<br/>(does not read the escalation prediction)"]
  M --> N["Suggested decision + banded confidence + LLM explanation"]
```

### 4.6 LLM layer

- **Model:** Task 9 calls Ollama `/api/generate` with `mistral` by default (temperature 0.15, `num_predict` 420, 120 s timeout).
- **Prompt:** a strict context-only system prompt (`lib/ai/llm-explanation.ts`).
- **Fallback:** if `/api/tags` is unreachable within 3 s, a deterministic template is used and the model name is recorded as `carepilot-template-fallback`.
- **OpenAI:** used only by the legacy `carepilot.*` summariser when `OPENAI_API_KEY` is set.
- **pgvector embeddings in the legacy pipeline:** these are a deterministic character-code hash (`lib/embeddings/deterministic.ts`), not a semantic model.

---

## 5. Dataset and data preprocessing

### 5.1 Provenance

All ML data are **synthetic**. `scripts/seed-ml-training.ts` calls `generateMlTrainingDataset()` in [`lib/ml-training/dataset-generator.ts`](lib/ml-training/dataset-generator.ts) and writes the `ml_training` schema:
- `historical_tickets`: 14,000 rows by default; the allowed size range is 3,000–20,000;
- `historical_actions`;
- `historical_resolutions`;
- `km_articles` (102);
- `dataset_metadata`;
- `dataset_exports`.

The generator works as follows:
1. It draws incidents from hand-written per-perimeter templates.
2. It assigns stores round-robin from a static store directory (36 stores).
3. It samples latent scores (urgency, routing, SLA).
4. It selects the top fraction by score as positives. For example, the top 31.5% by `slaScore` become SLA breaches (`dataset-generator.ts:2207`).
5. It injects controlled label noise and ambiguity patterns at a configurable `noise_level`.

The operational demo tickets (`care_source.*`, 70 catalogued CARE-OP tickets) come from a separate code path. They are not used for training.

### 5.2 Size, targets and class balance

Figures below are for the pinned dataset used in §8 (`--generated-at=2026-05-25T00:00:00Z`, `TZ=UTC`, seed 20260525, noise `medium`).

| Property | Value |
| --- | --- |
| Tickets × columns | 14,000 × 41 |
| `escalation_required` positive rate | 40.0% |
| `transfer_required` positive rate | 35.0% |
| `sla_breached` positive rate | 31.4% |
| `priority` | P1 15.4%, P2 27.2%, P3 42.1%, P4 15.3% |
| `recommended_action` | RESOLVE_LOCALLY 21.7%, APPLY_KM 20.6%, TRANSFER_PERIMETER 17.1%, ESCALATE_N3 17.0%, REQUEST_INFORMATION 12.9%, MONITOR 10.7% |
| Distinct normalised titles | 637 |
| Incident categories / with `__ROOT_<cause>` suffix | 86 / 25.9% of tickets |
| `similar_case_group_id` groups / stores | 781 / 36 |
| `resolution_time_minutes` missing | 40.2% |

### 5.3 Feature definitions and availability

The column that matters methodologically is the last one: whether the value exists when a ticket is opened.

| Feature | Type | Used by (original benchmarks) | Known at creation? |
| --- | --- | --- | --- |
| `title`, `description` → `ticket_text` | text | all | yes |
| `perimeter` (42 raw spellings, keyword-normalised) | categorical | all | yes |
| `incident_category` | categorical | all | partly: 25.9% carry a `__ROOT_<cause>` suffix encoding a diagnosed root cause |
| `priority` | categorical | escalation, transfer, SLA, action | yes (assigned at triage) |
| `environment_type`, `ticket_source`, `store_size` | categorical | SLA, priority, action | yes |
| `queue_load` | numeric | SLA, priority | yes (generated from store type and hour of creation) |
| `resolution_time_minutes`, `resolution_time_missing` | numeric | escalation, transfer, SLA, action | **no**: known after resolution, and generated *from* `sla_breached` |
| `ticket_age_minutes` | numeric | SLA, priority | **no**: generated as `resolution_time × (0.68–0.90)` if breached, else `× (0.32–0.60)` (`dataset-generator.ts:2284`) |
| `sla_breached` | binary | escalation, transfer, priority, action | **no**: outcome |
| `escalation_required`, `transfer_required` | binary | SLA, priority, action | **no**: outcomes of other tasks; live inference substitutes predicted values |
| `recommended_action` | categorical | SLA, priority | **no**: outcome |
| `operational_complexity` | numeric | SLA, priority | **no**: generated from the escalation and transfer labels (`computeOperationalComplexity`, `dataset-generator.ts:929`) |

### 5.4 Missing values, encoding and transformations

These steps are shared by all five supervised benchmarks (`ml/benchmarks/<task>/preprocessing.py`):

- **Text:** `title + " " + description`, lower-cased, non-alphanumerics replaced by spaces, whitespace collapsed. Then `TfidfVectorizer(ngram_range=(1, 2), stop_words="english", min_df=3, max_df=0.92, max_features=k)`. The budget $k$ differs per model and task (§6.2).
- **Categoricals:** perimeter normalised by keyword rules (`sco`, `payment`, `loyalty`, `network`, …), then `SimpleImputer(most_frequent)` and `OneHotEncoder(handle_unknown="ignore")`.
- **Numerics:** `pd.to_numeric(errors="coerce")`, then `SimpleImputer(median)` and `StandardScaler(with_mean=False)`. Explicit missingness flags (`description_missing`, `resolution_time_missing`) are added for SLA, priority and action.
- **Targets:** cast to int for binary tasks; `LabelEncoder` over a fixed class list for priority and action.
- **No leakage across splits:** all transformers live inside a scikit-learn `Pipeline`, so they are fitted on the training split only.

### 5.5 Splitting

- **Benchmark split:** every benchmark uses a stratified random split of 70% train, 15% validation and 15% test with `random_state=20260525`, giving 9,800 / 2,100 / 2,100 tickets. The validation split is created but not used for model selection in the committed code. Hyper-parameters are fixed in source.
- **Generator split:** the dataset also has a `split` column from the generator (10,287 / 2,151 / 1,562). Only the retrieval and missing-information benchmarks use it.

### 5.6 Sources of leakage and data-quality limitations

| Issue | Evidence | Consequence |
| --- | --- | --- |
| Post-outcome features (resolution time, ticket age, other tasks' labels) | §5.3; E2 | Inflated scores for SLA, priority and action |
| Label-derived generator variable `operational_complexity` | ROC-AUC 0.894 for escalation **on its own** (E2) | Inflated SLA and priority scores |
| Templated text: 637 distinct titles; ~97% of test titles also occur in training | E2 | Random splits reward template memorisation; group-disjoint evaluation is needed (E4) |
| Every test ticket's incident group and store also appear in training | E2 | A random split cannot measure generalisation to new incident families or stores |
| Clock- and timezone-dependent generator | Same seed, clock shifted by 10 min: only 61–63% agreement on binary labels and 4% on titles (E0, §8.1) | The committed reports cannot be regenerated |
| Stale export: `ml/exports/historical_tickets.csv` | 3.7% title agreement with the pinned dataset (E0) | It is a snapshot of an earlier generator version, not the benchmark data |

**Root cause of non-determinism.** `deriveQueueLoad()` (`dataset-generator.ts:916`) draws an extra random number only when a ticket's *local-time* hour falls between 10:00 and 20:00. Timestamps are offsets from `generatedAt = new Date()`. The number of PRNG draws, and hence every later label, therefore depends on when and in which timezone the seed script runs.

E0 confirms the mechanism:
- Shifting the clock by one full day leaves the dataset unchanged.
- Shifting it by 10 minutes, or changing only the timezone, produces a different dataset.

**Fix in this revision.** `scripts/seed-ml-training.ts` now accepts `--generated-at=<ISO>` / `ML_TRAINING_GENERATED_AT`. With `TZ=UTC`, two consecutive runs produce identical data. The default behaviour is unchanged.

---

## 6. Machine learning methodology

### 6.1 Algorithms and objectives

Let $x_i$ be the concatenation of a TF-IDF text vector, one-hot categoricals and scaled numerics, with $y_i \in \{0,1\}$ (binary) or $y_i \in \{1..K\}$ (multiclass).

**Logistic regression.** This is the linear baseline: L2-regularised cross-entropy, solved by liblinear for binary tasks and lbfgs for multiclass:

$$\min_{w,b}\ \frac{1}{2C}\lVert w\rVert_2^2 + \sum_i \ell\big(y_i, \sigma(w^\top x_i + b)\big),\qquad \ell(y,p) = -y\log p - (1-y)\log(1-p)$$

**Random forest.** Bagged CART trees with Gini impurity and $\sqrt{d}$ features per split. Some configurations use class-balanced sample weights.

**XGBoost.** Additive trees $\hat y_i = \sum_k f_k(x_i)$, fitted by second-order boosting on

$$\mathcal{L} = \sum_i w_{y_i}\,\ell\big(y_i,\hat y_i\big) + \sum_k \Big(\gamma T_k + \tfrac{\lambda}{2}\lVert \omega_k\rVert_2^2 + \alpha \lVert \omega_k\rVert_1\Big)$$

where:
- $T_k$ and $\omega_k$ are the leaf count and leaf weights of tree $k$;
- the positive-class weight $w_1$ is `scale_pos_weight` $= n_{\text{neg}}/n_{\text{pos}}$ on the training split;
- the multiclass objective is softmax cross-entropy.

**Retrieval (tasks 6–7).**
- TF-IDF cosine similarity.
- Okapi BM25 ($k_1=1.5$, $b=0.75$):

$$\text{BM25}(q,d) = \sum_{t\in q} \text{idf}(t)\,\frac{f_{t,d}\,(k_1+1)}{f_{t,d} + k_1\big(1-b+b\,|d|/\overline{|d|}\big)}$$

- `all-MiniLM-L6-v2` sentence embeddings with cosine similarity. For KM, chunk-level max-pooling plus lexical re-ranking.

**Missing information (task 8).** A rule-based pattern detector compared with one-vs-rest LR and RF over 12 labels.

### 6.2 Hyper-parameters as committed

| Task | LR: text features, $C$ | RF: text features, trees / depth | XGBoost: text features, trees / depth / η |
| --- | --- | --- | --- |
| Escalation | 10, 0.0005 | 300, 100 / 6 | 3,500, 220 / 4 / 0.055 |
| Transfer | 10, 0.0005 | 300, 120 / 7 | 3,500, 220 / 4 / 0.055 |
| SLA | 85, 0.009 | 780, 340 / 15 | 960, 185 / 4 / 0.045 |
| Priority | 38, 0.005 | 450, 240 / 14 | 650, 145 / 3 / 0.042 |
| Action | 80, 0.6 | 350, 140 / 9 | 2,800, 240 / 6 / 0.07 |

Model comparison in the original benchmarks is confounded: the baselines get 10–85 text features and, for three tasks, $C \le 0.009$, while XGBoost gets 650–3,500 text features. The source shows no record of how these values were chosen. E3 repeats the comparison with one shared preprocessor and with $C$ tuned on the validation split.

### 6.3 Training, evaluation and serialisation

- **Training:** `python ml/benchmarks/<task>/benchmark.py` loads `ml_training.historical_tickets` from PostgreSQL, splits it, fits the three pipelines, and runs 5-fold stratified CV (accuracy) on the training split. It evaluates on the test split and writes metrics JSON/CSV, plots, a Markdown report and `joblib` artifacts.
- **Model selection:** best test F1 (binary) or macro-F1 (multiclass). The test split is therefore also the selection split. The audit selects on validation instead.
- **Serialisation:** the full `Pipeline` (preprocessor and estimator) is dumped with `joblib`. Priority and action artifacts are `{"model", "label_encoder"}` bundles. Loading requires a compatible scikit-learn and XGBoost; the audit used scikit-learn 1.7.2 and XGBoost 3.1.2.

### 6.4 Metrics

- **Binary:** precision, recall and $F_1 = \frac{2PR}{P+R}$ at threshold 0.5; ROC-AUC; PR-AUC (average precision); Brier score.
- **Multiclass:** accuracy and macro-F1 $= \frac{1}{K}\sum_k F_{1,k}$. Macro-F1 is the primary metric because class frequencies range from 10.7% to 42.1%.
- **Retrieval** with relevance set $R_q$: $P@k$, $R@k$, $\text{MRR} = \frac{1}{|Q|}\sum_q 1/\text{rank}_q$, and $\text{nDCG}@k$ with binary gains.
- **Uncertainty:** 95% percentile-bootstrap intervals over 1,000 test-set resamples. Model differences use paired resamples.

---

## 7. Experimental design

### 7.1 Experiments that existed before this revision

All of these were run by the original author. Their outputs are in `ml/artifacts/`, `ml/plots/` and `ml/reports/`, and each task has three notebooks (exploration, preprocessing, benchmark) under `ml/notebooks/`.

| Task | Design | Status in this revision |
| --- | --- | --- |
| Escalation, transfer, SLA, priority, action | LR vs RF vs XGBoost; held-out test; 5-fold CV accuracy; feature importance; confusion matrices | Re-run and audited (E1–E4) |
| Similar tickets | TF-IDF vs BM25 vs MiniLM against `similar_case_group_id` ground truth | Re-run for TF-IDF and BM25 (E5) |
| KM recommendation | TF-IDF vs BM25 vs MiniLM against `expected_km_id` / `relevant_km_ids` | **Not re-run**; reported numbers unverified |
| Missing information | Rule-based detector vs LR and RF one-vs-rest over 12 labels | **Not re-run**; reported numbers unverified |
| LLM explanation | 3 Ollama models × 50 cases, heuristic rubric | Rubric audited (E7); LLM calls not repeated |

### 7.2 Audit experiments added in this revision

All of these are completed. Code is in [`experiments/`](experiments) and machine-readable results are in [`experiments/results/`](experiments/results). Each JSON file records the dataset fingerprint (`245b401a…`), the library versions and the random seed.

| ID | Question (RQ) | Design | Controls |
| --- | --- | --- | --- |
| E0 | Generator determinism (RQ1) | Seed 5×: pinned clock twice, clock +10 min, +1 day, other timezone. Compare with the committed CSV. Profile the dataset. | Real seed script; same seed |
| E1 | Reproducibility (RQ1) | Re-run the original `build_models` / `stratified_splits` / `fit_and_evaluate` on a regenerated dataset. Score the committed `.joblib` models on the same test split. | Original code imported, not re-implemented |
| E2 | Leakage probes (RQ2) | Single-feature ROC-AUC of post-outcome fields; a one-line ratio rule for SLA; action purity given routing flags; train/test text overlap | Generator source cited for every mechanism |
| E3 | Feature availability and fair baselines (RQ3, RQ4) | Dummy, LR, RF and XGBoost on `original` vs `creation_time` features (plus a root-cause-suffix ablation) | One shared preprocessor (3,500 TF-IDF features); LR $C$ tuned on validation; paired bootstrap |
| E4 | Generalisation (RQ5) | Random vs `similar_case_group_id`-disjoint vs store-disjoint splits, 3 seeds each | Creation-time features only |
| E5 | Retrieval leakage (RQ6) | Similar-ticket retrieval with and without the resolution summary; with the report's group metadata | Benchmark's own text builder and metric code; BM25 checked against `rank_bm25` (25/25 identical top-3) |
| E6 | Inference robustness (RQ7) | Twelve payload classes through the five production CLIs; determinism; wall-clock latency | Committed artifacts, same subprocess contract as the app |
| E7 | Rubric validity (RQ8) | Score non-LLM and deliberately defective responses with the project's own `score_explanation()` | Same 50 evaluation contexts |
| E8 | Training/serving shift | Vocabulary coverage and deployed escalation scores on the 70 operational (French) tickets | Predictions produced by the real batch runner |

### 7.3 Proposed, not yet run

- **Category-disjoint split** (unseen incident categories). E4 shows that group- and store-disjoint splits do not remove template overlap, because titles are shared across the groups of a category.
- **Temporal split** on `created_at`. This first needs a generator that models drift.
- **Probability calibration** (reliability curves, ECE) and **cost-sensitive thresholds** for escalation and SLA. The production thresholds (0.45, 0.48, 0.72) are not derived from a cost model.
- **Re-runs of the KM and missing-information benchmarks** under the pinned dataset, with the same leakage checks. For KM: are `expected_km_id` keywords derivable from the ticket text by construction?
- **Sentence-transformer retrieval** re-run, which needs the `all-MiniLM-L6-v2` weights.
- **Human or reference-based evaluation** of the LLM explanations, replacing the lexical rubric (see E7).

---

## 8. Evaluation metrics and results

All numbers below are generated by the scripts in `experiments/`. The tables are printed verbatim by `python experiments/make_tables.py`. Unless stated otherwise, test sets are the original stratified 15% split (n = 2,100), and intervals are bootstrap 95% CIs.

### 8.1 Reproducibility (E1)

**Generator determinism (E0).** All runs use seed 20260525; agreement is measured against the pinned run (`2026-05-25T00:00:00Z`, `TZ=UTC`).

| Generator clock / timezone | `escalation_required` | `transfer_required` | `sla_breached` | `recommended_action` | title |
| --- | ---: | ---: | ---: | ---: | ---: |
| same clock, same TZ (re-run) | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| clock + 10 minutes | 0.621 | 0.634 | 0.611 | 0.246 | 0.042 |
| clock + 1 day | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| same clock, `TZ=Europe/Paris` | 0.618 | 0.637 | 0.595 | 0.230 | 0.038 |

The committed CSV export agrees with the pinned dataset on 3.7% of titles and 39.4% of priorities, so it comes from a different generator version.

**The committed benchmark code, re-run on the pinned dataset:**

| Task | Model | Metric | Reported | Re-run at HEAD | Δ | ROC-AUC reported | ROC-AUC re-run |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Escalation | Logistic Regression | F1 | 0.735 | 0.525 | −0.210 | 0.927 | 0.808 |
| Escalation | Random Forest | F1 | 0.804 | 0.609 | −0.195 | 0.931 | 0.859 |
| Escalation | XGBoost | F1 | 0.850 | 0.747 | −0.103 | 0.954 | 0.884 |
| Transfer | Logistic Regression | F1 | 0.573 | 0.161 | −0.412 | 0.760 | 0.728 |
| Transfer | Random Forest | F1 | 0.706 | 0.676 | −0.030 | 0.871 | 0.831 |
| Transfer | XGBoost | F1 | 0.779 | 0.722 | −0.057 | 0.915 | 0.884 |
| SLA breach | Logistic Regression | F1 | 0.692 | 0.656 | −0.036 | 0.855 | 0.839 |
| SLA breach | Random Forest | F1 | 0.677 | 0.617 | −0.060 | 0.847 | 0.829 |
| SLA breach | XGBoost | F1 | 0.811 | 0.806 | −0.005 | 0.952 | 0.945 |
| Priority | Logistic Regression | macro-F1 | 0.730 | 0.730 | +0.000 | – | – |
| Priority | Random Forest | macro-F1 | 0.753 | 0.750 | −0.003 | – | – |
| Priority | XGBoost | macro-F1 | 0.832 | 0.822 | −0.010 | – | – |
| Action | Logistic Regression | macro-F1 | 0.640 | 0.660 | +0.020 | – | – |
| Action | Random Forest | macro-F1 | 0.652 | 0.656 | +0.005 | – | – |
| Action | XGBoost | macro-F1 | 0.658 | 0.698 | +0.040 | – | – |

Some of the gap has a known cause. The reported escalation positive rate was ~18%; the current generator produces 40.0%.

**The committed model files, scored on the current test split:**

| Task | Committed artifact | F1 / macro-F1 on current test split | ROC-AUC | Freshly trained XGBoost (same split) |
| --- | ---: | ---: | ---: | ---: |
| Escalation | `xgboost.joblib` | 0.367 | 0.739 | 0.747 |
| Transfer | `xgboost_transfer.joblib` | 0.581 | 0.785 | 0.722 |
| SLA breach | `xgboost_sla.joblib` | 0.768 | 0.931 | 0.806 |
| Priority | `xgboost_priority.joblib` | 0.815 | – | 0.822 |
| Action | `xgboost_action.joblib` | 0.591 | – | 0.698 |

The deployed escalation and transfer models were trained on an earlier generator version. Their ranking quality drops markedly on the current one: escalation ROC-AUC is 0.739 for the deployed model against 0.884 when retrained.

### 8.2 Leakage probes (E2)

| Probe | Result |
| --- | --- |
| SLA: predict breach iff `ticket_age_minutes / resolution_time_minutes ≥ 0.64` | **100.0% accuracy** on the 8,375 tickets (59.8%) where both fields exist; ratio ROC-AUC = 1.000 |
| `operational_complexity` alone (label-derived) | ROC-AUC 0.894 for escalation, 0.864 for transfer. Mean value 0.196 when neither label is set, 0.441 when both are. |
| `resolution_time_minutes` alone | ROC-AUC 0.661 (escalation), 0.564 (transfer), 0.570 (SLA). Weak on its own; the leak is in the interaction with ticket age. |
| Action from `(escalation_required, transfer_required)` only | 47.0% accuracy (6 classes); `transfer=1, escalation=0` → TRANSFER_PERIMETER in 68.6% of cases |
| Distinct normalised titles | 637 for 14,000 tickets |
| Test titles also present in train (random split) | 97.0–97.9%, depending on the task's stratification |
| Test descriptions also present verbatim in train | 8.6–9.3% |
| Nearest-train TF-IDF cosine of test tickets | median 0.72–0.73; 5.1–5.7% of test tickets ≥ 0.95 |
| Test tickets whose incident group / store appear in train | 100% / 100% |

### 8.3 Equal-budget baselines and feature availability (E3)

The primary metric is F1 at threshold 0.5 (binary) or macro-F1 (multiclass). All models share one preprocessor. Logistic-regression $C$ was selected on the validation split: 1.0 for every task except SLA (0.1).

| Task | Features | Dummy | Logistic Reg. (tuned C) | Random Forest | XGBoost | XGBoost ROC-AUC |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Escalation | original | 0.000 | 0.755 [0.733, 0.780] | 0.720 [0.695, 0.745] | 0.747 [0.723, 0.770] | 0.884 [0.871, 0.898] |
| Escalation | creation-time | 0.000 | 0.755 [0.733, 0.778] | 0.715 [0.691, 0.740] | 0.746 [0.724, 0.770] | 0.883 [0.870, 0.897] |
| Transfer | original | 0.000 | 0.722 [0.695, 0.745] | 0.700 [0.674, 0.729] | 0.728 [0.702, 0.752] | 0.884 [0.869, 0.898] |
| Transfer | creation-time | 0.000 | 0.724 [0.698, 0.748] | 0.701 [0.673, 0.727] | 0.726 [0.700, 0.751] | 0.882 [0.868, 0.896] |
| SLA breach | original | 0.000 | 0.678 [0.649, 0.704] | 0.520 [0.482, 0.555] | 0.802 [0.779, 0.827] | 0.945 [0.936, 0.955] |
| SLA breach | creation-time | 0.000 | 0.627 [0.597, 0.656] | 0.401 [0.363, 0.435] | 0.599 [0.570, 0.631] | 0.764 [0.743, 0.786] |
| Priority | original | 0.148 | 0.788 [0.771, 0.804] | 0.769 [0.749, 0.788] | 0.824 [0.808, 0.842] | – |
| Priority | creation-time | 0.148 | 0.624 [0.603, 0.644] | 0.618 [0.596, 0.639] | 0.560 [0.539, 0.581] | – |
| Action | original | 0.059 | 0.680 [0.659, 0.701] | 0.678 [0.657, 0.699] | 0.704 [0.683, 0.724] | – |
| Action | creation-time | 0.059 | 0.581 [0.560, 0.602] | 0.579 [0.557, 0.602] | 0.586 [0.565, 0.607] | – |

![Test score with and without post-outcome features](experiments/figures/feature_availability.png)

Key paired-bootstrap comparisons (same resamples of the same test set):

| Task | Comparison | Δ F1 / macro-F1 | 95% CI | bootstrap p |
| --- | ---: | ---: | ---: | ---: |
| Escalation | XGBoost vs Logistic Regression (original features) | -0.009 | [-0.021, 0.004] | 0.194 |
| Transfer | XGBoost vs Logistic Regression (original features) | +0.006 | [-0.010, 0.023] | 0.424 |
| SLA breach | XGBoost original minus creation-time features | +0.203 | [0.178, 0.230] | < 0.002 |
| SLA breach | XGBoost vs Logistic Regression (original features) | +0.124 | [0.098, 0.149] | < 0.002 |
| SLA breach | XGBoost vs Logistic Regression (creation-time features) | -0.027 | [-0.045, -0.007] | 0.010 |
| Priority | XGBoost original minus creation-time features | +0.264 | [0.240, 0.291] | < 0.002 |
| Priority | XGBoost vs Logistic Regression (creation-time features) | -0.064 | [-0.088, -0.038] | < 0.002 |
| Action | XGBoost original minus creation-time features | +0.117 | [0.102, 0.132] | < 0.002 |
| Escalation | XGBoost original minus creation-time features | +0.001 | [-0.005, 0.007] | 0.816 |
| Transfer | XGBoost creation-time minus base-category-only | +0.015 | [0.002, 0.028] | 0.022 |

<details>
<summary>All 25 paired comparisons, and the root-cause-suffix ablation</summary>

| Task | Comparison | Δ F1 / macro-F1 | 95% CI | bootstrap p |
| --- | ---: | ---: | ---: | ---: |
| Escalation | XGBoost vs Logistic Regression (original features) | -0.009 | [-0.021, 0.004] | 0.194 |
| Escalation | XGBoost vs Random Forest (original features) | +0.027 | [0.009, 0.044] | 0.006 |
| Escalation | XGBoost vs Logistic Regression (creation-time features) | -0.009 | [-0.020, 0.002] | 0.122 |
| Escalation | XGBoost original minus creation-time features | +0.001 | [-0.005, 0.007] | 0.816 |
| Escalation | XGBoost creation-time minus base-category-only | +0.006 | [-0.003, 0.016] | 0.194 |
| Transfer | XGBoost vs Logistic Regression (original features) | +0.006 | [-0.010, 0.023] | 0.424 |
| Transfer | XGBoost vs Random Forest (original features) | +0.027 | [0.007, 0.047] | 0.006 |
| Transfer | XGBoost vs Logistic Regression (creation-time features) | +0.002 | [-0.014, 0.017] | 0.784 |
| Transfer | XGBoost original minus creation-time features | +0.002 | [-0.007, 0.012] | 0.702 |
| Transfer | XGBoost creation-time minus base-category-only | +0.015 | [0.002, 0.028] | 0.022 |
| SLA breach | XGBoost vs Logistic Regression (original features) | +0.124 | [0.098, 0.149] | < 0.002 |
| SLA breach | XGBoost vs Random Forest (original features) | +0.282 | [0.245, 0.323] | < 0.002 |
| SLA breach | XGBoost vs Logistic Regression (creation-time features) | -0.027 | [-0.045, -0.007] | 0.010 |
| SLA breach | XGBoost original minus creation-time features | +0.203 | [0.178, 0.230] | < 0.002 |
| SLA breach | XGBoost creation-time minus base-category-only | +0.008 | [-0.004, 0.021] | 0.196 |
| Priority | XGBoost vs Logistic Regression (original features) | +0.037 | [0.018, 0.056] | < 0.002 |
| Priority | XGBoost vs Random Forest (original features) | +0.055 | [0.037, 0.073] | < 0.002 |
| Priority | XGBoost vs Logistic Regression (creation-time features) | -0.064 | [-0.088, -0.038] | < 0.002 |
| Priority | XGBoost original minus creation-time features | +0.264 | [0.240, 0.291] | < 0.002 |
| Priority | XGBoost creation-time minus base-category-only | -0.006 | [-0.013, 0.002] | 0.148 |
| Action | XGBoost vs Logistic Regression (original features) | +0.023 | [0.007, 0.039] | 0.010 |
| Action | XGBoost vs Random Forest (original features) | +0.025 | [0.014, 0.038] | < 0.002 |
| Action | XGBoost vs Logistic Regression (creation-time features) | +0.005 | [-0.011, 0.022] | 0.546 |
| Action | XGBoost original minus creation-time features | +0.117 | [0.102, 0.132] | < 0.002 |
| Action | XGBoost creation-time minus base-category-only | -0.001 | [-0.009, 0.006] | 0.786 |

| Task | creation-time (category with `__ROOT_` suffix) | base category only | Δ |
| --- | ---: | ---: | ---: |
| Escalation | 0.746 | 0.740 | -0.006 |
| Transfer | 0.726 | 0.711 | -0.015 |
| SLA breach | 0.599 | 0.592 | -0.008 |
| Priority | 0.560 | 0.566 | +0.006 |
| Action | 0.586 | 0.588 | +0.001 |

</details>

### 8.4 Group-disjoint evaluation (E4)

Creation-time features are used throughout. Each cell is the mean ± standard deviation over 3 seeds, with 15% held out. A store-disjoint test set holds 6 of the 36 stores.

| Task | Model | Random split | Unseen incident groups | Unseen stores |
| --- | ---: | ---: | ---: | ---: |
| Escalation | XGBoost | 0.754 ± 0.010 | 0.768 ± 0.010 | 0.751 ± 0.008 |
| Escalation | Logistic Regression | 0.757 ± 0.006 | 0.773 ± 0.011 | 0.752 ± 0.006 |
| Transfer | XGBoost | 0.721 ± 0.016 | 0.723 ± 0.006 | 0.713 ± 0.009 |
| Transfer | Logistic Regression | 0.720 ± 0.011 | 0.730 ± 0.008 | 0.719 ± 0.010 |
| SLA breach | XGBoost | 0.584 ± 0.011 | 0.585 ± 0.003 | 0.615 ± 0.000 |
| SLA breach | Logistic Regression | 0.598 ± 0.010 | 0.602 ± 0.003 | 0.627 ± 0.006 |
| Priority | XGBoost | 0.564 ± 0.002 | 0.547 ± 0.008 | 0.563 ± 0.008 |
| Priority | Logistic Regression | 0.613 ± 0.007 | 0.607 ± 0.006 | 0.614 ± 0.005 |
| Action | XGBoost | 0.588 ± 0.003 | 0.589 ± 0.005 | 0.590 ± 0.011 |
| Action | Logistic Regression | 0.565 ± 0.015 | 0.564 ± 0.010 | 0.565 ± 0.010 |

![XGBoost under group-disjoint evaluation](experiments/figures/split_protocols.png)

### 8.5 Similar-ticket retrieval (E5)

There are 1,562 queries (the generator's `test` split) against a corpus of 14,000 tickets. On average 16.9 tickets are relevant per query. A random ranking would score P@1 ≈ 0.0012.

| Protocol | Method | P@1 | P@3 | MRR | nDCG@3 | Top-1 same category | ms/query |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A. HEAD code: query + corpus include resolution summary | TF-IDF | 0.028 | 0.026 | 0.047 | 0.026 | 1.000 | 21.4 |
| A. HEAD code: query + corpus include resolution summary | BM25 | 0.026 | 0.025 | 0.045 | 0.025 | 1.000 | 3.1 |
| B. new-ticket query (no resolution summary), resolved corpus | TF-IDF | 0.024 | 0.025 | 0.043 | 0.025 | 1.000 | 21.6 |
| B. new-ticket query (no resolution summary), resolved corpus | BM25 | 0.024 | 0.022 | 0.040 | 0.022 | 1.000 | 3.0 |
| C. no resolution summary on either side | TF-IDF | 0.026 | 0.024 | 0.043 | 0.024 | 1.000 | 18.5 |
| C. no resolution summary on either side | BM25 | 0.029 | 0.024 | 0.045 | 0.025 | 1.000 | 2.9 |
| D. A + group metadata (text described in the committed report) | TF-IDF | 0.059 | 0.058 | 0.103 | 0.059 | 1.000 | 24.3 |
| D. A + group metadata (text described in the committed report) | BM25 | 0.038 | 0.036 | 0.066 | 0.037 | 1.000 | 4.2 |

For comparison, the committed report gives BM25 P@1 = 0.573 and MRR = 0.651 (`ml/reports/03_similar_ticket_retrieval_summary.md`).

On the current generator the top-ranked ticket is always in the query's incident category. Each category, however, contains on average 34.0 groups (maximum 65), so within-category group identity is close to unrecoverable from the text.

### 8.6 Inference robustness and latency (E6)

Each cell shows the outcome of one CLI invocation and its wall-clock time, including Python start-up and model load.

| Case | Escalation | Transfer | SLA breach | Priority | Action |
| --- | ---: | ---: | ---: | ---: | ---: |
| empty batch | ok (1.8s) | ok (1.6s) | ok (1.6s) | ok (1.6s) | ok (1.7s) |
| single valid ticket | ok (1.7s) | ok (1.7s) | ok (1.6s) | ok (1.6s) | ok (1.6s) |
| batch of 50 | ok (1.6s) | ok (1.7s) | ok (1.6s) | ok (1.8s) | ok (1.9s) |
| nulls for optional fields | ok (1.6s) | ok (1.6s) | ok (1.6s) | ok (1.7s) | ok (1.8s) |
| unseen categories | ok (1.7s) | ok (1.7s) | ok (1.6s) | ok (1.7s) | ok (1.6s) |
| empty strings | ok (1.6s) | ok (1.6s) | ok (1.7s) | ok (1.7s) | ok (1.7s) |
| very long description 50k chars | ok (1.7s) | ok (1.7s) | ok (1.7s) | ok (1.7s) | ok (1.6s) |
| non ascii french text | ok (1.6s) | ok (1.7s) | ok (1.6s) | ok (1.7s) | ok (1.6s) |
| string in numeric field | ok (1.6s) | ok (1.8s) | ok (1.6s) | ok (1.6s) | ok (1.7s) |
| missing required key | error (exit 1) | error (exit 1) | error (exit 1) | error (exit 1) | error (exit 1) |
| malformed json | error (exit 1) | error (exit 1) | error (exit 1) | error (exit 1) | error (exit 1) |
| wrong top level shape | error (exit 1) | error (exit 1) | error (exit 1) | error (exit 1) | error (exit 1) |
| determinism same batch twice | identical | identical | identical | identical | identical |

- **Error handling:** malformed JSON and a wrong top-level shape return a structured `{"ok": false}` error. A missing feature key instead raises an uncaught `KeyError` with only a stack trace on stderr, and the TypeScript runner then rejects the whole 50-ticket chunk.
- **Silent coercion:** a string in a numeric field (`"abc"`) is coerced to NaN, median-imputed and scored without any warning.
- **Latency:** in-process prediction costs 0.06–0.16 ms per row (E1). A CLI call costs 1.6–1.9 s regardless of batch size, so process start-up and model loading dominate.

### 8.7 LLM-explanation rubric (E7)

Every row below is scored with `score_explanation()` over the same 50 evaluation contexts. Only the first three rows involve an LLM.

| Response source | Clarity | Relevance | Completeness | Consistency | Halluc. control | Overall | Halluc. flag rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mistral (reported, live LLM) | 4.30 | 3.90 | 4.55 | – | 4.00 | 4.07 | – |
| Llama3 (reported, live LLM) | 4.30 | 3.90 | 4.55 | – | 4.00 | 4.07 | – |
| DeepSeek R1 (reported, live LLM) | 4.00 | 3.74 | 3.98 | – | 4.00 | 3.86 | – |
| template fallback | 3.80 | 3.69 | 4.55 | 3.60 | 4.00 | 3.93 | 0% |
| format only filler | 4.30 | 3.22 | 4.55 | 3.60 | 4.00 | 3.93 | 0% |
| filler with fabrication | 4.30 | 3.29 | 4.55 | 3.60 | 4.00 | 3.95 | 0% |
| contradiction | 4.30 | 3.25 | 4.55 | 3.60 | 4.00 | 3.94 | 0% |
| empty | 3.20 | 3.00 | 2.80 | 3.60 | 4.00 | 3.32 | 0% |

The consistency check only fires on the phrase "escalation is predicted as required", which appears in **0 of the 50** contexts. Consistency is therefore a constant 3.60.

### 8.8 Training/serving shift on operational tickets (E8)

| Measure | Training distribution (test split, n = 2,100) | Operational CARE tickets (n = 70) |
| --- | ---: | ---: |
| Share of unigrams in the escalation model's TF-IDF vocabulary | 0.824 | 0.293 |
| Escalation probability (min / median / max) | – | 0.133 / 0.185 / 0.324 |
| Tickets above the 0.45 threshold | – | 0 |
| ROC-AUC of the deployed `xgboost.joblib` (operational column: against the hand-authored catalog labels, 15 positives) | 0.739 (E1) | 0.461 [0.300, 0.623] |
| Recall of the stored decision (after the calibration rule) | – | 0.000 (2 flagged, both incorrect) |

The operational tickets are written in French; the ML corpus is English. `clean_text()` also deletes accented characters ("bloquée" → "bloqu e").

---

## 9. Experimental findings and interpretation

Each finding states what was **observed**. Explanations that are not directly measured are labelled as hypotheses.

**F1. The committed ML results are not reproducible from the committed code, and that is now fixed going forward.**
- *Observed (§5.6, §8.1):*
  - The generator's output depended on wall-clock time and timezone. A 10-minute clock shift changes ~37–39% of the binary labels (E0).
  - The CSV export, the reports and the model files come from at least two different generator versions: the KM article count was 92 in one report and 102 in the code; the escalation positive rate was ~18% in the report and 40% now.
- *Fixed:* pinning `--generated-at` and `TZ=UTC` makes the data a pure function of the seed (two identical runs).
- *Observation worth noting:* SLA (−0.005) and priority (−0.010) reproduce best. They are the two tasks whose scores depend most on leaked features (F2).

**F2. SLA, priority and action scores are inflated by post-outcome and label-derived features; escalation and transfer are not.**
- *Observed:*
  - Restricting to creation-time features costs **0.203 F1** for SLA, **0.264 macro-F1** for priority and **0.117 macro-F1** for action (all CIs exclude 0).
  - It costs nothing measurable for escalation (+0.001) or transfer (+0.002).
- *Mechanism, from generator source and E2:*
  - For resolved tickets, SLA breach is a deterministic function of `ticket_age / resolution_time`.
  - `operational_complexity` adds fixed increments for the escalation and transfer labels.
- *Realistic creation-time performance* on this synthetic task:
  - SLA breach: F1 ≈ 0.60–0.63 (ROC-AUC 0.764 for XGBoost);
  - priority: macro-F1 ≈ 0.62;
  - action: macro-F1 ≈ 0.58–0.59.

**F3. XGBoost's reported superiority is an artefact of the comparison setup.**
- *Observed:*
  - With an equal text budget and a validation-tuned $C$, logistic regression is statistically indistinguishable from XGBoost for escalation (Δ −0.009, p = 0.19) and transfer (Δ +0.006, p = 0.42).
  - With creation-time features, logistic regression is significantly better for SLA (−0.027) and priority (−0.064).
  - XGBoost's large SLA advantage appears only when leaked features are present (+0.124 with them, −0.027 without).
- *Hypothesis:* the leak is an interaction (a ratio of two fields). Trees can approximate it; a linear model on standardised features cannot. Leakage therefore looked like model superiority.
- *Implication:* a linear model is the better default here. It is cheaper, calibrates more easily, and its coefficients can be inspected.

**F4. Group- and store-disjoint splits did not reduce performance. This refutes RQ5's hypothesis, but it does not establish generalisation.**
- *Observed:* scores are flat across random, unseen-group and unseen-store splits (§8.4).
- *Interpretation:*
  - Labels in this generator depend on incident templates, perimeter and latent scores, not on store or group identity.
  - Because titles are per-category templates (637 distinct titles), holding out groups or stores still leaves the same templates in training.
  - The stricter test, unseen incident categories, is listed in §7.3.

**F5. Similar-ticket ground truth is not identifiable from text on the current generator.**
- *Observed:*
  - Retrieval always finds the right incident category, but P@1 is ≈ 0.026. That matches choosing among the ~34 groups of a category at random.
  - Adding back the group metadata that the committed report says it used raises P@1 only to 0.059 for TF-IDF.
  - Removing the resolution summary from queries, as for a new ticket, barely changes the scores.
- *Conclusion:* the reported 0.573 P@1 cannot be reproduced. On this generator the metric measures how groups were assigned within a category, not retrieval quality. Category-level relevance (already 100% at top-1) or KM-level relevance would be the meaningful targets.

**F6. The LLM rubric measures layout, not explanation quality.**
- *Observed:*
  - A response with the right five headings and generic text unrelated to the ticket scores 3.93 overall. That is above the reported DeepSeek R1 (3.86) and 0.14 below Mistral (4.07).
  - Inventing people, sites and vendor case numbers is not flagged (0%).
  - The consistency criterion never triggers.
  - The reported "0% hallucination" and the model ranking are therefore not evidence of explanation quality.

**F7. In the demo path, the deployed escalation model contributes no decision-relevant signal.**
- *Observed:*
  - On the 70 operational tickets, the model's ROC-AUC is 0.461 and no ticket crosses its threshold.
  - Only 29% of their tokens are in its vocabulary (82% for the training distribution).
  - By design (§4.4), the workflow that produces the final suggestion does not read the escalation output.
- *Interpretation:* the end-to-end system works as a rule-based assistant with ML signals displayed alongside. It is not ML-driven triage.

**F8. The inference contract is robust to common noise, fragile to schema drift, and dominated by start-up cost.**
- *Observed (§8.6):*
  - It accepts unseen categories, nulls, long and non-ASCII text deterministically.
  - It crashes on a missing key and silently coerces invalid numerics.
  - A call costs ~1.6–1.9 s of process and model start-up versus < 0.2 ms per row of prediction.

---

## 10. Failure analysis and limitations

### Model and data

- **Synthetic labels.** Targets are produced by thresholding latent scores and injecting noise. Any metric measures how well a model recovers the generator's rules, not operational reality. No result in this repository is evidence of performance on real tickets.
- **Leakage in the original feature sets** (F2). Models trained on `original` features (including the deployed artifacts) rely on fields that do not exist when a ticket is opened. At inference the app substitutes values computed now, such as SLA breach from `sla_due_at` versus the current time, or predicted labels from other models. That creates a training/serving mismatch.
- **Language mismatch** (F7): an English training corpus, French operational tickets, and ASCII-only text cleaning.
- **Template-dominated text:** 637 titles. Models mostly learn category templates; the per-ticket descriptions add limited signal.
- **Ground-truth validity for retrieval** (F5); KM and missing-information benchmarks not re-audited (§7.1).
- **Model selection on the test split** in the original benchmarks. The validation split was created but unused.

### System and recommendation layer

- **Rule-based decisions:** the suggestion shown to agents is rule-based (§4.4).
- **Confidence is not a probability:** the displayed confidence is a fixed band plus jitter. Agents could read 85–95% as model certainty.
- **Pre-set demo outcomes:**
  - Outcomes for the 70 catalogued CARE-OP tickets are predetermined (`lib/care-operational/catalog-operational-outcome.ts`).
  - The demo-scenario seed writes hand-written values into the `ai_*` tables, labelled with production model versions (`lib/ai/seed-demo-scenarios.ts`).
  - `scripts/validate-decision-consistency.ts` checks the decision mix against target ranges.
  - Demo screens therefore reflect authored scenarios, not model behaviour.
- **Similar-ticket retrieval is disabled** in the live path; the UI shows seeded preview rows.
- **Python bridge reliability** (F8):
  - one process per 50-ticket chunk;
  - an uncaught `KeyError` on schema drift;
  - the KM and similar-ticket bridges hard-code `python`, ignoring `PYTHON_PATH`;
  - pickles need matching scikit-learn and XGBoost versions.
- **Authentication gaps:** only the AI run endpoints, `POST /api/sync/run` and a few reads check the session; most `GET /api/*` routes, including `/api/admin/*`, are unauthenticated. The admin role list contains `"Superviseur"` but the seeded role is `"Supervisor"`. The seeded demo password has a default value.
- **Stale documentation:** `POST /api/sync/care` now returns HTTP 410, and `bun run db:sync` is referenced in scripts and docs but is not defined in `package.json`.

### Code health

At the audited commit (`3c02b61`), CI (lint → typecheck → test) failed:

| Check | Before | Now |
| --- | --- | --- |
| `bun test tests` | 14 pass / 1 fail | 15 pass |
| `bun run typecheck` | 21 errors | 0 errors |
| `bun run lint` | 61 errors, 52 warnings | 0 errors, 88 warnings |

What changed:
- **The failing test.** `tests/rules-engine.test.ts` was stale. Commit `5303ff8` replaced the engine's French action strings with the app-wide decision labels ("Escalate N3"), while the test's regex was only translated word for word.
- **Type errors.** They were fixed without behaviour changes: missing union cases, literal-type widening, unused excess properties, an incomplete CLI client, and stale script types. One was a genuine bug: the legacy `scripts/seed.ts` never set the NOT NULL `store_id`.
- **Lint errors in application components.** These came from the React 19 hook rules:
  - setState-in-effect patterns now use `useSyncExternalStore` (`hooks/use-local-storage-flag.ts`, `hooks/use-mobile.ts`) or state adjustment during render;
  - `Math.random()` ids now use `useId()`;
  - `require()` calls now use static imports.
- **Scoped warnings in `components/charts/**`.** Only there are `react-hooks/refs` and `react-hooks/set-state-in-effect` reported as warnings (`eslint.config.mjs` explains why). These visx/motion primitives read refs during render for path measurement, springs and portal containers. React Compiler is not enabled, and changing that logic needs visual regression tests.
- **Verification limits.** `next build` compiles successfully. Static prerendering needs a database, because some pages query it at build time; CI does not build.

Other issues:
- **Seed scripts hang:** `scripts/seed-care-operational.ts` and `scripts/seed-carepilot-auth.ts` finish their work but do not exit, because the connection pool is left open.
- **Vacuous smoke test:** the Postgres smoke test passes vacuously unless `RUN_INTEGRATION=1`.

### What this project does not claim

No clinical, safety or production validation; no field evaluation with real agents; no statistical claim beyond the single pinned synthetic dataset. The bootstrap intervals capture test-set sampling only, not variation across training runs or generator versions.

---

## 11. Reproducibility

Everything in this section was executed for this revision on Windows 11 with:
- Bun 1.3.13 and Node 22.19;
- Docker with `pgvector/pgvector:pg16`;
- Python 3.13.7 (pandas 2.3.3, scikit-learn 1.7.2, XGBoost 3.1.2).

Outcomes are noted where a step does not behave as expected.

### 11.1 Install

```bash
bun install                      # bun.lock is now in sync with package.json (it was not at the audited commit)
pip install -r ml/requirements.txt
```

The committed `.joblib` artifacts load with scikit-learn 1.7.x and XGBoost 3.1.x; pin these versions if you use them. The Python benchmarks connect with a plain `postgresql://` URL, which SQLAlchemy maps to psycopg2. `ml/requirements.txt` lists psycopg (v3), so either install `psycopg2-binary` or use `postgresql+psycopg://…`. The audit scripts select a driver automatically.

### 11.2 Database and ML training data (deterministic)

```bash
docker compose up -d                                         # pgvector/pgvector:pg16 on localhost:5433
export DATABASE_URL=postgresql://carepilot:carepilot@localhost:5433/carepilot
bun scripts/db-ping.ts
TZ=UTC bun scripts/seed-ml-training.ts --generated-at=2026-05-25T00:00:00Z
# → "ml_training seeded: 14000 tickets, 32875 actions, 8375 resolutions, 102 KM articles, 42000 export rows."
```

- **Fresh databases:** the seed script now applies the missing-information column patch itself (`sql/patches/020_…`), so it works on an empty database.
- **Windows and `tsx`:** the `package.json` aliases (`bun run db:*`) call `tsx`. On Windows, Bun's `tsx` shim failed in this environment ("preload not found"), so the scripts are invoked as `bun scripts/<name>.ts`.

### 11.3 Training and evaluation

```bash
# Original benchmark for one task (writes metrics, plots, report and joblib under <project-root>/ml/)
python ml/benchmarks/escalation/benchmark.py --database-url "$DATABASE_URL"

# Evaluation audit (results → experiments/results, figures → experiments/figures)
python experiments/00_generator_determinism.py   # re-seeds ml_training 5× and leaves the pinned dataset
python experiments/01_reproduce_reported.py
python experiments/02_leakage_probes.py
python experiments/03_baselines_and_feature_availability.py
python experiments/04_split_protocols.py
python experiments/05_retrieval_ablation.py
python experiments/06_inference_robustness.py
python experiments/07_llm_rubric_audit.py
python experiments/09_figures.py
python experiments/make_tables.py        # prints every table in §8 from the JSON results
```

The original benchmark scripts overwrite the committed artifacts in `ml/` unless you pass `--project-root <scratch dir>`. Protocol details and runtimes are in [`experiments/README.md`](experiments/README.md).

### 11.4 Application (backend + frontend)

This order was verified against an empty pgvector database:

```bash
bun scripts/init-db.ts                         # care_source, carepilot, cp_agent schemas + vector extension
bun scripts/apply-care-operational-patch.ts
bun scripts/seed-care-operational.ts           # prints "CARE France seeded: 36 stores, 70 tickets"; then Ctrl+C (does not exit)
bun scripts/seed-carepilot-auth.ts             # creates demo users; then Ctrl+C (does not exit)
bun scripts/apply-cp-agent-schema.ts
bun scripts/apply-sync-patch.ts
bun scripts/apply-cp-admin-schema.ts
bun scripts/apply-fo-perimeter-rename.ts
for t in escalation transfer action sla priority km similar missing-information operational-explanations; do
  bun scripts/apply-ai-$t-schema.ts
done

bun run dev                                    # Next.js on http://localhost:3000 (/login → 200)
CARE_API_BASE_URL=http://127.0.0.1:3000 bun scripts/run-care-sync.ts     # 70 tickets → cp_agent
PYTHON_PATH=$(which python) bun scripts/run-escalation-predictions.ts   # writes cp_agent.ai_escalation_predictions
python experiments/08_operational_shift.py
```

After these steps, these endpoints returned HTTP 200:
- `/login`
- `/api/care/tickets`
- `/api/tickets`
- `/api/dashboard/metrics`
- `/api/ai/escalation/predictions`

The authenticated UI flows were not exercised in this audit. Ollama is optional; without it, explanations use the template fallback.

### 11.5 Inference from the command line

```bash
echo '{"tickets":[{"ticket_id":"T1","title":"Payment terminal offline","description":"TPE does not respond at lane 3",
  "perimeter":"Payment","priority":"P2","sla_breached":false,"resolution_time_minutes":null,"incident_category":"PAYMENT_TERMINAL_OFFLINE"}]}' \
| python ml/inference/escalation_predict.py --model ml/artifacts/models/xgboost.joblib
# → {"ok": true, "predictions": [{"ticket_id": "T1", "predicted_escalation_required": ..., "probability_score": ...}]}
```

### 11.6 Tests

```bash
bun test tests          # 15 pass
bun run typecheck       # 0 errors
bun run lint            # 0 errors (88 warnings; see §10)
```

The same three steps run in GitHub Actions on every push (`.github/workflows/ci.yml`).

### 11.7 Changes made in this revision

- `scripts/seed-ml-training.ts`:
  - optional `--generated-at` / `ML_TRAINING_GENERATED_AT` for deterministic data;
  - applies patch 020 so a fresh database can be seeded.

  Default behaviour is unchanged.
- `bun.lock`: re-synced with `package.json` (removed the stale `server-only` entry).
- `.gitignore`: Python caches, virtual environments, local databases, ML caches, Ollama pull logs, coding-agent folders, and `.env.*` except `.env.example`.
- Untracked, but kept on disk: compiled `__pycache__/*.pyc`, `ml/artifacts/cache/*.npy` (21 MB embedding cache), `ml/artifacts/ollama_pull_*.log`, and local coding-agent configuration.
- Added `experiments/` (E0–E8, results, figures) and this README.
- CI fixes (§10, "Code health"): the stale unit test, 21 type errors, and 61 lint errors. These are behaviour-preserving apart from the legacy-seed `store_id` bug fix. ML code, models and decision logic are unchanged.

---

## 12. Project structure

```text
.
├── app/                          Next.js App Router
│   ├── agent/                    agent console: dashboard, tickets, ticket detail (+ server actions), actions, procedures
│   ├── admin/                    supervisor console: dashboard, escalations, queues, recommendations, feedback, users
│   ├── (carepilot)/              legacy routes (mostly redirects), KM catalogue, settings
│   ├── login/
│   └── api/                      61 route handlers: auth, sync, tickets, km, ai/<task>/{run,predictions}, care/*, admin/*
├── components/                   shadcn/ui primitives, charts, agent and admin views
├── lib/
│   ├── ai/                       per-task feature builders + Python bridge, batch runners, calibration,
│   │   └── orchestration/        signal aggregation, FO workflow decision, KM guard, confidence banding
│   ├── ml-training/              synthetic dataset generator (seeded, 14k tickets by default)
│   ├── services/sync/            CARE → cp_agent synchronisation
│   ├── care-api/, integrations/  CARE simulator REST layer and client
│   ├── care-operational/         70 catalogued operational tickets and demo scenarios
│   ├── rules/                    legacy rules engine (used by the carepilot.* pipeline)
│   ├── db/                       Drizzle schemas (care_source, cp_agent, carepilot, cp_admin, ml_training) and client
│   └── auth/                     scrypt password hashing, DB-backed sessions
├── ml/
│   ├── benchmarks/<task>/        preprocessing.py · benchmark.py · evaluation.py · visualization.py · reports/
│   ├── inference/                stdin/stdout JSON CLIs spawned by lib/ai
│   ├── notebooks/<task>/         01 exploration · 02 preprocessing · 03 benchmark (28 notebooks)
│   ├── artifacts/                joblib pipelines, metrics JSON/CSV, run logs
│   ├── plots/, reports/          figures and Markdown summaries from the original benchmarks
│   └── exports/                  historical_tickets.csv (stale snapshot of an earlier generator, §5.6)
├── experiments/                  evaluation audit E1–E8, results/*.json, figures/*.png
├── scripts/                      schema application, seeds, sync, batch inference, validation
├── sql/                          init.sql and numbered patches
├── drizzle/                      generated migration and snapshot
├── docs/                         architecture notes, demo scenarios, report material
├── tests/                        bun:test unit tests and a gated Postgres smoke test
└── docker-compose.yml            pgvector/pgvector:pg16 on localhost:5433
```

---

## 13. Technology stack

| Layer | Technology |
| --- | --- |
| Web framework | Next.js 16.1 (App Router, Turbopack dev), React 19, TypeScript 5.9 |
| UI | Tailwind CSS 4, shadcn/ui (Radix / Base UI), Recharts 3, visx |
| Data access | Drizzle ORM 0.45, postgres.js 3.4, zod 4 |
| Database | PostgreSQL 16 with pgvector (Docker image `pgvector/pgvector:pg16`) |
| Runtime and tooling | Bun (package manager, test runner `bun:test`), tsx, ESLint, Prettier |
| ML (Python) | pandas, NumPy, scikit-learn (TF-IDF, one-hot, LR, RF), XGBoost, rank-bm25, sentence-transformers (`all-MiniLM-L6-v2`), matplotlib/seaborn |
| Model format | `joblib`-serialised scikit-learn `Pipeline`s (dict bundles with `LabelEncoder` for multiclass) |
| ML ↔ app integration | Node `child_process.spawn` of Python CLIs, JSON over stdin/stdout, batch upserts into `cp_agent.ai_*` |
| LLM | Ollama (`mistral` default; `llama3`, `deepseek-r1` benchmarked), template fallback; optional OpenAI for the legacy summariser |
| CI | GitHub Actions: `bun install`, `lint`, `typecheck`, `bun test` |

---

## 14. Future research and improvements

None of the items below has been implemented. They follow from the findings in §9.

**Evaluation protocol**
1. Make the creation-time feature set the default for all supervised tasks. Retrain the deployed artifacts on it, and regenerate the reports from the pinned dataset (§11.2).
2. Select models and thresholds on validation only, and report test once. Add reliability curves (ECE) and choose the escalation and SLA thresholds from an explicit cost of a missed escalation versus an unnecessary one.
3. Add category-disjoint and temporal splits (§7.3), and repeat training across seeds to separate training variance from test-sampling variance.
4. Re-run the KM and missing-information benchmarks under the same audit. Check whether the KM ground truth is derivable from generator keywords by construction.
5. Replace the LLM rubric with a reference-based or human evaluation that includes deliberately defective responses as negative controls (E7 provides a starting set).

**Data**
6. Generate the training corpus in the operational language (French), or score the operational tickets with a multilingual encoder. Keep accented characters in `clean_text()`. E8 is the regression test.
7. Make generator variables either observable (documented as available at creation) or excluded. `operational_complexity` should not be computed from labels.
8. Redefine similar-ticket relevance at a level the text can identify (category or root cause), or make group identity observable.

**System**
9. Replace the per-chunk subprocess with a long-lived inference worker (or ONNX export) to remove the ~1.6 s start-up per call, and validate payloads with a schema before prediction.
10. Either feed calibrated model probabilities into the workflow decision with explicit rules, or stop presenting banded values as "confidence".
11. Add authentication to the unauthenticated API routes, fix the `Supervisor`/`Superviseur` role mismatch, close the database pools in seed scripts, and make the chart primitives compliant with the React Compiler rules (with visual regression tests) so the scoped lint override can be removed.

---

*CarePilot was built as an end-of-studies engineering project. The ML data are synthetic, and the evaluation audit in this README was added afterwards to document what the experiments do and do not support.*
