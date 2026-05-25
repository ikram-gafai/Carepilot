import { CARREFOUR_OPERATIONAL_STORES } from "@/lib/data/carrefour-stores"

export type NoiseLevel = "low" | "medium" | "high"
export type DatasetSplit = "train" | "validation" | "test"

export type HistoricalTicketSeed = {
  ticketId: string
  title: string
  description: string | null
  perimeter: string
  priority: string
  status: string
  storeId: string
  storeName: string
  city: string
  region: string
  assignedTeam: string | null
  createdAt: Date
  resolvedAt: Date | null
  resolutionTimeMinutes: number | null
  slaBreached: boolean
  escalationRequired: boolean
  transferRequired: boolean
  incidentCategory: string
  environmentType: string
  ticketSource: string
  resolutionSummary: string | null
  finalResolutionStatus: string
  split: DatasetSplit
  noiseLevel: NoiseLevel
  rawText: string
  cleanedText: string
  vectorizationText: string
}

export type HistoricalActionSeed = {
  ticketId: string
  actionType: string
  previousStatus: string | null
  newStatus: string
  assignedGroup: string | null
  timestamp: Date
  actionAuthor: string
}

export type HistoricalResolutionSeed = {
  ticketId: string
  resolutionSummary: string | null
  resolutionCategory: string
  closureReason: string
  solvedByTeam: string
  resolutionType: string
  fixDurationMinutes: number
}

export type KmArticleSeed = {
  title: string
  procedureSteps: string
  perimeter: string
  incidentCategory: string
  keywords: string
  difficultyLevel: string
  applicabilityScore: number
}

export type DatasetMetadataSeed = {
  datasetName: string
  generatedAt: Date
  totalTickets: number
  noiseLevel: NoiseLevel
  seed: number
  splitRatios: Record<string, number>
  classDistributions: Record<string, unknown>
  missingness: Record<string, unknown>
  uniqueStores: number
  uniqueCategories: number
  validationStatus: "pass" | "warn" | "fail"
  validationWarnings: string[]
}

export type DatasetExportSeed = {
  exportType: "raw_text" | "cleaned_text" | "vectorization_ready"
  split: DatasetSplit
  ticketId: string
  textPayload: string
  labelPayload: Record<string, unknown>
}

export type MlTrainingDataset = {
  tickets: HistoricalTicketSeed[]
  actions: HistoricalActionSeed[]
  resolutions: HistoricalResolutionSeed[]
  kmArticles: KmArticleSeed[]
  metadata: DatasetMetadataSeed
  exports: DatasetExportSeed[]
}

export type DatasetValidationSummary = {
  totalTickets: number
  escalationDistribution: Distribution
  transferDistribution: Distribution
  slaBreachedDistribution: Distribution
  priorityDistribution: Distribution
  perimeterDistribution: Distribution
  splitDistribution: Distribution
  missingValues: Record<string, number>
  missingPercentages: Record<string, number>
  averageDescriptionLength: number
  uniqueStores: number
  uniqueCategories: number
  kmArticles: number
  status: "pass" | "warn" | "fail"
  warnings: string[]
}

type Distribution = Record<string, { count: number; pct: number }>

type PerimeterKey =
  | "CHECKOUT"
  | "SCO"
  | "PAYMENT"
  | "LOYALTY"
  | "NETWORK"
  | "HARDWARE"
  | "BACK_OFFICE"
  | "STORE_INFRA"

type TicketDraft = {
  index: number
  ticketId: string
  perimeterKey: PerimeterKey
  priority: "Critical" | "High" | "Medium" | "Low"
  split: DatasetSplit
  store: (typeof CARREFOUR_OPERATIONAL_STORES)[number]
  incident: IncidentPattern
  createdAt: Date
  ambiguity: AmbiguityPattern | null
  escalationScore: number
  transferScore: number
  slaScore: number
}

type IncidentPattern = {
  category: string
  titles: string[]
  symptoms: string[]
  resolution: string
  teams: string[]
  keywords: string[]
}

type AmbiguityPattern = {
  note: string
  rootCauseCategory: string
}

const DEFAULT_SIZE = 14_000
const DEFAULT_SEED = 20260525
const MIN_DATASET_SIZE = 3_000
const MAX_DATASET_SIZE = 20_000

const PERIMETER_LABELS: Record<PerimeterKey, string> = {
  CHECKOUT: "Checkout (VLP)",
  SCO: "SCO",
  PAYMENT: "Payment",
  LOYALTY: "Loyalty",
  NETWORK: "Network",
  HARDWARE: "Hardware",
  BACK_OFFICE: "Back Office",
  STORE_INFRA: "Store Infrastructure",
}

const PERIMETER_VARIANTS: Record<PerimeterKey, string[]> = {
  CHECKOUT: ["Checkout (VLP)", "Checkout", "checkout", "CHECKOUT", "VLP", "front office checkout"],
  SCO: ["SCO", "Self Checkout", "self-checkout", "self checkout", "SELF CHECKOUT"],
  PAYMENT: ["Payment", "payment", "PAYMENT", "Monetique", "Payment services"],
  LOYALTY: ["Loyalty", "loyalty", "LOYALTY", "Fidelite", "customer loyalty"],
  NETWORK: ["Network", "network", "NETWORK", "Store network", "LAN/WAN"],
  HARDWARE: ["Hardware", "hardware", "HARDWARE", "Peripherals", "store hardware"],
  BACK_OFFICE: ["Back Office", "backoffice", "BACK OFFICE", "Back-office", "BO sync"],
  STORE_INFRA: ["Store Infrastructure", "store infra", "STORE INFRA", "Infrastructure", "local server"],
}

const PERIMETER_RATIOS: Record<PerimeterKey, number> = {
  CHECKOUT: 0.18,
  SCO: 0.155,
  PAYMENT: 0.13,
  LOYALTY: 0.1,
  NETWORK: 0.13,
  HARDWARE: 0.13,
  BACK_OFFICE: 0.09,
  STORE_INFRA: 0.085,
}

const PRIORITY_RATIOS = {
  Critical: 0.18,
  High: 0.28,
  Medium: 0.39,
  Low: 0.15,
} as const

const SPLIT_RATIOS: Record<DatasetSplit, number> = {
  train: 0.7,
  validation: 0.15,
  test: 0.15,
}

const NOISE_CONFIG: Record<
  NoiseLevel,
  {
    textNoise: number
    missingDescription: number
    missingResolutionSummary: number
    missingAssignedTeam: number
    shorthand: number
    formatting: number
  }
> = {
  low: {
    textNoise: 0.08,
    missingDescription: 0.03,
    missingResolutionSummary: 0.05,
    missingAssignedTeam: 0.03,
    shorthand: 0.08,
    formatting: 0.16,
  },
  medium: {
    textNoise: 0.16,
    missingDescription: 0.08,
    missingResolutionSummary: 0.11,
    missingAssignedTeam: 0.07,
    shorthand: 0.18,
    formatting: 0.32,
  },
  high: {
    textNoise: 0.24,
    missingDescription: 0.14,
    missingResolutionSummary: 0.18,
    missingAssignedTeam: 0.11,
    shorthand: 0.28,
    formatting: 0.48,
  },
}

const INCIDENTS: Record<PerimeterKey, IncidentPattern[]> = {
  CHECKOUT: [
    pattern("CHECKOUT_LANE_UNAVAILABLE", ["Checkout lane unavailable", "POS lane down", "cash register down"], ["lane not responding", "cashier cannot process baskets", "session freezes after login"], "Lane service restarted and checkout session rebuilt.", ["N1 Checkout", "N2 POS"], ["pos", "lane", "checkout"]),
    pattern("POS_SYNC_ISSUE", ["POS synchronization issue", "cash register synchronization issue", "lane totals mismatch"], ["lane totals do not match back-office", "sales file stuck", "end of day close blocked"], "POS sync queue replayed and closing totals reconciled.", ["N2 POS", "Back Office"], ["sync", "pos", "closing"]),
    pattern("CHECKOUT_LOGIN_FAILURE", ["Checkout login authentication failure", "operator login rejected", "cashier cannot login"], ["cashier badge rejected", "supervisor override unavailable", "auth service slow"], "Credentials and store controller replication refreshed.", ["N1 Checkout", "Identity Support"], ["login", "auth", "checkout"]),
  ],
  SCO: [
    pattern("SCO_TERMINAL_OFFLINE", ["SCO terminal offline", "self-checkout offline", "SCO unit down"], ["terminal offline in attendant console", "device unreachable", "customer screen frozen"], "SCO unit rebooted and middleware session restored.", ["N1 SCO", "N2 Checkout"], ["sco", "terminal", "offline"]),
    pattern("SCO_PAYMENT_READER", ["SCO payment reader offline", "self checkout pinpad error", "SCO card reader down"], ["pinpad does not initialize", "payment validation stuck", "contactless not detected"], "Payment reader re-paired and transaction flow validated.", ["N2 Payment", "N2 SCO"], ["sco", "payment", "pinpad"]),
    pattern("SCO_SCALE_SENSOR", ["SCO scale communication error", "bagging area sensor fault", "SCO security scale timeout"], ["weight check loops", "false item-not-bagged alerts", "attendant interventions rising"], "Scale calibration and sensor test completed.", ["N2 Hardware", "N1 SCO"], ["sco", "scale", "sensor"]),
  ],
  PAYMENT: [
    pattern("PAYMENT_GATEWAY_TIMEOUT", ["Payment gateway timeout", "Payment authorization failure", "card authorization timeout"], ["authorizations time out", "several lanes reject card payments", "acquirer responses delayed"], "Payment gateway route recovered and test card transaction approved.", ["N2 Payment", "Payment Operations"], ["payment", "gateway", "timeout"]),
    pattern("PINPAD_ENCRYPTION_ERROR", ["PIN pad encryption error", "payment terminal key error", "TPE encryption fault"], ["pin entry blocked", "key mismatch", "terminal refuses amount send"], "Terminal keys reloaded and secure payment test completed.", ["N2 Payment", "Vendor Payment"], ["pinpad", "keys", "payment"]),
    pattern("REFUND_PROCESSING_REJECTED", ["Refund processing rejected", "refund declined at lane", "customer refund blocked"], ["refund lookup succeeds but host rejects", "manual finance process needed", "return counter blocked"], "Refund profile corrected and return transaction validated.", ["Payment Operations", "Back Office"], ["refund", "payment", "host"]),
  ],
  LOYALTY: [
    pattern("LOYALTY_SERVICE_UNAVAILABLE", ["Loyalty service unavailable", "loyalty lookup failure", "member profile lookup failure"], ["member lookup returns unavailable", "points not displayed", "customer account cannot be retrieved"], "Loyalty API cache refreshed and member lookup restored.", ["Loyalty Support", "Back Office"], ["loyalty", "member", "profile"]),
    pattern("COUPON_VALIDATION_TIMEOUT", ["Coupon redemption service timeout", "digital coupon validation blocked", "coupon engine timeout"], ["coupon scan hangs", "promotion validation slow", "customer discount not applied"], "Promotion validation service restarted and coupon replay checked.", ["Loyalty Support", "Promotion Ops"], ["coupon", "loyalty", "promotion"]),
  ],
  NETWORK: [
    pattern("STORE_NETWORK_INSTABILITY", ["Store network instability", "network issue store backoffice", "LAN instability at store"], ["packet loss on checkout VLAN", "POS latency spikes", "intermittent disconnects"], "Switch path stabilized and WAN latency returned to baseline.", ["Network Operations", "N2 Network"], ["network", "wan", "vlan"]),
    pattern("STORE_VPN_UNAVAILABLE", ["Store VPN unavailable", "VPN tunnel down", "enterprise VPN unreachable"], ["store cannot reach central services", "pricing and loyalty degraded", "VPN concentrator unreachable"], "VPN tunnel rebuilt and central service reachability confirmed.", ["Network Operations", "Infrastructure"], ["vpn", "wan", "central"]),
    pattern("DNS_RESOLUTION_FAILURE", ["DNS resolution failure at store", "internal DNS not resolving", "store services name lookup failing"], ["service names fail", "IP fallback works", "checkout subnet affected"], "DNS forwarder refreshed and lane subnet resolution verified.", ["Network Operations", "Infrastructure"], ["dns", "network", "store"]),
  ],
  HARDWARE: [
    pattern("RECEIPT_PRINTER_OFFLINE", ["Receipt printer unavailable", "printer communication lost", "receipt printer offline"], ["printer offline in POS", "paper path ok", "spooler cannot reach device"], "Printer driver reset and test receipt printed.", ["N2 Hardware", "Store IT"], ["printer", "receipt", "hardware"]),
    pattern("SCANNER_NOT_DETECTED", ["Scanner not detected", "barcode scanner missing", "scanner dock not responding"], ["scanner absent from device list", "cable replaced without fix", "lane cannot scan products"], "Scanner replaced and device pairing completed.", ["N2 Hardware", "Store IT"], ["scanner", "barcode", "hardware"]),
    pattern("CASH_DRAWER_MALFUNCTION", ["Cash drawer not opening", "cash drawer malfunction", "drawer command failing"], ["drawer does not open after settlement", "manual key override used", "solenoid fault suspected"], "Drawer cable and solenoid module replaced.", ["N2 Hardware", "Vendor Hardware"], ["drawer", "cash", "hardware"]),
  ],
  BACK_OFFICE: [
    pattern("PRICE_REPLICATION_DELAY", ["Price update not applied", "Back-office replication delay", "price replication issue"], ["central price file not visible", "article master outdated", "promotions import delayed"], "Back-office replication queue replayed and price file confirmed.", ["Back Office", "Data Operations"], ["price", "replication", "backoffice"]),
    pattern("INVENTORY_SYNC_DELAY", ["Inventory synchronization delay", "stock update lag", "inventory feed delayed"], ["stock on hand stale", "warehouse movement not visible", "sync delay over two hours"], "Inventory batch caught up and stock figures reconciled.", ["Back Office", "Supply Chain IT"], ["inventory", "stock", "sync"]),
    pattern("POS_APPLICATION_CRASH", ["POS application crash", "POS client crash after update", "checkout app memory fault"], ["application terminates", "crash dump created", "recent patch suspected"], "Patch rollback completed and crash signature cleared.", ["Back Office", "Vendor POS"], ["pos", "crash", "patch"]),
  ],
  STORE_INFRA: [
    pattern("STORE_SERVER_UNREACHABLE", ["Store server unreachable", "local server down", "store controller unreachable"], ["server does not respond", "management agent offline", "lanes in degraded mode"], "Store server services restarted and monitoring heartbeat restored.", ["Infrastructure", "Store IT"], ["server", "infrastructure", "controller"]),
    pattern("DISK_THRESHOLD_DATABASE", ["Disk threshold on store database", "database volume critical", "local DB disk alert"], ["database volume near full", "queries slowing", "capacity alert raised"], "Database cleanup and volume extension completed.", ["Infrastructure", "Database Operations"], ["database", "disk", "infra"]),
    pattern("BACKUP_JOB_FAILED", ["Backup job failed - store systems", "store backup failed", "nightly backup incomplete"], ["backup window missed", "retention at risk", "repository reachable"], "Backup job rerun with successful verification.", ["Infrastructure", "Backup Operations"], ["backup", "store", "infra"]),
  ],
}

const AMBIGUITY: Partial<Record<PerimeterKey, AmbiguityPattern[]>> = {
  CHECKOUT: [
    { note: "Root cause later traced to peripheral hardware.", rootCauseCategory: "HARDWARE" },
    { note: "Payment middleware delay first appeared as a checkout freeze.", rootCauseCategory: "PAYMENT" },
  ],
  SCO: [
    { note: "Network packet loss made the SCO unit look frozen.", rootCauseCategory: "NETWORK" },
    { note: "Scale sensor fault triggered payment validation retries.", rootCauseCategory: "HARDWARE" },
  ],
  PAYMENT: [
    { note: "WAN instability caused intermittent authorization timeouts.", rootCauseCategory: "NETWORK" },
    { note: "Back-office parameter mismatch caused host rejection.", rootCauseCategory: "BACK_OFFICE" },
  ],
  LOYALTY: [
    { note: "Back-office synchronization delay caused stale loyalty balance.", rootCauseCategory: "BACK_OFFICE" },
    { note: "Network DNS issue affected loyalty API resolution.", rootCauseCategory: "NETWORK" },
  ],
}

const STATUS_FLOW = ["Open", "In Progress", "Monitoring", "Resolved", "Closed"] as const
const SOURCES = ["CARE Portal", "Store hotline", "Monitoring", "N1 intake", "Batch import"] as const
const ENV_TYPES = ["production", "store-prod", "pilot-store", "night-batch", "peak-hours"] as const
const ACTION_AUTHORS = ["CARE_SYSTEM", "n1.agent", "n2.support", "store.it", "supervisor", "vendor.bridge"] as const
const RESOLUTION_TYPES = ["configuration", "restart", "hardware_swap", "network_fix", "data_replay", "vendor_fix", "workaround"] as const
const CLOSURE_REASONS = ["service restored", "validated by store", "monitoring stable", "workaround accepted", "vendor confirmation"] as const

function pattern(
  category: string,
  titles: string[],
  symptoms: string[],
  resolution: string,
  teams: string[],
  keywords: string[],
): IncidentPattern {
  return { category, titles, symptoms, resolution, teams, keywords }
}

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!
}

function shuffle<T>(rng: () => number, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = arr[i]!
    arr[i] = arr[j]!
    arr[j] = tmp
  }
  return arr
}

function quotaList<T extends string>(
  ratios: Record<T, number>,
  total: number,
  rng: () => number,
): T[] {
  const entries = Object.entries(ratios) as [T, number][]
  const counts = entries.map(([label, ratio]) => ({
    label,
    count: Math.floor(ratio * total),
    remainder: ratio * total - Math.floor(ratio * total),
  }))
  let used = counts.reduce((sum, x) => sum + x.count, 0)
  for (const item of [...counts].sort((a, b) => b.remainder - a.remainder)) {
    if (used >= total) break
    item.count++
    used++
  }
  return shuffle(
    rng,
    counts.flatMap((x) => Array.from({ length: x.count }, () => x.label)),
  )
}

function selectTopByScore<T extends { [key: string]: unknown }>(
  items: T[],
  scoreKey: keyof T,
  countToSelect: number,
): Set<number> {
  return new Set(
    [...items]
      .sort((a, b) => Number(b[scoreKey]) - Number(a[scoreKey]))
      .slice(0, countToSelect)
      .map((x) => Number(x.index)),
  )
}

function maybe(rng: () => number, probability: number) {
  return rng() < probability
}

function minutesBetween(a: Date, b: Date) {
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 60_000))
}

function addMinutes(d: Date, minutes: number) {
  return new Date(d.getTime() + minutes * 60_000)
}

function prioritySlaMinutes(priority: HistoricalTicketSeed["priority"]) {
  if (/critical/i.test(priority)) return 240
  if (/high/i.test(priority)) return 720
  if (/medium/i.test(priority)) return 1_440
  return 2_880
}

function normalizeBasicText(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function applyTextNoise(text: string, rng: () => number, level: NoiseLevel) {
  const cfg = NOISE_CONFIG[level]
  let out = text

  if (maybe(rng, cfg.shorthand)) {
    out = out
      .replace(/\bpayment\b/gi, "paymt")
      .replace(/\bcheckout\b/gi, "chkout")
      .replace(/\bnetwork\b/gi, "net")
      .replace(/\bterminal\b/gi, "term")
      .replace(/\bplease\b/gi, "pls")
      .replace(/\bback office\b/gi, "backoffice")
  }
  if (maybe(rng, cfg.textNoise)) {
    out = out
      .replace(/\bunavailable\b/gi, "unavail")
      .replace(/\bintermittent\b/gi, "intermitent")
      .replace(/\bsynchronization\b/gi, "sync")
      .replace(/\bauthorization\b/gi, "authorisation")
      .replace(/\bcommunication\b/gi, "comm")
  }
  if (maybe(rng, cfg.textNoise / 2)) {
    const words = out.split(/\s+/)
    if (words.length > 4) {
      const pos = Math.floor(rng() * words.length)
      words.splice(pos, 0, words[pos]!)
      out = words.join(" ")
    }
  }
  if (maybe(rng, cfg.formatting)) {
    const mode = Math.floor(rng() * 4)
    if (mode === 0) out = out.toLowerCase()
    if (mode === 1) out = out.toUpperCase()
    if (mode === 2) out = out.replace(/[.,;:]/g, "")
    if (mode === 3) out = out.replace(/\s+/g, " ").trim()
  }
  return out
}

function noisyPerimeter(perimeterKey: PerimeterKey, rng: () => number, level: NoiseLevel) {
  const cfg = NOISE_CONFIG[level]
  if (maybe(rng, cfg.formatting)) return pick(rng, PERIMETER_VARIANTS[perimeterKey])
  return PERIMETER_LABELS[perimeterKey]
}

export function normalizeTrainingPerimeter(perimeter: string): PerimeterKey | "UNKNOWN" {
  const key = perimeter.trim().toUpperCase().replace(/[-/]/g, " ").replace(/\s+/g, " ")
  if (key.includes("SCO") || key.includes("SELF")) return "SCO"
  if (key.includes("PAY") || key.includes("MONETIQUE")) return "PAYMENT"
  if (key.includes("LOYAL") || key.includes("FIDEL")) return "LOYALTY"
  if (key.includes("NETWORK") || key.includes("LAN") || key.includes("WAN")) return "NETWORK"
  if (key.includes("HARDWARE") || key.includes("PERIPHER")) return "HARDWARE"
  if (key.includes("BACK") || key === "BO SYNC") return "BACK_OFFICE"
  if (key.includes("INFRA") || key.includes("SERVER")) return "STORE_INFRA"
  if (key.includes("CHECKOUT") || key.includes("VLP")) return "CHECKOUT"
  return "UNKNOWN"
}

function buildDescription(input: {
  title: string
  incident: IncidentPattern
  storeName: string
  city: string
  priority: string
  ambiguity: AmbiguityPattern | null
  rng: () => number
  level: NoiseLevel
}) {
  const { title, incident, storeName, city, priority, ambiguity, rng, level } = input
  const symptom = pick(rng, incident.symptoms)
  const templates = [
    `${symptom} at ${storeName}, ${city}. Priority ${priority}. Store requests support before peak traffic.`,
    `${title}. ${symptom}. Local restart attempted once, issue still present on store side.`,
    `${symptom}; impact reported by store ops. Need check logs, lane/service health and recent changes.`,
    `${title} - ${symptom}. Store says issue is intermittent and affects customer flow.`,
    `${symptom}. Vendor not yet contacted. Please verify perimeter before transfer.`,
  ]
  let text = pick(rng, templates)
  if (ambiguity && maybe(rng, 0.72)) text = `${text} ${ambiguity.note}`
  if (maybe(rng, 0.12)) text = `${text} ${pick(rng, incident.symptoms)}. ${pick(rng, incident.symptoms)}.`
  return applyTextNoise(text, rng, level)
}

function splitForIndex(index: number, total: number): DatasetSplit {
  const ratio = index / total
  if (ratio < SPLIT_RATIOS.train) return "train"
  if (ratio < SPLIT_RATIOS.train + SPLIT_RATIOS.validation) return "validation"
  return "test"
}

function distribution(values: string[]): Distribution {
  const total = values.length || 1
  const out: Distribution = {}
  for (const v of values) {
    out[v] ??= { count: 0, pct: 0 }
    out[v]!.count++
  }
  for (const v of Object.keys(out)) {
    out[v]!.pct = Math.round((out[v]!.count / total) * 10_000) / 100
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)))
}

function boolDistribution(values: boolean[]) {
  return distribution(values.map((v) => (v ? "yes" : "no")))
}

function pctYes(values: boolean[]) {
  return (values.filter(Boolean).length / Math.max(1, values.length)) * 100
}

function rangeCheck(label: string, pct: number, min: number, max: number, hard = true) {
  if (pct >= min && pct <= max) return null
  const kind = hard ? "FAIL" : "WARN"
  return `${kind}: ${label} is ${pct.toFixed(1)}%, expected ${min}-${max}%`
}

function missingCount<T>(items: T[], selector: (item: T) => unknown) {
  return items.filter((item) => {
    const value = selector(item)
    return value == null || value === ""
  }).length
}

export function validateMlTrainingDataset(
  tickets: HistoricalTicketSeed[],
  kmArticles: KmArticleSeed[],
): DatasetValidationSummary {
  const warnings: string[] = []
  const perimeters = tickets.map((t) => normalizeTrainingPerimeter(t.perimeter))
  const priorities = tickets.map((t) => t.priority)
  const missingValues = {
    description: missingCount(tickets, (t) => t.description),
    resolutionSummary: missingCount(tickets, (t) => t.resolutionSummary),
    assignedTeam: missingCount(tickets, (t) => t.assignedTeam),
    resolvedAt: missingCount(tickets, (t) => t.resolvedAt),
  }
  const missingPercentages = Object.fromEntries(
    Object.entries(missingValues).map(([k, v]) => [k, Math.round((v / Math.max(1, tickets.length)) * 10_000) / 100]),
  )

  const perimeterDist = distribution(perimeters)
  for (const [name, item] of Object.entries(perimeterDist)) {
    if (item.pct > 25) warnings.push(`FAIL: perimeter ${name} is ${item.pct}%, max is 25%`)
  }

  const esc = pctYes(tickets.map((t) => t.escalationRequired))
  const transfer = pctYes(tickets.map((t) => t.transferRequired))
  const sla = pctYes(tickets.map((t) => t.slaBreached))
  const escMsg = rangeCheck("escalation_required=yes", esc, 35, 45)
  const transferMsg = rangeCheck("transfer_required=yes", transfer, 30, 40)
  const slaMsg = rangeCheck("sla_breached=yes", sla, 25, 35)
  if (escMsg) warnings.push(escMsg)
  if (transferMsg) warnings.push(transferMsg)
  if (slaMsg) warnings.push(slaMsg)

  const priorityDist = distribution(priorities)
  const priorityTargets = {
    Critical: [15, 20],
    High: [25, 30],
    Medium: [35, 40],
    Low: [10, 15],
  } as const
  for (const [priority, [min, max]] of Object.entries(priorityTargets)) {
    const pct = priorityDist[priority]?.pct ?? 0
    const msg = rangeCheck(`priority=${priority}`, pct, min, max)
    if (msg) warnings.push(msg)
  }

  if (kmArticles.length < 80 || kmArticles.length > 120) {
    warnings.push(`WARN: KM articles count is ${kmArticles.length}, expected 80-120 for benchmark scale`)
  }

  const descLengths = tickets
    .map((t) => t.description?.length ?? 0)
    .filter((n) => n > 0)
  const averageDescriptionLength =
    descLengths.length === 0
      ? 0
      : Math.round(descLengths.reduce((sum, n) => sum + n, 0) / descLengths.length)

  const status = warnings.some((w) => w.startsWith("FAIL:"))
    ? "fail"
    : warnings.length > 0
      ? "warn"
      : "pass"

  return {
    totalTickets: tickets.length,
    escalationDistribution: boolDistribution(tickets.map((t) => t.escalationRequired)),
    transferDistribution: boolDistribution(tickets.map((t) => t.transferRequired)),
    slaBreachedDistribution: boolDistribution(tickets.map((t) => t.slaBreached)),
    priorityDistribution: priorityDist,
    perimeterDistribution: perimeterDist,
    splitDistribution: distribution(tickets.map((t) => t.split)),
    missingValues,
    missingPercentages,
    averageDescriptionLength,
    uniqueStores: new Set(tickets.map((t) => t.storeId)).size,
    uniqueCategories: new Set(tickets.map((t) => t.incidentCategory)).size,
    kmArticles: kmArticles.length,
    status,
    warnings,
  }
}

function buildKmArticles(rng: () => number): KmArticleSeed[] {
  const out: KmArticleSeed[] = []
  const procedureVariants = [
    {
      suffix: "recovery procedure",
      focus: "service restoration",
      finalStep: "Validate service with store operations and update ticket timeline.",
    },
    {
      suffix: "diagnostic checklist",
      focus: "root cause qualification",
      finalStep: "Record diagnostic evidence before escalation or transfer.",
    },
    {
      suffix: "store validation guide",
      focus: "store-side confirmation",
      finalStep: "Confirm business recovery with the store supervisor.",
    },
    {
      suffix: "escalation readiness guide",
      focus: "handover preparation",
      finalStep: "Attach logs, impact summary, and attempted actions before routing.",
    },
  ]

  for (const [perimeterKey, incidents] of Object.entries(INCIDENTS) as [PerimeterKey, IncidentPattern[]][]) {
    for (const incident of incidents) {
      for (const variant of procedureVariants) {
        out.push({
          title: `${incident.category.replaceAll("_", " ").toLowerCase()} ${variant.suffix}`,
          procedureSteps: [
            "Confirm store, impacted device, and business impact.",
            `Focus area: ${variant.focus}.`,
            `Check symptoms: ${incident.symptoms.join("; ")}.`,
            "Review recent changes, logs, and monitoring alerts.",
            incident.resolution,
            variant.finalStep,
          ].join("\n"),
          perimeter: PERIMETER_LABELS[perimeterKey],
          incidentCategory: incident.category,
          keywords: [...incident.keywords, variant.focus].join(", "),
          difficultyLevel: pick(rng, ["low", "medium", "medium", "high"]),
          applicabilityScore: Math.round((0.62 + rng() * 0.33) * 100) / 100,
        })
      }
    }
  }
  return out
}

function createExports(tickets: HistoricalTicketSeed[]): DatasetExportSeed[] {
  return tickets.flatMap((t) => {
    const labels = {
      perimeter: normalizeTrainingPerimeter(t.perimeter),
      priority: t.priority,
      escalationRequired: t.escalationRequired,
      transferRequired: t.transferRequired,
      slaBreached: t.slaBreached,
      incidentCategory: t.incidentCategory,
    }
    return [
      {
        exportType: "raw_text" as const,
        split: t.split,
        ticketId: t.ticketId,
        textPayload: t.rawText,
        labelPayload: labels,
      },
      {
        exportType: "cleaned_text" as const,
        split: t.split,
        ticketId: t.ticketId,
        textPayload: t.cleanedText,
        labelPayload: labels,
      },
      {
        exportType: "vectorization_ready" as const,
        split: t.split,
        ticketId: t.ticketId,
        textPayload: t.vectorizationText,
        labelPayload: labels,
      },
    ]
  })
}

export function generateMlTrainingDataset(options?: {
  size?: number
  seed?: number
  noiseLevel?: NoiseLevel
  generatedAt?: Date
}): MlTrainingDataset {
  const size = options?.size ?? DEFAULT_SIZE
  if (size < MIN_DATASET_SIZE || size > MAX_DATASET_SIZE) {
    throw new Error(`ML training dataset size must be between ${MIN_DATASET_SIZE} and ${MAX_DATASET_SIZE} tickets.`)
  }
  const seed = options?.seed ?? DEFAULT_SEED
  const noiseLevel = options?.noiseLevel ?? "medium"
  const generatedAt = options?.generatedAt ?? new Date()
  const rng = mulberry32(seed)

  const perimeters = quotaList(PERIMETER_RATIOS, size, rng)
  const priorities = quotaList(PRIORITY_RATIOS, size, rng)

  const drafts: TicketDraft[] = []
  const baseDate = new Date(generatedAt)
  baseDate.setDate(baseDate.getDate() - 240)

  for (let i = 0; i < size; i++) {
    const perimeterKey = perimeters[i] as PerimeterKey
    const priority = priorities[i] as TicketDraft["priority"]
    const incident = pick(rng, INCIDENTS[perimeterKey])
    const ambiguity = maybe(rng, 0.22) ? pick(rng, AMBIGUITY[perimeterKey] ?? [null]) : null
    const store = CARREFOUR_OPERATIONAL_STORES[i % CARREFOUR_OPERATIONAL_STORES.length]!
    const createdAt = addMinutes(baseDate, i * 79 + Math.floor(rng() * 240))

    const priorityWeight = { Critical: 1, High: 0.7, Medium: 0.35, Low: 0.1 }[priority]
    const escalationPerimeterWeight = ["NETWORK", "HARDWARE", "STORE_INFRA"].includes(perimeterKey)
      ? 0.24
      : ["PAYMENT", "BACK_OFFICE"].includes(perimeterKey)
        ? 0.13
        : 0.04
    const transferPerimeterWeight = ["PAYMENT", "NETWORK", "HARDWARE", "BACK_OFFICE"].includes(perimeterKey)
      ? 0.26
      : ["LOYALTY", "SCO"].includes(perimeterKey)
        ? 0.12
        : 0.06
    const ambiguityWeight = ambiguity ? 0.22 : 0

    drafts.push({
      index: i,
      ticketId: `ML-CARE-${String(i + 1).padStart(6, "0")}`,
      perimeterKey,
      priority,
      split: splitForIndex(i, size),
      store,
      incident,
      createdAt,
      ambiguity,
      escalationScore: priorityWeight + escalationPerimeterWeight + ambiguityWeight + rng() * 0.5,
      transferScore: transferPerimeterWeight + ambiguityWeight + rng() * 0.55,
      slaScore: priorityWeight + rng() * 0.5,
    })
  }

  const escalatedSet = selectTopByScore(drafts, "escalationScore", Math.round(size * 0.4))
  const transferSet = selectTopByScore(drafts, "transferScore", Math.round(size * 0.35))
  const slaSet = selectTopByScore(drafts, "slaScore", Math.round(size * 0.3))

  const tickets: HistoricalTicketSeed[] = []
  const actions: HistoricalActionSeed[] = []
  const resolutions: HistoricalResolutionSeed[] = []

  for (const draft of drafts) {
    const { index, ticketId, priority, perimeterKey, incident, store, ambiguity, createdAt } = draft
    const escalationRequired = escalatedSet.has(index)
    const transferRequired = transferSet.has(index)
    const slaBreached = slaSet.has(index)
    const resolved = maybe(rng, priority === "Critical" ? 0.64 : 0.76)
    const resolutionBase = priority === "Critical" ? 420 : priority === "High" ? 680 : priority === "Medium" ? 1_120 : 1_650
    const resolutionTimeMinutes = resolved
      ? Math.max(25, Math.round(resolutionBase * (0.55 + rng() * 1.25) + (slaBreached ? prioritySlaMinutes(priority) * 0.55 : 0)))
      : null
    const resolvedAt = resolved && resolutionTimeMinutes != null ? addMinutes(createdAt, resolutionTimeMinutes) : null
    const finalResolutionStatus = resolved
      ? pick(rng, ["resolved", "closed", "resolved", "validated"])
      : pick(rng, ["open", "in_progress", "monitoring"])
    const status = resolved
      ? pick(rng, ["Resolved", "Closed", "RESOLVED"])
      : pick(rng, ["Open", "In Progress", "Monitoring", "OPEN", "in progress"])

    const title = applyTextNoise(pick(rng, incident.titles), rng, noiseLevel)
    const description = maybe(rng, NOISE_CONFIG[noiseLevel].missingDescription)
      ? null
      : buildDescription({
          title,
          incident,
          storeName: store.storeName,
          city: store.city,
          priority,
          ambiguity,
          rng,
          level: noiseLevel,
        })
    const rawText = [title, description ?? "", store.storeName, store.city, PERIMETER_LABELS[perimeterKey]]
      .filter(Boolean)
      .join(" ")
    const cleanedText = normalizeBasicText(rawText)
    const vectorizationText = [
      cleanedText,
      normalizeBasicText(incident.category),
      normalizeBasicText(PERIMETER_LABELS[perimeterKey]),
      normalizeBasicText(priority),
    ].join(" ")

    const assignedTeam = maybe(rng, NOISE_CONFIG[noiseLevel].missingAssignedTeam)
      ? null
      : pick(rng, incident.teams)
    const resolutionSummary = resolved && !maybe(rng, NOISE_CONFIG[noiseLevel].missingResolutionSummary)
      ? applyTextNoise(incident.resolution, rng, noiseLevel)
      : null

    const ticket: HistoricalTicketSeed = {
      ticketId,
      title,
      description,
      perimeter: noisyPerimeter(perimeterKey, rng, noiseLevel),
      priority,
      status,
      storeId: store.storeCode,
      storeName: store.storeName,
      city: store.city,
      region: store.region,
      assignedTeam,
      createdAt,
      resolvedAt,
      resolutionTimeMinutes,
      slaBreached,
      escalationRequired,
      transferRequired,
      incidentCategory: ambiguity?.rootCauseCategory
        ? `${incident.category}__ROOT_${ambiguity.rootCauseCategory}`
        : incident.category,
      environmentType: pick(rng, ENV_TYPES),
      ticketSource: pick(rng, SOURCES),
      resolutionSummary,
      finalResolutionStatus,
      split: draft.split,
      noiseLevel,
      rawText,
      cleanedText,
      vectorizationText,
    }
    tickets.push(ticket)

    actions.push({
      ticketId,
      actionType: "CREATED",
      previousStatus: null,
      newStatus: "Open",
      assignedGroup: assignedTeam,
      timestamp: createdAt,
      actionAuthor: "CARE_SYSTEM",
    })

    if (transferRequired) {
      actions.push({
        ticketId,
        actionType: "TRANSFERRED",
        previousStatus: "Open",
        newStatus: "In Progress",
        assignedGroup: assignedTeam ?? pick(rng, incident.teams),
        timestamp: addMinutes(createdAt, 45 + Math.floor(rng() * 420)),
        actionAuthor: pick(rng, ACTION_AUTHORS),
      })
    }
    if (escalationRequired) {
      actions.push({
        ticketId,
        actionType: "ESCALATED",
        previousStatus: transferRequired ? "In Progress" : "Open",
        newStatus: "Escalated",
        assignedGroup: "N3 Support",
        timestamp: addMinutes(createdAt, 90 + Math.floor(rng() * 720)),
        actionAuthor: pick(rng, ACTION_AUTHORS),
      })
    }
    if (resolvedAt && resolutionTimeMinutes != null) {
      actions.push({
        ticketId,
        actionType: "RESOLVED",
        previousStatus: escalationRequired ? "Escalated" : "In Progress",
        newStatus: "Resolved",
        assignedGroup: assignedTeam ?? pick(rng, incident.teams),
        timestamp: resolvedAt,
        actionAuthor: pick(rng, ACTION_AUTHORS),
      })
      resolutions.push({
        ticketId,
        resolutionSummary,
        resolutionCategory: incident.category,
        closureReason: pick(rng, CLOSURE_REASONS),
        solvedByTeam: assignedTeam ?? pick(rng, incident.teams),
        resolutionType: pick(rng, RESOLUTION_TYPES),
        fixDurationMinutes: resolutionTimeMinutes,
      })
    }
  }

  const kmArticles = buildKmArticles(rng)
  const summary = validateMlTrainingDataset(tickets, kmArticles)
  const exports = createExports(tickets)
  const metadata: DatasetMetadataSeed = {
    datasetName: "carepilot_historical_v1",
    generatedAt,
    totalTickets: tickets.length,
    noiseLevel,
    seed,
    splitRatios: SPLIT_RATIOS,
    classDistributions: {
      escalationRequired: summary.escalationDistribution,
      transferRequired: summary.transferDistribution,
      slaBreached: summary.slaBreachedDistribution,
      priority: summary.priorityDistribution,
      perimeter: summary.perimeterDistribution,
      split: summary.splitDistribution,
    },
    missingness: summary.missingPercentages,
    uniqueStores: summary.uniqueStores,
    uniqueCategories: summary.uniqueCategories,
    validationStatus: summary.status,
    validationWarnings: summary.warnings,
  }

  return { tickets, actions, resolutions, kmArticles, metadata, exports }
}
