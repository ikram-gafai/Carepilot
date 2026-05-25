/**

 * Pure helpers for agent ticket detail: AI prediction headline, next actions, workflow rail.

 */



import {

  OPERATIONAL_ACTION_LABELS,

  ticketStatusUiLabel,

  type OperationalActionKind,

} from "@/lib/care-operational-actions"



export type WorkflowPredictionKind = OperationalActionKind | "operational_followup"



export type WorkflowPrediction = {

  kind: WorkflowPredictionKind

  headline: string

  detail?: string

}



export function takeSnippet(text: string, maxLen: number) {

  const t = text.trim()

  if (t.length <= maxLen) return t

  const slice = t.slice(0, maxLen)

  const lastSpace = slice.lastIndexOf(" ")

  return `${(lastSpace > 24 ? slice.slice(0, lastSpace) : slice).trim()}…`

}



export function inferWorkflowPrediction(input: {

  suggestedAction: string

  detectedIssue: string

}): WorkflowPrediction {

  const blob = `${input.suggestedAction}\n${input.detectedIssue}`.toLowerCase()



  if (/\bn3\b|escalade|escalat/i.test(blob)) {

    return { kind: "escalate_n3", headline: OPERATIONAL_ACTION_LABELS.escalate_n3 }

  }

  if (/monétique|monetique|payment|tpe|pin\s*pad/i.test(blob)) {

    return { kind: "transfer_monetique", headline: OPERATIONAL_ACTION_LABELS.transfer_monetique }

  }

  if (/bureautique|poste de travail|workstation|it desk|bur\b/i.test(blob)) {

    return { kind: "transfer_bureautique", headline: OPERATIONAL_ACTION_LABELS.transfer_bureautique }

  }

  if (/bo\b|back[- ]?office/i.test(blob) && !/bureautique/i.test(blob)) {

    return { kind: "transfer_bo", headline: OPERATIONAL_ACTION_LABELS.transfer_bo }

  }

  if (/r[eé]seau|network|wifi|vlan|dns/i.test(blob)) {

    return { kind: "transfer_reseau", headline: OPERATIONAL_ACTION_LABELS.transfer_reseau }

  }

  if (/infrastructure|infra\b|datacenter/i.test(blob)) {

    return { kind: "transfer_infrastructure", headline: OPERATIONAL_ACTION_LABELS.transfer_infrastructure }

  }

  if (

    /matériel|materiel|hardware|scanner|sco\b|printer|imprim|périph|périf|câbl|cabl/i.test(blob)

  ) {

    return { kind: "transfer_materiel", headline: OPERATIONAL_ACTION_LABELS.transfer_materiel }

  }

  if (/suspend|pause|attente magasin|waiting store|en attente magasin/i.test(blob)) {

    return { kind: "suspend", headline: OPERATIONAL_ACTION_LABELS.suspend, detail: "Hold until store confirms" }

  }

  if (/résolu|resolu|resolve|clôtur|clotur|clos|fermer|close ticket/i.test(blob)) {

    return { kind: "resolve", headline: OPERATIONAL_ACTION_LABELS.resolve }

  }



  const snippet = takeSnippet(input.suggestedAction, 72)

  return {

    kind: "operational_followup",

    headline: "Operational follow-up",

    detail: snippet || takeSnippet(input.detectedIssue, 72),

  }

}



export function primaryRecommendedLine(suggestedAction: string, maxLen = 160): string {

  const t = suggestedAction.trim()

  if (!t) return "—"

  const first = t.split(/(?<=[.!?])\s+/)[0]?.trim() ?? t

  return takeSnippet(first || t, maxLen)

}



export function compactPredictionReason(prediction: WorkflowPrediction, detectedIssue: string): string {

  const d = detectedIssue.trim()

  if (prediction.kind === "transfer_materiel") return d ? takeSnippet(d, 88) : "Device or hardware symptoms"

  if (prediction.kind === "escalate_n3") return d ? takeSnippet(d, 88) : "Escalation criteria met"

  if (prediction.kind === "transfer_bureautique") return d ? takeSnippet(d, 88) : "Workstation scope"

  if (prediction.kind === "transfer_monetique") return d ? takeSnippet(d, 88) : "Payment perimeter"

  if (prediction.kind === "transfer_bo") return d ? takeSnippet(d, 88) : "Back-office scope"

  if (prediction.kind === "transfer_reseau") return d ? takeSnippet(d, 88) : "Network perimeter"

  if (prediction.kind === "transfer_infrastructure") return d ? takeSnippet(d, 88) : "Infrastructure scope"

  if (prediction.kind === "suspend") return "Waiting on store or third-party validation"

  if (prediction.kind === "resolve") return "Operational closure path"

  if (prediction.detail) return takeSnippet(prediction.detail, 88)

  return d ? takeSnippet(d, 88) : "Continue N2 qualification"

}



export function buildOperationalSignalChips(input: {

  suggestedAction: string

  detectedIssue: string

  escalationRisk: string

  slaTone: "critical" | "warning" | "success" | "neutral" | string

  missingCount: number

  relatedCount: number

}): string[] {

  const out: string[] = []

  const push = (s: string) => {

    if (s && !out.includes(s)) out.push(s)

  }

  const blob = `${input.suggestedAction}\n${input.detectedIssue}`.toLowerCase()

  if (/wifi|lan|vlan|r[eé]seau|network|dns|ping|latence|latency|coupure/i.test(blob)) push("Network instability")

  if (/mat[eé]riel|hardware|scanner|printer|usb|c[aâ]ble|cable|tpe|sco\b/i.test(blob)) push("Peripheral issue")

  if (/sync|synchron|middleware|timeout|catalogue|catalog/i.test(blob)) push("Synchronization risk")

  if (input.relatedCount > 0) push("Similar incidents")

  if (input.missingCount > 0) push("Missing validation")

  if (input.slaTone === "critical") push("SLA breached")

  else if (input.slaTone === "warning") push("SLA at risk")

  if (/high|medium/i.test(input.escalationRisk.trim().toLowerCase())) push("Escalation risk")

  return out.slice(0, 8)

}



export function buildRecommendedNextActions(input: {

  suggestedAction: string

  missingInfo: string[]

  prediction: WorkflowPrediction

}): string[] {

  const out: string[] = []

  const pushUnique = (s: string) => {

    const t = s.trim()

    if (t && !out.includes(t)) out.push(t)

  }



  for (const m of input.missingInfo) {

    pushUnique(`Validate or collect: ${m}`)

  }



  const sentences = input.suggestedAction

    .split(/(?<=[.!?])\s+/)

    .map((s) => s.trim())

    .filter(Boolean)

  for (const s of sentences.slice(0, 2)) {

    pushUnique(s.length > 120 ? `${s.slice(0, 117)}…` : s)

  }



  const defaults: Partial<Record<WorkflowPredictionKind, string[]>> = {

    resolve: ["Confirm operational stability with the store", "Document resolution in the ticket"],

    suspend: ["Notify the store owner of the hold reason", "Set a follow-up date for validation"],

    transfer_materiel: ["Hand over device identifiers and recent change window", "Attach logs before transfer"],

    transfer_bureautique: ["Confirm workstation scope and user impact", "Attach screenshots if applicable"],

    transfer_monetique: ["Document payment device and transaction context", "Attach Payment handover notes"],

    transfer_bo: ["Confirm back-office scope", "Attach relevant logs"],

    transfer_reseau: ["Document network topology and symptoms", "Attach connectivity traces"],

    transfer_infrastructure: ["Document platform scope", "Attach infrastructure traces"],

    escalate_n3: ["Attach diagnostic summary for N3", "List attempted KM steps and outcomes"],

    operational_followup: [

      "Verify network synchronization state",

      "Collect application logs from the affected lane",

    ],

  }

  const lines = defaults[input.prediction.kind]

  if (lines) {

    for (const line of lines) {

      if (out.length >= 6) break

      pushUnique(line)

    }

  }



  return out.slice(0, 6)

}



export function relatedIncidentOutcomeLabel(status: string): string {

  return ticketStatusUiLabel(status)

}



export function relatedIncidentOutcomeCompact(status: string): string {

  return ticketStatusUiLabel(status)

}



export function kmContextBullets(input: { category: string; storeCode: string | null }): string[] {

  const lines: string[] = [

    `Same operational category (${input.category})`,

    "Correlated incident patterns on this perimeter",

  ]

  if (input.storeCode) {

    lines.push(`Store topology match (${input.storeCode})`)

  }

  return lines.slice(0, 3)

}


