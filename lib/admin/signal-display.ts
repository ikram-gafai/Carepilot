import { adminEnglishCopy } from "@/lib/admin-copy-en"
import { cpAgentCategoryLabel } from "@/lib/cp-agent-legacy-copy-en"

export type CompactSignalSeverity = "critical" | "warning" | "info"

export type CompactSignalItem = {
  id: string
  severity: CompactSignalSeverity
  title: string
  area: string
  at: Date
}

const AREA_BY_KEY: Record<string, string> = {
  sync: "CARE ingestion",
  ingestion: "CARE ingestion",
  escalation: "N3",
  n3: "N3",
  network: "Network",
  checkout: "Checkout",
  sco: "Self-checkout",
  payment: "Payment",
  hardware: "Hardware",
  materiel: "Hardware",
  ai: "AI supervision",
  queue: "Checkout",
  incident: "Checkout",
  transfer: "Transfers",
  recommendation: "Recommendations",
  routing: "Routing",
  peripheral: "Peripherals",
  logistics: "Logistics",
  it_desk: "IT desk",
  project: "Projects",
}

const TITLE_FROM_PATTERN: [RegExp, string][] = [
  [/sla\s*(breach|critical|at risk|exposure)/i, "SLA breach"],
  [/sync.*(delay|latency)|synchroni.*delay|ingestion queue latency/i, "Sync latency"],
  [/ingestion.*(delay|partial|batch)|delayed ingestion/i, "Ingestion delay"],
  [/escalat.*(spike|surge|threshold)/i, "Escalate N3 surge"],
  [/transfer\s*(surge|spike)|transfer.*increased/i, "Transfer surge"],
  [/queue\s*overload|capacity threshold|segment exceeded/i, "Queue overload"],
  [/rejection\s*(increase|rate)|recommendation.*reject/i, "AI rejection"],
  [/network\s*(instab|unstable|error)|recurring network/i, "Network instability"],
  [/incident|caisse|lane freeze/i, "Incident cluster"],
  [/recommendation drift|drift detected/i, "Recommendation drift"],
  [/parser timeout|malformed payload/i, "Ingestion fault"],
  [/ai engine|analysis engine/i, "AI engine"],
]

export function signalAreaLabel(categoryOrType: string | null | undefined): string {
  if (!categoryOrType) return "Operations"
  const key = categoryOrType.toLowerCase().trim()
  if (AREA_BY_KEY[key]) return AREA_BY_KEY[key]!
  if (/^care/i.test(key)) return "CARE ingestion"
  const upper = key.toUpperCase()
  if (/^(CHECKOUT|NETWORK|PAYMENT|SCO|HARDWARE|SYNC|IT_DESK|LOGISTICS|PERIPHERAL|PROJECT)$/.test(upper)) {
    return cpAgentCategoryLabel(upper)
  }
  const copy = adminEnglishCopy(categoryOrType)
  return copy.length <= 32 ? copy : copy.slice(0, 32)
}

export function compactSignalTitle(
  rawTitle: string,
  categoryOrType?: string | null,
): string {
  const title = adminEnglishCopy(rawTitle).trim()
  for (const [pattern, label] of TITLE_FROM_PATTERN) {
    if (pattern.test(title)) return label
  }
  const cat = categoryOrType?.toLowerCase() ?? ""
  if (cat === "sync" || cat === "ingestion") return "Sync latency"
  if (cat === "escalation") return "Escalate N3 surge"
  if (cat === "queue") return "Queue overload"
  if (cat === "transfer") return "Transfer surge"
  if (cat === "network") return "Network instability"
  if (cat === "ai" || cat === "recommendation") return "AI rejection"

  const stripped = title
    .replace(/\s*(detected|identified|observed|reported)\s*$/i, "")
    .replace(/\s+in\s+.+$/i, "")
    .trim()
  const words = stripped.split(/\s+/).filter(Boolean)
  if (words.length <= 4) return stripped
  return words.slice(0, 3).join(" ")
}

function areaFromEventContext(
  eventType: string,
  summary: string,
  detail: string | null,
): string {
  const blob = `${summary} ${detail ?? ""}`
  const cat = blob.match(
    /\b(CHECKOUT|SELF[- ]?CHECKOUT|SCO|NETWORK|PAYMENT|HARDWARE|MATÉRIEL|MATERIEL|RÉSEAU|RESEAU)\b/i,
  )
  if (cat) {
    const token = cat[1]!.toUpperCase().replace(/[- ]/g, "_")
    if (token.includes("SCO") || token.includes("SELF")) return "Self-checkout"
    if (/MAT/.test(token)) return "Hardware"
    if (/RÉSEAU|RESEAU|NETWORK/.test(token)) return "Network"
    return cpAgentCategoryLabel(token === "MATÉRIEL" || token === "MATERIEL" ? "HARDWARE" : token)
  }
  if (/CARE|ingestion|sync|parser/i.test(blob)) return "CARE ingestion"
  if (/N3|escalat/i.test(blob)) return "N3"
  if (/monétique|payment/i.test(blob)) return "Payment"
  return signalAreaLabel(eventType)
}

export function mapSignalSeverity(raw: string): CompactSignalSeverity {
  const u = raw.toLowerCase()
  if (u === "critical" || u === "error" || u === "danger") return "critical"
  if (u === "warning" || u === "warn") return "warning"
  return "info"
}

export function mapEventSeverity(eventType: string): CompactSignalSeverity {
  if (eventType === "escalation" || eventType === "queue") return "warning"
  if (eventType === "sync" || eventType === "ingestion") return "warning"
  return "info"
}

export function compactOperationalSignal(input: {
  id: string
  severity: string
  category: string
  title: string
  detectedAt: Date
}): CompactSignalItem {
  return {
    id: input.id,
    severity: mapSignalSeverity(input.severity),
    title: compactSignalTitle(input.title, input.category),
    area: signalAreaLabel(input.category),
    at: input.detectedAt,
  }
}

export function compactSystemEvent(input: {
  id: string
  eventType: string
  summary: string
  detail: string | null
  occurredAt: Date
}): CompactSignalItem {
  return {
    id: input.id,
    severity: mapEventSeverity(input.eventType),
    title: compactSignalTitle(input.summary, input.eventType),
    area: areaFromEventContext(input.eventType, input.summary, input.detail),
    at: input.occurredAt,
  }
}

export function severityLabel(severity: CompactSignalSeverity): string {
  if (severity === "critical") return "Critical"
  if (severity === "warning") return "Warning"
  return "Info"
}
