/** Task 8 — rule-based operational completeness analysis (no embeddings). */

export const MISSING_INFORMATION_FIELD_KEYS = [
  "MISSING_STORE_IDENTIFIER",
  "MISSING_LANE_NUMBER",
  "MISSING_TERMINAL_ID",
  "MISSING_ERROR_MESSAGE",
  "MISSING_SCREENSHOT_REFERENCE",
  "MISSING_TIMESTAMP",
  "MISSING_TROUBLESHOOTING_STEPS",
  "MISSING_PAYMENT_REFERENCE",
  "MISSING_ENVIRONMENT_DETAILS",
  "VAGUE_DESCRIPTION",
  "GENERIC_TITLE",
  "MISSING_REPRODUCTION_STEPS",
] as const

export type MissingInformationField = (typeof MISSING_INFORMATION_FIELD_KEYS)[number]

/** Legacy snake_case keys stored in older analysis rows. */
export const LEGACY_MISSING_FIELD_MAP: Record<string, MissingInformationField> = {
  store_code: "MISSING_STORE_IDENTIFIER",
  lane_number: "MISSING_LANE_NUMBER",
  terminal_id: "MISSING_TERMINAL_ID",
  error_message: "MISSING_ERROR_MESSAGE",
  screenshot_reference: "MISSING_SCREENSHOT_REFERENCE",
  timestamp: "MISSING_TIMESTAMP",
  troubleshooting_steps: "MISSING_TROUBLESHOOTING_STEPS",
  payment_reference: "MISSING_PAYMENT_REFERENCE",
  environment_details: "MISSING_ENVIRONMENT_DETAILS",
  vague_description: "VAGUE_DESCRIPTION",
  generic_title: "GENERIC_TITLE",
  reproduction_steps: "MISSING_REPRODUCTION_STEPS",
}

export function normalizeMissingField(field: string): MissingInformationField {
  if ((MISSING_INFORMATION_FIELD_KEYS as readonly string[]).includes(field)) {
    return field as MissingInformationField
  }
  return LEGACY_MISSING_FIELD_MAP[field] ?? (field as MissingInformationField)
}

export function normalizeMissingFields(fields: string[]): MissingInformationField[] {
  return fields.map(normalizeMissingField)
}

export type OperationalQualityLevel = "COMPLETE" | "ADEQUATE" | "INCOMPLETE" | "POOR"

export type TicketForMissingInformationAnalysis = {
  id: number
  title: string
  description: string
  storeCode: string | null
  storeName: string | null
  perimeter: string | null
  category: string | null
}

export type MissingInformationAnalysisResult = {
  ticketId: number
  missingFields: MissingInformationField[]
  completenessScore: number
  qualityLevel: OperationalQualityLevel
  confidenceScore: number
  detectionMethod: string
}

export const MISSING_INFORMATION_DETECTION_METHOD = "rule_based_v1"
export const MISSING_INFORMATION_MODEL_VERSION = "heuristics_missing_info_v1"

const GENERIC_TITLE_PATTERNS = [
  /^checkout not working$/i,
  /^payment issue$/i,
  /^network problem$/i,
  /^pos (down|issue|problem)$/i,
  /^not working$/i,
  /^system (down|issue)$/i,
  /^help needed$/i,
  /^urgent$/i,
  /^incident$/i,
  /^problem at store$/i,
]

const VAGUE_PHRASES = [
  "not working",
  "doesn't work",
  "broken",
  "issue",
  "problem",
  "help",
  "urgent",
  "asap",
  "please fix",
  "check please",
]

const STORE_CODE_REGEX = /\bFR-[A-Z0-9]{3,}(?:-[A-Z0-9]+)?\b/i
const LANE_REGEX = /\b(?:lane|register|checkout|caisse)\s*[#:]?\s*\d{1,3}\b/i
const SCO_LANE_REGEX = /\bSCO\s*[#:]?\s*\d{1,3}\b/i
const TERMINAL_REGEX = /\b(?:terminal|tpe|pos|pin\s*pad|pinpad)\s*(?:id|#|:)?\s*[A-Z0-9-]{2,}\b/i
const ERROR_REGEX =
  /\b(?:ERR[-_]?\w+|error\s*(?:code|message)|timeout|timed out|authorization failed|auth(?:orization)?\s*(?:failed|declined)|sync failure|connection refused|host unreachable|failed with)\b/i
const SCREENSHOT_REGEX = /\b(?:screenshot|screen\s*shot|capture|attached|picture|photo|image|png|jpg)\b/i
const TIMESTAMP_REGEX =
  /\b(?:\d{1,2}[:h]\d{2}|since\s+\d+|at\s+\d{1,2}|yesterday|today|this morning|last night|\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2})\b/i
const TROUBLESHOOTING_REGEX =
  /\b(?:reboot(?:ed)?|restart(?:ed)?|power[\s-]?cycle|tried|attempted|cleared|reset|reloaded|reinstalled|unplugged|reconnected|already)\b/i
const PAYMENT_REF_REGEX =
  /\b(?:transaction|payment\s*ref|auth(?:orization)?\s*(?:code|ref)|rrn|card\s*(?:number|last)|wallet|tender|emv|contactless)\b/i
const ENVIRONMENT_REGEX =
  /\b(?:store|hyper|market|city|region|vlan|zone|rack|hub|switch|wan|vpn|sco|vlp|lane|perimeter|back[\s-]?office|monetique|network)\b/i
const REPRODUCTION_REGEX =
  /\b(?:after|when|occurs when|steps to reproduce|reproduce|following|during|while|before|once|every time|intermittent)\b/i

function combinedText(ticket: TicketForMissingInformationAnalysis): string {
  return `${ticket.title} ${ticket.description}`.trim()
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

function hasStoreCode(ticket: TicketForMissingInformationAnalysis, text: string): boolean {
  if (ticket.storeCode?.trim()) return true
  if (STORE_CODE_REGEX.test(text)) return true
  if (ticket.storeName && text.toLowerCase().includes(ticket.storeName.toLowerCase())) return true
  return false
}

function hasLaneNumber(text: string, category: string | null): boolean {
  if (LANE_REGEX.test(text) || SCO_LANE_REGEX.test(text)) return true
  if (category === "SCO" && /\bsco\b/i.test(text)) return true
  if (category === "CHECKOUT" && /\b(?:lane|checkout|vlp|pos)\b/i.test(text)) return true
  return false
}

function hasTerminalId(text: string): boolean {
  return TERMINAL_REGEX.test(text) || /\bterminal\s+\d+\b/i.test(text)
}

function hasErrorMessage(text: string): boolean {
  return ERROR_REGEX.test(text)
}

function hasScreenshotReference(text: string): boolean {
  return SCREENSHOT_REGEX.test(text)
}

function hasTimestamp(text: string): boolean {
  return TIMESTAMP_REGEX.test(text)
}

function hasTroubleshootingSteps(text: string): boolean {
  return TROUBLESHOOTING_REGEX.test(text)
}

function hasPaymentReference(text: string, category: string | null): boolean {
  if (PAYMENT_REF_REGEX.test(text)) return true
  if (category === "PAYMENT" && /\b(?:payment|card|emv|terminal)\b/i.test(text)) return true
  return false
}

function hasEnvironmentDetails(ticket: TicketForMissingInformationAnalysis, text: string): boolean {
  if (ticket.perimeter?.trim() && text.toLowerCase().includes(ticket.perimeter.toLowerCase())) return true
  if (ticket.storeName?.trim()) return true
  if (ENVIRONMENT_REGEX.test(text) && wordCount(text) >= 12) return true
  return false
}

function isVagueDescription(description: string): boolean {
  const trimmed = description.trim()
  if (trimmed.length < 60) return true
  const lower = trimmed.toLowerCase()
  const vagueHits = VAGUE_PHRASES.filter((p) => lower.includes(p)).length
  if (vagueHits >= 2 && wordCount(trimmed) < 25) return true
  if (wordCount(trimmed) < 10) return true
  return false
}

function isGenericTitle(title: string): boolean {
  const trimmed = title.trim()
  if (trimmed.length < 12) return true
  if (wordCount(trimmed) <= 3 && !/\d/.test(trimmed)) return true
  return GENERIC_TITLE_PATTERNS.some((re) => re.test(trimmed))
}

function hasReproductionSteps(text: string): boolean {
  return REPRODUCTION_REGEX.test(text) && wordCount(text) >= 15
}

function qualityLevelForScore(score: number): OperationalQualityLevel {
  if (score >= 0.85) return "COMPLETE"
  if (score >= 0.65) return "ADEQUATE"
  if (score >= 0.45) return "INCOMPLETE"
  return "POOR"
}

function confidenceForAnalysis(missingCount: number, textLength: number): number {
  const base = 0.88 - missingCount * 0.02
  const lengthBoost = textLength > 120 ? 0.04 : textLength < 40 ? -0.05 : 0
  return Math.round(Math.min(0.96, Math.max(0.62, base + lengthBoost)) * 1000) / 1000
}

/** Analyze a single ticket for missing operational information. */
export function analyzeMissingInformation(
  ticket: TicketForMissingInformationAnalysis,
): MissingInformationAnalysisResult {
  const text = combinedText(ticket)
  const description = ticket.description.trim()
  const category = ticket.category?.toUpperCase() ?? null
  const missingFields: MissingInformationField[] = []

  if (!hasStoreCode(ticket, text)) missingFields.push("MISSING_STORE_IDENTIFIER")
  if (!hasLaneNumber(text, category)) missingFields.push("MISSING_LANE_NUMBER")
  if (!hasTerminalId(text)) missingFields.push("MISSING_TERMINAL_ID")
  if (!hasErrorMessage(text)) missingFields.push("MISSING_ERROR_MESSAGE")
  if (!hasScreenshotReference(text)) missingFields.push("MISSING_SCREENSHOT_REFERENCE")
  if (!hasTimestamp(text)) missingFields.push("MISSING_TIMESTAMP")
  if (!hasTroubleshootingSteps(text)) missingFields.push("MISSING_TROUBLESHOOTING_STEPS")

  const paymentRelevant = category === "PAYMENT" || /\bpayment|card|emv|wallet|tpe\b/i.test(text)
  if (paymentRelevant && !hasPaymentReference(text, category)) {
    missingFields.push("MISSING_PAYMENT_REFERENCE")
  }

  if (!hasEnvironmentDetails(ticket, text)) missingFields.push("MISSING_ENVIRONMENT_DETAILS")
  if (isVagueDescription(description)) missingFields.push("VAGUE_DESCRIPTION")
  if (isGenericTitle(ticket.title)) missingFields.push("GENERIC_TITLE")
  if (!hasReproductionSteps(text)) missingFields.push("MISSING_REPRODUCTION_STEPS")

  const totalChecks = paymentRelevant
    ? MISSING_INFORMATION_FIELD_KEYS.length
    : MISSING_INFORMATION_FIELD_KEYS.length - 1
  const passed = totalChecks - missingFields.length
  const completenessScore = Math.round((passed / totalChecks) * 1000) / 1000

  return {
    ticketId: ticket.id,
    missingFields,
    completenessScore,
    qualityLevel: qualityLevelForScore(completenessScore),
    confidenceScore: confidenceForAnalysis(missingFields.length, text.length),
    detectionMethod: MISSING_INFORMATION_DETECTION_METHOD,
  }
}

export function analyzeMissingInformationBatch(
  tickets: TicketForMissingInformationAnalysis[],
): MissingInformationAnalysisResult[] {
  return tickets.map(analyzeMissingInformation)
}

/** Human-readable warning for a missing field key. */
export function missingFieldLabel(field: MissingInformationField | string): string {
  const key = normalizeMissingField(String(field))
  switch (key) {
    case "MISSING_STORE_IDENTIFIER":
      return "Code magasin manquant"
    case "MISSING_LANE_NUMBER":
      return "Numéro de caisse / lane manquant"
    case "MISSING_TERMINAL_ID":
      return "Identifiant terminal manquant"
    case "MISSING_ERROR_MESSAGE":
      return "Message ou code erreur manquant"
    case "MISSING_SCREENSHOT_REFERENCE":
      return "Référence capture d'écran manquante"
    case "MISSING_TIMESTAMP":
      return "Horodatage incident manquant"
    case "MISSING_TROUBLESHOOTING_STEPS":
      return "Étapes de dépannage manquantes"
    case "MISSING_PAYMENT_REFERENCE":
      return "Référence paiement manquante"
    case "MISSING_ENVIRONMENT_DETAILS":
      return "Détails environnement manquants"
    case "VAGUE_DESCRIPTION":
      return "Description trop vague"
    case "GENERIC_TITLE":
      return "Titre générique ou non spécifique"
    case "MISSING_REPRODUCTION_STEPS":
      return "Étapes de reproduction manquantes"
    default:
      return key
  }
}
