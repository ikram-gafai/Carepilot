/** Shown in UI while non-Task-1/2 AI features are disabled. */
export const PENDING_AI_TRAINING = "Formation IA en attente"

/** Task 1 — XGBoost escalation prediction is active. */
export const ESCALATION_MODEL_ACTIVE = "Task 1 Active: Escalation Prediction"

/** Task 2 — XGBoost transfer prediction is active. */
export const TRANSFER_MODEL_ACTIVE = "Task 2 Active: Transfer Prediction"

/** Task 3 — XGBoost action recommendation is active. */
export const ACTION_MODEL_ACTIVE = "Task 3 Active: Action Recommendation"

/** Only escalation prediction is enabled; transfer/KM/SLA/classification/similar stay off. */
export const ESCALATION_PREDICTION_ENABLED = true

/** Task 2 transfer prediction is enabled. */
export const TRANSFER_PREDICTION_ENABLED = true

/** Task 3 — XGBoost action recommendation is active. */
export const ACTION_RECOMMENDATION_ENABLED = true

/** Legacy gate for classification and similar-incident features (KM Task 6 is enabled separately). */
export const AI_PHASE_DISABLED = true

export const ESCALATION_MODEL_NAME = "XGBoost"
export const ESCALATION_MODEL_VERSION = "xgboost_escalation_v1"
export const ESCALATION_MODEL_DISPLAY = "XGBoost Escalation v1"
export const ESCALATION_MODEL_ARTIFACT = "ml/artifacts/models/xgboost.joblib"

export const TRANSFER_MODEL_NAME = "XGBoost"
export const TRANSFER_MODEL_VERSION = "xgboost_transfer_v1"
export const TRANSFER_MODEL_DISPLAY = "XGBoost Transfer v1"
export const TRANSFER_MODEL_ARTIFACT = "ml/artifacts/models/xgboost_transfer.joblib"

export const ACTION_MODEL_NAME = "XGBoost"
export const ACTION_MODEL_VERSION = "xgboost_action_v1"
export const ACTION_MODEL_DISPLAY = "XGBoost Action v1"
export const ACTION_MODEL_ARTIFACT = "ml/artifacts/models/xgboost_action.joblib"

/** Task 4 — XGBoost SLA breach prediction is active. */
export const SLA_MODEL_ACTIVE = "Task 4 Active: SLA Breach Prediction"

export const SLA_PREDICTION_ENABLED = true

export const SLA_MODEL_NAME = "XGBoost"
export const SLA_MODEL_VERSION = "xgboost_sla_v1"
export const SLA_MODEL_DISPLAY = "XGBoost SLA v1"
export const SLA_MODEL_ARTIFACT = "ml/artifacts/models/xgboost_sla.joblib"

/** Task 5 — XGBoost priority prediction is active. */
export const PRIORITY_MODEL_ACTIVE = "Task 5 Active: Priority Prediction"

export const PRIORITY_PREDICTION_ENABLED = true

export const PRIORITY_MODEL_NAME = "XGBoost"
export const PRIORITY_MODEL_VERSION = "xgboost_priority_v1"
export const PRIORITY_MODEL_DISPLAY = "XGBoost Priority v1"
export const PRIORITY_MODEL_ARTIFACT = "ml/artifacts/models/xgboost_priority.joblib"

/** Task 6 — Sentence-transformer KM retrieval is active. */
export const KM_RECOMMENDATION_ACTIVE = "Task 6 Active: KM Recommendation"

export const KM_RECOMMENDATION_ENABLED = true

export const KM_MODEL_NAME = "Sentence Transformers"
export const KM_MODEL_VERSION = "minilm_km_v1"
export const KM_MODEL_DISPLAY = "MiniLM KM Retrieval v1"
export const KM_MODEL_ARTIFACT = "ml/artifacts/models/km_retrieval_minilm.joblib"

/** Task 7 — static historical reference preview (NLP retrieval benchmark paused). */
export const SIMILAR_TICKET_PREVIEW_ACTIVE = "Task 7 Preview: Historical Similar Cases"

/** Read seeded preview rows from cp_agent.ai_similar_ticket_results. */
export const SIMILAR_TICKET_PREVIEW_ENABLED = true

/** Live embedding retrieval benchmark — experimental; do not run in demo UI. */
export const SIMILAR_TICKET_RETRIEVAL_RUN_ENABLED = false

/** @deprecated Use SIMILAR_TICKET_PREVIEW_ENABLED for UI reads. */
export const SIMILAR_TICKET_RETRIEVAL_ENABLED = SIMILAR_TICKET_PREVIEW_ENABLED

/** @deprecated Use SIMILAR_TICKET_PREVIEW_ACTIVE. */
export const SIMILAR_TICKET_RETRIEVAL_ACTIVE = SIMILAR_TICKET_PREVIEW_ACTIVE

export const SIMILAR_TICKET_MODEL_NAME = "Sentence Transformers"
export const SIMILAR_TICKET_MODEL_VERSION = "minilm_similar_ticket_v1"
export const SIMILAR_TICKET_MODEL_DISPLAY = "MiniLM Similar Ticket Retrieval v1 (experimental)"
export const SIMILAR_TICKET_MODEL_ARTIFACT = "ml/artifacts/models/similar_ticket_retrieval_minilm.joblib"

/** Task 8 — rule-based missing information / operational completeness analysis. */
export const MISSING_INFORMATION_ANALYSIS_ACTIVE = "Task 8 Active: Missing Information Detection"

export const MISSING_INFORMATION_ANALYSIS_ENABLED = true

export const MISSING_INFORMATION_MODEL_NAME = "Operational Heuristics"
export const MISSING_INFORMATION_MODEL_VERSION = "heuristics_missing_info_v1"
export const MISSING_INFORMATION_MODEL_DISPLAY = "Operational Completeness Heuristics v1"

/** Task 9 — local LLM operational explanation via Ollama. */
export const LLM_EXPLANATION_ACTIVE = "Task 9 Active: LLM Operational Explanation"

export const LLM_EXPLANATION_ENABLED = true

export const LLM_EXPLANATION_MODEL_NAME = "Mistral"
export const LLM_EXPLANATION_MODEL_VERSION = "ollama_mistral_v1"
export const LLM_EXPLANATION_MODEL_DISPLAY = "Mistral 7B Instruct (Ollama local)"
