import { careSourceTickets } from "@/lib/db/schema/care-source"

export type SourceTicketRow = typeof careSourceTickets.$inferSelect

const HARDWARE_HINTS =
  /\b(scanner|imprimante|printer|hardware|câble|cable|usb|toner|roller|matériel|materiel)\b/i
const NETWORK_HINTS = /\b(wifi|lan|réseau|network|ping|switch|vlan|dns)\b/i

export type HeuristicAnalysis = {
  extractedEntities: Record<string, unknown>
  missingFields: string[]
  operationalTags: string[]
  detectedProblemType: string | null
  detectedActions: string[]
}

export function analyzeTicketHeuristic(input: {
  rawText: string
  source: Pick<
    SourceTicketRow,
    | "storeCode"
    | "cashRegisterCode"
    | "category"
    | "perimeter"
    | "errorMessage"
    | "appliedKmCode"
    | "kmApplicable"
    | "slaDueAt"
    | "careTicketId"
  >
  actionsSummary: string[]
}): HeuristicAnalysis {
  const text = input.rawText
  const entities: Record<string, unknown> = {
    store: input.source.storeCode ?? null,
    lane: input.source.cashRegisterCode ?? null,
    perimeter: input.source.perimeter,
    category: input.source.category ?? null,
    error_message: input.source.errorMessage ?? extractErrorLike(text),
    actions_already_performed: input.actionsSummary,
    care_ticket_ref: input.source.careTicketId,
  }

  const missing: string[] = []
  if (!input.source.storeCode) missing.push("store")
  if (!input.source.cashRegisterCode) missing.push("lane")
  if (!entities.error_message) missing.push("error_message")

  const tags: string[] = []
  if (missing.includes("lane")) tags.push("Missing lane")
  if (input.source.kmApplicable || input.source.appliedKmCode) tags.push("KM available")
  if (HARDWARE_HINTS.test(text)) tags.push("Possible hardware")
  if (NETWORK_HINTS.test(text)) tags.push("Possible network")
  if (input.source.slaDueAt && slaSoon(input.source.slaDueAt)) tags.push("SLA risk")

  let problemType: string | null = input.source.category ?? null
  if (!problemType && HARDWARE_HINTS.test(text)) problemType = "hardware_suspect"
  if (!problemType && NETWORK_HINTS.test(text)) problemType = "network_suspect"

  return {
    extractedEntities: entities,
    missingFields: missing,
    operationalTags: tags,
    detectedProblemType: problemType,
    detectedActions: input.actionsSummary.slice(0, 12),
  }
}

function extractErrorLike(text: string): string | null {
  const m = text.match(/\b(ERR-|ERROR|E\d{2,4})\b[^\n]{0,120}/i)
  return m ? m[0].trim() : null
}

function slaSoon(sla: Date): boolean {
  const ms = sla.getTime() - Date.now()
  return ms > 0 && ms < 4 * 60 * 60 * 1000
}
