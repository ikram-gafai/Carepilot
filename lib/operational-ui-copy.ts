/**
 * Enterprise ITSM copy — title = what the section is, subtitle = operational meaning.
 */

export const ADMIN_PAGE_DESCRIPTIONS = {
  dashboard: "Indicateurs FO synchronisés CARE",
  queues: "Charge et tendances par périmètre",
  escalations: "Analyse des orientations N3 FO",
  recommendations: "Suivi des décisions IA et validations agents",
  feedback: "Suivi des validations agent",
  users: "Charge et disponibilité équipe",
} as const

export const ADMIN_SECTION_SUBTITLES = {
  slaTrend: "Évolution sur 7 jours",
  decisionAlignment: "Conformité aux suggestions CAREPILOT",
  transfersByTarget: "Routage inter-périmètres",
  kmEffectiveness: "Résultats après procédure KM",
  topStores: "Sites à forte activité ticket",
  recentTickets: "Dernières mises à jour file",
  careSync: "État des flux d'ingestion",
  aiPipeline: "Taux d'exécution par étape",
  suggestedDecisions: "Répartition des décisions proposées",
  slaSupervision: "Exposition contractuelle en file",
  transferChart: "Volume par périmètre cible",
  modelCoverage: "Tickets traités par modèle",
  aiRecommendations: "File active — décisions orchestrées",
  transferSupervision: "Routages suggérés en attente",
  kmSupervision: "Usage procédures sur incidents",
  alignmentDiagnostics: "Couverture actions et retours",
  agentFeedback: "Validations sur recommandations",
  recentDecisions: "Dernières actions vs suggestion",
  escalationPerimeter: "Volume N3 par périmètre",
  escalationConfidence: "Fiabilité des prédictions",
  agentWorkload: "Tickets assignés par agent",
} as const

export const ADMIN_KPI_HINTS = {
  openTickets: "en traitement",
  slaRisk: "exposition SLA",
  transfers: "routages actifs",
  escalateN3: "candidats N3",
  suspend: "en attente dépendance",
  aiStatus: "décisions tracées",
} as const

export const AI_PIPELINE_LABELS = {
  title: "Couverture traitement",
  subtitle: ADMIN_SECTION_SUBTITLES.aiPipeline,
  analyzed: "Tickets analysés",
  context: "Complétude évaluée",
  km: "Procédures KM associées",
  decisions: "Actions agent enregistrées",
} as const

export const AGENT_KPI_HINTS = {
  openTickets: "Tickets en cours d'analyse",
  slaAttention: "Exposition SLA active",
  escalation: "Candidats escalade N3",
  transfer: "Routages inter-périmètres",
  suspend: "En attente dépendance",
} as const

export const AGENT_SECTION_SUBTITLES = {
  priorityQueue: "Ordre de traitement file FO",
  highAttention: "Signaux SLA, N3 ou contexte insuffisant",
  recentActivity: "Dernières actions file FO",
  decisionAlignment: "Actions agent vs suggestions CAREPILOT",
  priorityWork: "Traitement immédiat requis",
  escalationCandidates: "Escalade à arbitrer",
  kmOpportunities: "Résolution locale possible",
  incompleteContext: "Informations à collecter",
  incompleteTickets: "Informations à collecter",
  slaExposure: "Répartition par statut contractuel",
  priorityDistribution: "Classification opérationnelle P1–P4",
  suggestedDecisions: "Actions proposées par CAREPILOT",
  decisionSupport: "Étapes d'analyse disponibles",
  contextQuality: "Prérequis avant traitement",
  operationalSignals: "N3, routage, SLA et priorité",
  suggestedAction: "Décision agent requise",
  kmReference: "Procédure applicable à l'incident",
  operationalSummary: "Synthèse des signaux agrégés",
  ticketActions: "Transitions workflow avec audit",
  recommendationValidation: "Retour pour supervision",
  explanationEmpty: "Synthèse à partir des signaux agrégés",
  missingAnalysisEmpty: "Champs requis avant traitement",
} as const

export const AGENT_WORKFLOW_SECTIONS = {
  quality: "Contexte manquant",
  risk: "Signaux opérationnels",
  action: "Action suggérée",
  km: "Référence KM",
  explanation: "Synthèse opérationnelle",
} as const
