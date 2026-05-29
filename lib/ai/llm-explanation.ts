/** Task 9 — enterprise operational explanation from aggregated AI signals. */

import { formatRecommendedAsDecision } from "@/lib/ai/operational-decision"
import { formatPredictedPriority } from "@/lib/ai/priority-display"
import { formatRiskLevel } from "@/lib/ai/sla-display"
import { missingFieldLabel } from "@/lib/ai/missing-information"
import {
  getOllamaExplanationModel,
  isOllamaAvailable,
  ollamaGenerate,
} from "@/lib/ai/ollama-client"
import type { ActionRecommendationRow } from "@/lib/ai/run-action-recommendations"
import type { EscalationPredictionRow } from "@/lib/ai/run-escalation-predictions"
import type { KmRecommendationRow } from "@/lib/ai/run-km-recommendations"
import type { MissingInformationRow } from "@/lib/ai/run-missing-information-analysis"
import type { PriorityPredictionRow } from "@/lib/ai/run-priority-predictions"
import type { SlaPredictionRow } from "@/lib/ai/run-sla-predictions"
import type { TransferPredictionRow } from "@/lib/ai/run-transfer-predictions"

export type ExplanationTicketContext = {
  id: number
  title: string
  description: string
  storeCode: string | null
  storeName: string | null
  perimeter: string | null
  priority: string
  category: string | null
}

export type ExplanationAiContext = {
  escalation: EscalationPredictionRow | null
  transfer: TransferPredictionRow | null
  action: ActionRecommendationRow | null
  sla: SlaPredictionRow | null
  priority: PriorityPredictionRow | null
  km: KmRecommendationRow[]
  missingInformation: MissingInformationRow | null
}

export type OperationalExplanationResult = {
  ticketId: number
  modelName: string
  operationalSummary: string
  recommendedActionExplanation: string
  reasoning: string
  missingInformationNote: string
  nextSteps: string
  latencyMs: number
}

export const EXPLANATION_SYSTEM_PROMPT = `You are a CarePilot operational decision-support assistant for Carrefour store ITSM tickets.
Write concise professional ITSM language in English.
Use ONLY the provided ticket and AI signal context.
Do NOT invent store names, error codes, teams, timestamps, or procedures not present in the context.
Do NOT mention model internals, training data, or probabilities as percentages unless given.
Do NOT use first person ("I think", "I recommend").
If information is missing, state that it is missing.
Keep each section to 1–3 short sentences.`

export function buildExplanationContextBlock(
  ticket: ExplanationTicketContext,
  ai: ExplanationAiContext,
): string {
  const lines: string[] = [
    "=== TICKET ===",
    `Title: ${ticket.title}`,
    `Description: ${ticket.description}`,
    `Store: ${ticket.storeCode ?? ticket.storeName ?? "Not provided"}`,
    `Perimeter: ${ticket.perimeter ?? "Not provided"}`,
    `Priority: ${ticket.priority}`,
    `Category: ${ticket.category ?? "Not provided"}`,
    "",
    "=== AI SIGNALS ===",
  ]

  if (ai.escalation) {
    lines.push(
      `Escalation prediction: ${ai.escalation.predictedEscalationRequired ? "Required" : "Not required"} (${ai.escalation.predictionLabel}, confidence ${Math.round(ai.escalation.confidenceScore * 100)}%)`,
    )
  } else {
    lines.push("Escalation prediction: Not available")
  }

  if (ai.transfer) {
    lines.push(
      `Transfer prediction: ${ai.transfer.predictedTransferRequired ? `Required to ${ai.transfer.targetPerimeter}` : "Not required"} (${ai.transfer.predictionLabel})`,
    )
  } else {
    lines.push("Transfer prediction: Not available")
  }

  if (ai.action) {
    lines.push(
      `Suggested decision: ${formatRecommendedAsDecision(ai.action.recommendedAction, {
        escalationRequired: ai.escalation?.predictedEscalationRequired,
        transferRequired: ai.transfer?.predictedTransferRequired,
      })} (confidence ${Math.round(ai.action.confidenceScore * 100)}%)`,
    )
  } else {
    lines.push("Action recommendation: Not available")
  }

  if (ai.sla) {
    lines.push(
      `SLA prediction: ${ai.sla.predictedSlaBreach ? "Breach risk" : "Within SLA"} — ${formatRiskLevel(ai.sla.riskLevel)}`,
    )
  } else {
    lines.push("SLA prediction: Not available")
  }

  if (ai.priority) {
    lines.push(
      `Priority prediction: ${formatPredictedPriority(ai.priority.predictedPriority)} (confidence ${Math.round(ai.priority.confidenceScore * 100)}%)`,
    )
  } else {
    lines.push("Priority prediction: Not available")
  }

  if (ai.km.length > 0) {
    const top = ai.km.slice(0, 3)
    lines.push(
      `KM recommendations: ${top.map((k) => `${k.kmTitle} (${Math.round(k.similarityScore * 100)}% match)`).join("; ")}`,
    )
  } else {
    lines.push("KM recommendations: None")
  }

  if (ai.missingInformation) {
    const fields =
      ai.missingInformation.missingFields.length > 0
        ? ai.missingInformation.missingFields.map(missingFieldLabel).join("; ")
        : "None identified"
    lines.push(
      `Missing information: ${ai.missingInformation.qualityLevel} quality (${Math.round(ai.missingInformation.completenessScore * 100)}% complete) — ${fields}`,
    )
  } else {
    lines.push("Missing information analysis: Not available")
  }

  return lines.join("\n")
}

export function buildExplanationPrompt(ticket: ExplanationTicketContext, ai: ExplanationAiContext): string {
  return `${buildExplanationContextBlock(ticket, ai)}

=== OUTPUT FORMAT ===
Respond with exactly these numbered sections:

1. Operational summary
2. Suggested decision (Resolve, Escalate N3, Transfer, or Suspend)
3. Reasoning
4. Missing information
5. Next steps`
}

const SECTION_PATTERNS: Array<{ key: keyof Omit<OperationalExplanationResult, "ticketId" | "modelName" | "latencyMs">; re: RegExp }> = [
  { key: "operationalSummary", re: /1\.\s*Operational summary\s*\n([\s\S]*?)(?=\n2\.|\n*$)/i },
  { key: "recommendedActionExplanation", re: /2\.\s*Suggested decision\s*\n([\s\S]*?)(?=\n3\.|\n*$)/i },
  { key: "reasoning", re: /3\.\s*Reasoning\s*\n([\s\S]*?)(?=\n4\.|\n*$)/i },
  { key: "missingInformationNote", re: /4\.\s*Missing information\s*\n([\s\S]*?)(?=\n5\.|\n*$)/i },
  { key: "nextSteps", re: /5\.\s*Next steps\s*\n([\s\S]*?)$/i },
]

export function parseExplanationResponse(raw: string): Omit<
  OperationalExplanationResult,
  "ticketId" | "modelName" | "latencyMs"
> {
  const text = raw.trim()
  const parsed: Record<string, string> = {}

  for (const { key, re } of SECTION_PATTERNS) {
    const match = text.match(re)
    parsed[key] = match?.[1]?.trim() ?? ""
  }

  if (!parsed.operationalSummary && text) {
    const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean)
    return {
      operationalSummary: lines[0] ?? "Operational context summarized from available ticket data.",
      recommendedActionExplanation: lines[1] ?? "Follow the recommended operational action from AI signals.",
      reasoning: lines[2] ?? "Decision based on aggregated CarePilot AI predictions.",
      missingInformationNote: lines[3] ?? "Refer to missing information analysis.",
      nextSteps: lines.slice(4).join(" ") || "Validate ticket context and proceed per recommended action.",
    }
  }

  return {
    operationalSummary: parsed.operationalSummary || "Operational context summarized from available ticket data.",
    recommendedActionExplanation: parsed.recommendedActionExplanation || "Follow the recommended operational action from AI signals.",
    reasoning: parsed.reasoning || "Decision based on aggregated CarePilot AI predictions.",
    missingInformationNote: parsed.missingInformationNote || "No additional missing information noted.",
    nextSteps: parsed.nextSteps || "Validate ticket context and proceed per recommended action.",
  }
}

/** Deterministic fallback when Ollama is offline — no hallucinated facts. */
export function generateTemplateExplanation(
  ticket: ExplanationTicketContext,
  ai: ExplanationAiContext,
): Omit<OperationalExplanationResult, "ticketId" | "modelName" | "latencyMs"> {
  const store = ticket.storeCode ?? ticket.storeName ?? "Store not specified"
  const perimeter = ticket.perimeter ?? "Perimeter not specified"

  const escalationText = ai.escalation
    ? ai.escalation.predictedEscalationRequired
      ? "Escalation is predicted as required."
      : "Escalation is not predicted at this stage."
    : "Escalation prediction is not available."

  const transferText = ai.transfer
    ? ai.transfer.predictedTransferRequired
      ? `Transfer to ${ai.transfer.targetPerimeter} is predicted.`
      : "Transfer is not predicted."
    : "Transfer prediction is not available."

  const actionHints = {
    escalationRequired: ai.escalation?.predictedEscalationRequired,
    transferRequired: ai.transfer?.predictedTransferRequired,
  }

  const actionText = ai.action
    ? `Suggested decision: ${formatRecommendedAsDecision(ai.action.recommendedAction, actionHints)}.`
    : "No suggested decision available."

  const slaText = ai.sla
    ? ai.sla.predictedSlaBreach
      ? `SLA breach risk is ${formatRiskLevel(ai.sla.riskLevel).toLowerCase()}.`
      : "SLA breach is not predicted."
    : "SLA prediction is not available."

  const priorityText = ai.priority
    ? `Predicted priority: ${formatPredictedPriority(ai.priority.predictedPriority)}.`
    : "Priority prediction is not available."

  const kmText =
    ai.km.length > 0
      ? `Top KM article: ${ai.km[0]!.kmTitle}.`
      : "No KM article matched."

  const missingText = ai.missingInformation
    ? ai.missingInformation.missingFields.length > 0
      ? `Ticket completeness is ${Math.round(ai.missingInformation.completenessScore * 100)}%. Missing: ${ai.missingInformation.missingFields.slice(0, 4).map(missingFieldLabel).join(", ")}.`
      : "Ticket operational context appears complete."
    : "Missing information analysis is not available."

  const operationalSummary = `${ticket.title} at ${store} (${perimeter}, ${ticket.priority}). ${escalationText} ${transferText}`

  const recommendedActionExplanation = `${actionText} ${kmText}`

  const reasoning = [escalationText, transferText, slaText, priorityText].join(" ")

  const nextSteps = [
    ai.missingInformation && ai.missingInformation.missingFields.length > 0
      ? "Request missing operational fields before escalation or transfer."
      : null,
    ai.action
      ? `Suggested decision: ${formatRecommendedAsDecision(ai.action.recommendedAction, actionHints)}.`
      : "Review ticket and confirm next decision with N2 if needed.",
    ai.km.length > 0 ? `Consult KM: ${ai.km[0]!.kmTitle}.` : null,
  ]
    .filter(Boolean)
    .join(" ")

  return {
    operationalSummary,
    recommendedActionExplanation,
    reasoning,
    missingInformationNote: missingText,
    nextSteps,
  }
}

export async function generateOperationalExplanation(
  ticket: ExplanationTicketContext,
  ai: ExplanationAiContext,
  modelName = getOllamaExplanationModel(),
): Promise<OperationalExplanationResult> {
  const ollamaUp = await isOllamaAvailable()

  if (!ollamaUp) {
    const template = generateTemplateExplanation(ticket, ai)
    return {
      ticketId: ticket.id,
      modelName: "carepilot-template-fallback",
      latencyMs: 0,
      ...template,
    }
  }

  const prompt = buildExplanationPrompt(ticket, ai)
  const { response, latencyMs, model } = await ollamaGenerate({
    model: modelName,
    system: EXPLANATION_SYSTEM_PROMPT,
    prompt,
    temperature: 0.15,
    numPredict: 420,
  })

  const parsed = parseExplanationResponse(response)
  return {
    ticketId: ticket.id,
    modelName: model,
    latencyMs,
    ...parsed,
  }
}
