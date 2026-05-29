import { formatOrchestratedDecisionLabel } from "@/lib/ai/orchestration/orchestrated-ticket-decision"
import type { OperationalDecision } from "@/lib/ai/operational-decision"
import {
  OPERATIONAL_ACTION_KINDS,
  OPERATIONAL_ACTION_LABELS,
  type OperationalActionKind,
} from "@/lib/care-operational-actions"

export type DecisionAlignmentStatus = "aligned" | "overridden" | "pending"

const BASE_DECISION_KEYS: Record<OperationalDecision, string> = {
  RESOLVE: "resolve",
  ESCALATE_N3: "escalate_n3",
  SUSPEND: "suspend",
  REQUEST_INFORMATION: "request_information",
  TRANSFER: "transfer",
}

const AGENT_KIND_ALIGNMENT_KEYS: Record<OperationalActionKind, string> = {
  resolve: "resolve",
  escalate_n3: "escalate_n3",
  suspend: "suspend",
  request_information: "request_information",
  transfer_monetique: "transfer:monetique",
  transfer_materiel: "transfer:materiel",
  transfer_bo: "transfer:back_office",
  transfer_reseau: "transfer:reseau",
  transfer_bureautique: "transfer:bureautique",
  transfer_infrastructure: "transfer:infrastructure",
}

const TRANSFER_TARGET_KEYS: Record<string, string> = {
  monetique: "monetique",
  monétique: "monetique",
  payment: "monetique",
  materiel: "materiel",
  matériel: "materiel",
  hardware: "materiel",
  "back office": "back_office",
  "back-office": "back_office",
  bo: "back_office",
  reseau: "reseau",
  réseau: "reseau",
  network: "reseau",
  bureautique: "bureautique",
  infrastructure: "infrastructure",
  "store infrastructure": "infrastructure",
  fidelite: "fidelite",
  fidélité: "fidelite",
  loyalty: "fidelite",
  sco: "sco",
  fo: "fo",
}

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "")
}

function normalizeCompareText(value: string): string {
  return stripDiacritics(value).toLowerCase().replace(/\s+/g, " ").trim()
}

export function transferTargetAlignmentKey(target: string | null | undefined): string | null {
  if (!target?.trim()) return null
  const normalized = normalizeCompareText(target)
  if (TRANSFER_TARGET_KEYS[normalized]) return TRANSFER_TARGET_KEYS[normalized]!

  for (const [label, key] of Object.entries(TRANSFER_TARGET_KEYS)) {
    if (normalized.includes(label)) return key
  }

  return normalized.replace(/[^a-z0-9]+/g, "_")
}

export function suggestedActionAlignmentKey(
  decision: OperationalDecision,
  target: string | null,
  fallbackLabel?: string | null,
): string {
  const fromLabel = fallbackLabel ? alignmentKeyFromLabel(fallbackLabel) : null
  if (fromLabel) return fromLabel

  if (decision !== "TRANSFER") {
    return BASE_DECISION_KEYS[decision]
  }

  const targetKey = transferTargetAlignmentKey(target)
  return targetKey ? `transfer:${targetKey}` : BASE_DECISION_KEYS.TRANSFER
}

export function agentActionAlignmentKey(eventType: string | null | undefined): string | null {
  if (!eventType) return null
  if (isOperationalActionKind(eventType)) {
    return AGENT_KIND_ALIGNMENT_KEYS[eventType]
  }
  return alignmentKeyFromLabel(eventType)
}

export function formatAgentActionAlignmentLabel(eventType: string | null | undefined): string | null {
  if (!eventType) return null
  if (isOperationalActionKind(eventType)) {
    if (eventType.startsWith("transfer_")) {
      const target = OPERATIONAL_ACTION_LABELS[eventType].replace(/^Transfert\s+/i, "")
      return `Transfert → ${target}`
    }
    return OPERATIONAL_ACTION_LABELS[eventType]
  }
  return eventType
}

export function formatSuggestedActionAlignmentLabel(
  decision: OperationalDecision,
  target: string | null,
  fallbackLabel?: string | null,
): string {
  if (fallbackLabel?.trim()) return fallbackLabel.trim()
  return formatOrchestratedDecisionLabel(decision, target)
}

export function agentActionMatchesSuggestion(input: {
  suggestedDecision: OperationalDecision
  suggestedTarget: string | null
  suggestedLabel?: string | null
  agentEventType: string | null | undefined
}): boolean {
  return (
    compareOperationalActionAlignment(input) === "aligned"
  )
}

export function compareOperationalActionAlignment(input: {
  suggestedDecision: OperationalDecision | null
  suggestedTarget: string | null
  suggestedLabel?: string | null
  agentEventType: string | null | undefined
}): DecisionAlignmentStatus {
  if (!input.agentEventType) return "pending"
  if (!input.suggestedDecision) return "overridden"

  const suggestedKey = suggestedActionAlignmentKey(
    input.suggestedDecision,
    input.suggestedTarget,
    input.suggestedLabel,
  )
  const agentKey = agentActionAlignmentKey(input.agentEventType)
  if (!agentKey) return "overridden"

  return suggestedKey === agentKey ? "aligned" : "overridden"
}

function alignmentKeyFromLabel(label: string): string | null {
  const normalized = normalizeCompareText(label)

  if (normalized.startsWith("demander")) return BASE_DECISION_KEYS.REQUEST_INFORMATION
  if (normalized.startsWith("request information")) return BASE_DECISION_KEYS.REQUEST_INFORMATION
  if (normalized.startsWith("resoudre") || normalized.startsWith("resolve")) {
    return BASE_DECISION_KEYS.RESOLVE
  }
  if (normalized.startsWith("escalade") || normalized.startsWith("escalate")) {
    return BASE_DECISION_KEYS.ESCALATE_N3
  }
  if (normalized.startsWith("suspendre") || normalized.startsWith("suspend")) {
    return BASE_DECISION_KEYS.SUSPEND
  }

  const transferMatch = label.match(/(?:transfert|transfer)\s*(?:→|->)\s*(.+)$/i)
  if (transferMatch) {
    const targetKey = transferTargetAlignmentKey(transferMatch[1]!.trim())
    return targetKey ? `transfer:${targetKey}` : BASE_DECISION_KEYS.TRANSFER
  }

  if (normalized.startsWith("transfert") || normalized.startsWith("transfer")) {
    const bareTarget = label.replace(/^(?:transfert|transfer)\s+/i, "").trim()
    const targetKey = transferTargetAlignmentKey(bareTarget)
    return targetKey ? `transfer:${targetKey}` : BASE_DECISION_KEYS.TRANSFER
  }

  return null
}

function isOperationalActionKind(value: string): value is OperationalActionKind {
  return (OPERATIONAL_ACTION_KINDS as readonly string[]).includes(value)
}
