import { CARREFOUR_OPERATIONAL_STORES } from "@/lib/data/carrefour-stores"

export type NoiseLevel = "low" | "medium" | "high"
export type DatasetSplit = "train" | "validation" | "test"

export type RecommendedAction =
  | "RESOLVE_LOCALLY"
  | "APPLY_KM"
  | "ESCALATE_N3"
  | "TRANSFER_PERIMETER"
  | "REQUEST_INFORMATION"
  | "MONITOR"

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
  ticketAgeMinutes: number
  queueLoad: number
  storeSize: string
  operationalComplexity: number
  escalationRequired: boolean
  transferRequired: boolean
  recommendedAction: RecommendedAction
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
  expectedKmId: string | null
  relevantKmIds: string[]
  similarCaseGroupId: string
  incidentCluster: string
  semanticGroup: string
  incidentFamily: string
  rootCauseFamily: string
  resolutionPattern: string
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
  kmId: string
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
  actionDistribution: Distribution
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
  priority: PriorityClass
  urgencyScore: number
  split: DatasetSplit
  store: (typeof CARREFOUR_OPERATIONAL_STORES)[number]
  incident: IncidentPattern
  createdAt: Date
  ambiguity: AmbiguityPattern | null
  escalationScore: number
  transferScore: number
  slaScore: number
  queueLoad: number
  storeSize: string
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
  CHECKOUT: "FO",
  SCO: "SCO",
  PAYMENT: "Payment",
  LOYALTY: "Loyalty",
  NETWORK: "Network",
  HARDWARE: "Hardware",
  BACK_OFFICE: "Back Office",
  STORE_INFRA: "Store Infrastructure",
}

const PERIMETER_VARIANTS: Record<PerimeterKey, string[]> = {
  CHECKOUT: ["FO", "Front Office", "Checkout", "checkout", "CHECKOUT", "VLP", "front office checkout"],
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
  P1: 0.15,
  P2: 0.28,
  P3: 0.43,
  P4: 0.14,
} as const

type PriorityClass = keyof typeof PRIORITY_RATIOS

const PRIORITY_WEIGHT = { P1: 1, P2: 0.7, P3: 0.35, P4: 0.1 } as const
const TRANSFER_PRIORITY_WEIGHT = { P1: 0.48, P2: 0.32, P3: 0.16, P4: 0.05 } as const
const SLA_PRIORITY_BOOST = { P1: 0.16, P2: 0.11, P3: 0.06, P4: 0.03 } as const
const ACTION_PRIORITY_BOOST = { P1: 0.22, P2: 0.14, P3: 0.06, P4: 0.02 } as const

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
    { note: "Network instability suspected but lane recovered after local session rebuild.", rootCauseCategory: "NETWORK" },
    { note: "Operator initially requested network transfer; issue cleared on lane after reboot.", rootCauseCategory: "NETWORK" },
  ],
  SCO: [
    { note: "Network packet loss made the SCO unit look frozen.", rootCauseCategory: "NETWORK" },
    { note: "Scale sensor fault triggered payment validation retries.", rootCauseCategory: "HARDWARE" },
    { note: "SCO payment reader looked like payment perimeter issue; fixed locally.", rootCauseCategory: "PAYMENT" },
  ],
  PAYMENT: [
    { note: "WAN instability caused intermittent authorization timeouts.", rootCauseCategory: "NETWORK" },
    { note: "Back-office parameter mismatch caused host rejection.", rootCauseCategory: "BACK_OFFICE" },
    { note: "Payment terminal recovered after lane-side restart; transfer not required.", rootCauseCategory: "PAYMENT" },
    { note: "Monetique team consulted but acquirer route restored without perimeter change.", rootCauseCategory: "PAYMENT" },
  ],
  LOYALTY: [
    { note: "Back-office synchronization delay caused stale loyalty balance.", rootCauseCategory: "BACK_OFFICE" },
    { note: "Network DNS issue affected loyalty API resolution.", rootCauseCategory: "NETWORK" },
    { note: "Member lookup restored after cache refresh on same perimeter.", rootCauseCategory: "LOYALTY" },
  ],
  NETWORK: [
    { note: "Checkout VLAN issue looked like store network outage; localized to one switch port.", rootCauseCategory: "CHECKOUT" },
    { note: "VPN alert triggered but checkout recovered after local gateway restart.", rootCauseCategory: "NETWORK" },
    { note: "Packet loss traced to lane patch panel, not WAN transfer case.", rootCauseCategory: "HARDWARE" },
  ],
  HARDWARE: [
    { note: "Printer fault resembled FO lane software issue; device swap fixed it locally.", rootCauseCategory: "CHECKOUT" },
    { note: "Scanner symptoms overlapped with checkout VLP vocabulary; remained hardware.", rootCauseCategory: "CHECKOUT" },
    { note: "Vendor dispatch considered but cable reseat resolved on store perimeter.", rootCauseCategory: "HARDWARE" },
  ],
  BACK_OFFICE: [
    { note: "Replication delay looked like network outage from store perspective.", rootCauseCategory: "NETWORK" },
    { note: "POS crash resembled checkout incident; resolved in back-office batch.", rootCauseCategory: "CHECKOUT" },
    { note: "Inventory sync recovered without routing to another perimeter.", rootCauseCategory: "BACK_OFFICE" },
  ],
  STORE_INFRA: [
    { note: "Store server alert caused checkout slowdown; infra fix avoided transfer.", rootCauseCategory: "CHECKOUT" },
    { note: "Database disk warning looked like payment host issue; local cleanup only.", rootCauseCategory: "STORE_INFRA" },
  ],
}

/** Wording that suggests transfer but ticket stayed on current perimeter. */
const TRANSFER_LANGUAGE_NO_TRANSFER = [
  "Network team mentioned on bridge call but issue cleared after lane reboot.",
  "Considered transfer to payment perimeter; resolved after local session reset.",
  "Operator note mentions hardware swap but device recovered after cable reseat.",
  "Transfer to network was discussed; VLAN check showed local POS misconfiguration.",
  "Supervisor asked about routing to back office; price file replay fixed it on lane.",
  "Initial triage suggested cross-perimeter handoff; KM procedure closed it locally.",
  "Misleading payment timeout wording; acquirer recovered without transfer.",
] as const

/** Partial fix before closure without transfer. */
const LOCAL_RESOLUTION_SNIPPETS = [
  "Partial diagnostics completed on lane before supervisor closed ticket locally.",
  "Temporary workaround applied on current perimeter and accepted by store.",
  "First-line checks exhausted but issue did not require perimeter routing.",
  "Monitoring stable after local restart; transfer recommendation withdrawn.",
] as const

/** Language on tickets that were actually transferred. */
const TRANSFER_CONFIRMED_SNIPPETS = [
  "Cross-perimeter routing confirmed after local checks failed.",
  "Handed over to target perimeter following repeated local attempts.",
  "Transfer approved after vendor and first-line diagnostics were inconclusive.",
  "Perimeter change recorded after partial resolution attempt on origin team.",
] as const

/** Vague routing language shared by transferred and locally closed tickets. */
const BORDERLINE_ROUTING_SNIPPETS = [
  "Perimeter ownership still unclear after first-line checks.",
  "Store reports mixed payment and lane symptoms during peak.",
  "Routing discussed on bridge call but handoff not yet confirmed.",
  "Operator note references another perimeter without formal transfer.",
  "Symptoms overlap network and checkout vocabulary in ticket text.",
  "Supervisor flagged possible cross-team routing during triage.",
] as const

const KM_SCENARIO_SNIPPETS: Partial<Record<string, string[]>> = {
  PAYMENT_GATEWAY_TIMEOUT: [
    "Card authorization hangs during checkout and payment host appears to be timing out.",
    "Several lanes report payment gateway timeout while authorizing customer cards.",
    "Payment validation stalls after amount send; acquirer response delayed.",
  ],
  SCO_TERMINAL_OFFLINE: [
    "Self-checkout lane offline in attendant console and customer screen frozen.",
    "SCO unit unreachable; attendant cannot recover session without reboot guidance.",
    "Self checkout terminal down during peak; store needs SCO recovery steps.",
  ],
  SCO_PAYMENT_READER: [
    "SCO payment reader fails to initialize and contactless validation is blocked.",
    "Self checkout pinpad error prevents payment authorization on the lane.",
  ],
  RECEIPT_PRINTER_OFFLINE: [
    "Receipt printer unavailable at checkout; spooler cannot reach the device.",
    "Printer communication lost on POS lane; test receipt cannot be printed.",
  ],
  STORE_NETWORK_INSTABILITY: [
    "Store network instability with packet loss on checkout VLAN and POS latency spikes.",
    "Intermittent connectivity issues affect checkout subnet and back-office reachability.",
  ],
  LOYALTY_SERVICE_UNAVAILABLE: [
    "Loyalty service unavailable and member profile lookup returns an error.",
    "Customer loyalty balance missing; loyalty host not responding at store.",
    "Loyalty synchronization issue prevents member balance refresh at checkout.",
    "Loyalty balance mismatch reported after profile sync retry.",
  ],
  POS_SYNC_ISSUE: [
    "POS synchronization issue blocks end-of-day close and lane totals mismatch back-office.",
    "Checkout register synchronization issue leaves sales file stuck.",
  ],
  CHECKOUT_LANE_UNAVAILABLE: [
    "Checkout lane unavailable after login; cashier cannot process baskets.",
    "POS lane down and session freezes when operator signs in.",
  ],
}

const SEMANTIC_TITLE_ALIASES: Partial<Record<string, string[]>> = {
  SCO_TERMINAL_OFFLINE: [
    "SCO disconnected",
    "self checkout unavailable",
    "SCO payment timeout",
    "SCO synchronization failed",
    "SCO unit not responding",
    "self checkout lane offline",
  ],
  SCO_PAYMENT_READER: [
    "SCO pinpad not responding",
    "self checkout card reader fault",
    "SCO contactless reader unavailable",
    "self checkout payment device error",
  ],
  PAYMENT_GATEWAY_TIMEOUT: [
    "payment authorization timeout",
    "acquirer host unreachable",
    "payment gateway unavailable",
    "card authorization timeout at checkout",
    "payment host response delayed",
  ],
  RECEIPT_PRINTER_OFFLINE: [
    "receipt printer offline",
    "fiscal printer unavailable",
    "printer communication lost",
    "receipt printer unavailable at lane",
    "fiscal device not responding",
  ],
  POS_SYNC_ISSUE: [
    "POS synchronization failure",
    "checkout totals sync blocked",
    "lane replication lag",
    "POS sync backlog after restart",
  ],
  STORE_NETWORK_INSTABILITY: [
    "store connectivity instability",
    "checkout VLAN packet loss",
    "intermittent network on checkout subnet",
    "store LAN instability during peak",
  ],
  LOYALTY_SERVICE_UNAVAILABLE: [
    "loyalty synchronization issue",
    "loyalty service unavailable",
    "loyalty balance mismatch",
    "member profile lookup failing",
    "loyalty host not responding",
  ],
  BACKUP_JOB_FAILED: [
    "nightly backup incomplete",
    "store backup failed",
    "backup job failed store systems",
    "backup retention validation failed",
  ],
  VPN_TUNNEL_DOWN: [
    "store VPN tunnel down",
    "remote access link unavailable",
    "VPN endpoint unreachable from store",
  ],
  DNS_RESOLUTION_FAILURE: [
    "store DNS lookup failing",
    "name resolution errors on lane",
    "DNS resolution timeout at checkout",
  ],
  CHECKOUT_LANE_UNAVAILABLE: [
    "checkout lane unavailable",
    "POS lane down after login",
    "register session frozen at lane",
  ],
}

const SEMANTIC_SYMPTOM_VARIANTS: Partial<Record<string, string[]>> = {
  SCO_TERMINAL_OFFLINE: [
    "SCO lane heartbeat missing after overnight reboot",
    "self checkout session will not start for customers",
    "SCO terminal shows disconnected in lane monitor",
    "self checkout lane stuck in unavailable state",
    "SCO unit offline while adjacent lanes remain healthy",
  ],
  PAYMENT_GATEWAY_TIMEOUT: [
    "authorization times out after lane reboot",
    "card payments stall at checkout host",
    "payment host response delayed beyond SLA",
    "lane cannot complete card authorization",
    "timeout observed on payment gateway handshake",
  ],
  RECEIPT_PRINTER_OFFLINE: [
    "fiscal printer offline at checkout lane",
    "receipt printer unavailable after paper reload",
    "lane cannot print fiscal receipt",
    "printer queue blocked on checkout terminal",
    "receipt device not responding at POS",
  ],
  POS_SYNC_ISSUE: [
    "POS totals fail to synchronize with back office",
    "checkout lane blocked by sync backlog",
    "end-of-day totals mismatch after sync retry",
    "lane replication lag reported by store ops",
    "POS synchronization failure after controller restart",
  ],
  STORE_NETWORK_INSTABILITY: [
    "intermittent packet loss on checkout VLAN",
    "store connectivity drops during peak hours",
    "lane services flap when network load increases",
    "checkout VLAN instability after switch maintenance",
    "store network jitter affecting lane availability",
  ],
  BACKUP_JOB_FAILED: [
    "nightly backup incomplete for store controller",
    "backup retention job failed validation",
    "store systems backup did not finish before window close",
    "backup copy missing expected restore point",
    "store backup agent reported failure overnight",
  ],
}

const SEMANTIC_FAMILY: Partial<Record<string, string>> = {
  SCO_TERMINAL_OFFLINE: "SEM-SCO-AVAILABILITY",
  SCO_PAYMENT_READER: "SEM-SCO-PAYMENT",
  SCO_SCALE_SENSOR: "SEM-SCO-HARDWARE",
  PAYMENT_GATEWAY_TIMEOUT: "SEM-PAYMENT-HOST",
  PINPAD_ENCRYPTION_ERROR: "SEM-PAYMENT-DEVICE",
  RECEIPT_PRINTER_OFFLINE: "SEM-PERIPHERAL-PRINTER",
  SCANNER_NOT_DETECTED: "SEM-PERIPHERAL-SCANNER",
  STORE_NETWORK_INSTABILITY: "SEM-NETWORK-CONNECTIVITY",
  STORE_VPN_UNAVAILABLE: "SEM-NETWORK-REMOTE",
  POS_SYNC_ISSUE: "SEM-POS-DATA",
  CHECKOUT_LANE_UNAVAILABLE: "SEM-CHECKOUT-AVAILABILITY",
  LOYALTY_SERVICE_UNAVAILABLE: "SEM-LOYALTY-SERVICE",
}

type SimilarGroupProfile = {
  incidentFamily: string
  rootCauseFamily: string
  resolutionPattern: string
  titleVariants: string[]
}

const SIMILAR_GROUP_PROFILES: Partial<Record<string, SimilarGroupProfile>> = {
  SCO_TERMINAL_OFFLINE: {
    incidentFamily: "SCO terminal offline",
    rootCauseFamily: "lane controller disconnect / heartbeat loss",
    resolutionPattern: "restart SCO lane service and validate controller connectivity",
    titleVariants: [
      "SCO disconnected",
      "self checkout unavailable",
      "SCO synchronization failed",
      "SCO unit not responding",
      "self checkout lane offline",
      "SCO lane frozen after overnight reboot",
      "self checkout terminal down during peak",
      "SCO heartbeat missing in attendant console",
    ],
  },
  SCO_PAYMENT_READER: {
    incidentFamily: "SCO payment reader fault",
    rootCauseFamily: "pinpad initialization / contactless reader failure",
    resolutionPattern: "reset SCO payment reader and reinitialize pinpad encryption",
    titleVariants: [
      "SCO pinpad not responding",
      "self checkout card reader fault",
      "SCO contactless reader unavailable",
      "self checkout payment device error",
      "SCO payment reader fails to initialize",
      "contactless validation blocked on SCO lane",
      "SCO card reader offline after reboot",
      "self checkout pinpad encryption error",
    ],
  },
  PAYMENT_GATEWAY_TIMEOUT: {
    incidentFamily: "SCO payment timeout",
    rootCauseFamily: "payment authorization / network latency",
    resolutionPattern: "restart SCO payment service and validate acquirer connectivity",
    titleVariants: [
      "SCO payment timeout after validation",
      "Self-checkout payment blocked on card authorization",
      "SCO lane frozen after payment confirmation",
      "Payment validation timeout on self-checkout terminal",
      "Customer payment stuck on SCO terminal",
      "payment authorization timeout at checkout",
      "acquirer host unreachable during card payment",
      "payment gateway unavailable on checkout lane",
    ],
  },
  RECEIPT_PRINTER_OFFLINE: {
    incidentFamily: "receipt printer offline",
    rootCauseFamily: "printer communication / spooler connectivity",
    resolutionPattern: "restart print spooler and validate fiscal printer connectivity",
    titleVariants: [
      "receipt printer offline",
      "fiscal printer unavailable",
      "printer communication lost",
      "receipt printer unavailable at lane",
      "fiscal device not responding",
      "lane cannot print fiscal receipt",
      "printer queue blocked on checkout terminal",
      "receipt device offline after paper reload",
    ],
  },
  LOYALTY_SERVICE_UNAVAILABLE: {
    incidentFamily: "loyalty service unavailable",
    rootCauseFamily: "member profile sync / loyalty host connectivity",
    resolutionPattern: "restart loyalty sync service and validate member profile host",
    titleVariants: [
      "loyalty synchronization issue",
      "loyalty service unavailable",
      "loyalty balance mismatch",
      "member profile lookup failing",
      "loyalty host not responding",
      "customer loyalty balance missing at checkout",
      "loyalty profile sync blocked after restart",
      "member rewards lookup timeout on lane",
    ],
  },
  POS_SYNC_ISSUE: {
    incidentFamily: "POS synchronization failure",
    rootCauseFamily: "lane replication lag / back-office sync backlog",
    resolutionPattern: "clear sync backlog and restart POS replication agent",
    titleVariants: [
      "POS synchronization failure",
      "checkout totals sync blocked",
      "lane replication lag",
      "POS sync backlog after restart",
      "end-of-day totals mismatch after sync retry",
      "checkout register synchronization issue",
      "POS totals fail to synchronize with back office",
      "lane sales file stuck during sync",
    ],
  },
  STORE_NETWORK_INSTABILITY: {
    incidentFamily: "store network instability",
    rootCauseFamily: "checkout VLAN packet loss / intermittent connectivity",
    resolutionPattern: "validate switch port health and checkout VLAN routing",
    titleVariants: [
      "store connectivity instability",
      "checkout VLAN packet loss",
      "intermittent network on checkout subnet",
      "store LAN instability during peak",
      "lane services flap when network load increases",
      "checkout subnet latency spikes",
      "store network jitter affecting lane availability",
      "intermittent packet loss on checkout VLAN",
    ],
  },
  CHECKOUT_LANE_UNAVAILABLE: {
    incidentFamily: "checkout lane unavailable",
    rootCauseFamily: "register session freeze / lane login failure",
    resolutionPattern: "restart lane session service and validate cashier login path",
    titleVariants: [
      "checkout lane unavailable",
      "POS lane down after login",
      "register session frozen at lane",
      "checkout lane unavailable after login",
      "cashier cannot process baskets on lane",
      "POS session freezes when operator signs in",
      "lane register blocked at login screen",
      "checkout terminal unavailable during shift change",
    ],
  },
  BACKUP_JOB_FAILED: {
    incidentFamily: "store backup failure",
    rootCauseFamily: "backup agent timeout / retention validation failure",
    resolutionPattern: "rerun backup job and validate restore point retention",
    titleVariants: [
      "nightly backup incomplete",
      "store backup failed",
      "backup job failed store systems",
      "backup retention validation failed",
      "store systems backup did not finish",
      "backup copy missing expected restore point",
      "store backup agent reported failure overnight",
      "backup window closed before completion",
    ],
  },
  VPN_TUNNEL_DOWN: {
    incidentFamily: "store VPN tunnel down",
    rootCauseFamily: "remote access endpoint / tunnel negotiation failure",
    resolutionPattern: "restart VPN endpoint service and validate remote access route",
    titleVariants: [
      "store VPN tunnel down",
      "remote access link unavailable",
      "VPN endpoint unreachable from store",
      "store remote access tunnel failed",
      "VPN negotiation timeout at store edge",
      "remote support link unavailable",
      "store VPN session dropped overnight",
      "VPN tunnel not recovering after router reboot",
    ],
  },
  DNS_RESOLUTION_FAILURE: {
    incidentFamily: "store DNS resolution failure",
    rootCauseFamily: "name resolution timeout / DNS server unreachable",
    resolutionPattern: "validate DNS server reachability and flush lane resolver cache",
    titleVariants: [
      "store DNS lookup failing",
      "name resolution errors on lane",
      "DNS resolution timeout at checkout",
      "lane DNS lookup failing intermittently",
      "checkout terminal cannot resolve host names",
      "store name resolution errors after maintenance",
      "DNS server unreachable from checkout subnet",
      "lane services fail due to DNS lookup timeout",
    ],
  },
}

function similarGroupProfile(category: string, incident: IncidentPattern): SimilarGroupProfile {
  const configured = SIMILAR_GROUP_PROFILES[category]
  if (configured) return configured
  const aliases = SEMANTIC_TITLE_ALIASES[category] ?? incident.titles
  const paddedTitles = [...aliases]
  while (paddedTitles.length < 8) {
    paddedTitles.push(`${incident.titles[paddedTitles.length % incident.titles.length]!} reported at store`)
  }
  return {
    incidentFamily: category.replaceAll("_", " ").toLowerCase(),
    rootCauseFamily: `${incident.keywords.slice(0, 2).join(" / ")} operational failure`,
    resolutionPattern: incident.resolution.toLowerCase(),
    titleVariants: paddedTitles.slice(0, 12),
  }
}

const HIGH_TRANSFER_PERIMETERS: PerimeterKey[] = ["PAYMENT", "NETWORK", "HARDWARE", "BACK_OFFICE"]

const RECOMMENDED_ACTIONS: RecommendedAction[] = [
  "RESOLVE_LOCALLY",
  "APPLY_KM",
  "ESCALATE_N3",
  "TRANSFER_PERIMETER",
  "REQUEST_INFORMATION",
  "MONITOR",
]

const ACTION_CLASS_RANGES: Record<RecommendedAction, [number, number]> = {
  RESOLVE_LOCALLY: [20, 25],
  APPLY_KM: [18, 23],
  ESCALATE_N3: [15, 20],
  TRANSFER_PERIMETER: [15, 20],
  REQUEST_INFORMATION: [10, 15],
  MONITOR: [8, 12],
}

/** Midpoint targets for quota-based action assignment (sum ≈ 1.0). */
const ACTION_QUOTA_RATIOS: Record<RecommendedAction, number> = {
  RESOLVE_LOCALLY: 0.225,
  APPLY_KM: 0.205,
  ESCALATE_N3: 0.175,
  TRANSFER_PERIMETER: 0.175,
  REQUEST_INFORMATION: 0.125,
  MONITOR: 0.095,
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

function selectTopByScore<T extends { index: number; [key: string]: unknown }>(
  items: T[],
  scoreKey: keyof T,
  countToSelect: number,
): Set<number> {
  return new Set(
    [...items]
      .sort((a, b) => Number(b[scoreKey]) - Number(a[scoreKey]))
      .slice(0, countToSelect)
      .map((x) => x.index),
  )
}

/** Flip a small share of transfer labels to mimic misroutes and local closures. */
function applyTransferLabelNoise(baseSet: Set<number>, drafts: TicketDraft[], rng: () => number): Set<number> {
  const selected = new Set(baseSet)

  for (const draft of drafts) {
    const positive = selected.has(draft.index)

    // Same-perimeter resolution despite cross-perimeter symptoms.
    if (positive && maybe(rng, 0.038)) selected.delete(draft.index)

    // Incorrect transfer / premature routing.
    if (!positive && maybe(rng, 0.026)) selected.add(draft.index)

    if (draft.ambiguity) {
      if (positive && maybe(rng, 0.028)) selected.delete(draft.index)
      if (!positive && maybe(rng, 0.024)) selected.add(draft.index)
    }

    if (positive && draft.perimeterKey === "HARDWARE" && maybe(rng, 0.032)) selected.delete(draft.index)
    if (positive && draft.perimeterKey === "NETWORK" && maybe(rng, 0.036)) selected.delete(draft.index)
    if (!positive && draft.perimeterKey === "CHECKOUT" && maybe(rng, 0.022)) selected.add(draft.index)
    if (!positive && HIGH_TRANSFER_PERIMETERS.includes(draft.perimeterKey) && maybe(rng, 0.034)) {
      selected.add(draft.index)
    }

    if (positive && HIGH_TRANSFER_PERIMETERS.includes(draft.perimeterKey) && maybe(rng, 0.022)) {
      selected.delete(draft.index)
    }
    if (positive && draft.perimeterKey === "CHECKOUT" && maybe(rng, 0.028)) selected.delete(draft.index)
  }

  return selected
}

function mapStoreSize(storeType: (typeof CARREFOUR_OPERATIONAL_STORES)[number]["storeType"]): string {
  switch (storeType) {
    case "Hypermarché":
      return "hyper"
    case "Carrefour Market":
      return "market"
    case "Carrefour City":
      return "city"
    default:
      return "contact"
  }
}

function deriveQueueLoad(
  rng: () => number,
  store: (typeof CARREFOUR_OPERATIONAL_STORES)[number],
  createdAt: Date,
): number {
  const hour = createdAt.getHours()
  const peakBoost = hour >= 10 && hour <= 20 ? 0.12 + rng() * 0.08 : 0
  const storeBoost =
    store.storeType === "Hypermarché" ? 0.1 : store.storeType === "Carrefour Market" ? 0.06 : 0.03
  const regionBoost = store.region === "Île-de-France" ? 0.05 : 0
  return Math.min(0.98, Math.max(0.08, 0.18 + peakBoost + storeBoost + regionBoost + rng() * 0.28))
}

function computeOperationalComplexity(input: {
  ambiguity: AmbiguityPattern | null
  escalationRequired: boolean
  transferRequired: boolean
  missingDescription: boolean
  incident: IncidentPattern
  rng: () => number
}): number {
  let score = 0.12 + input.rng() * 0.1
  if (input.ambiguity) score += 0.16
  if (input.escalationRequired) score += 0.1
  if (input.transferRequired) score += 0.08
  if (input.missingDescription) score += 0.1
  if (input.incident.keywords.length > 5) score += 0.05
  return Math.round(Math.min(1, score) * 100) / 100
}

function computeUrgencyScore(input: {
  incident: IncidentPattern
  perimeterKey: PerimeterKey
  queueLoad: number
  storeSize: string
  ambiguity: AmbiguityPattern | null
  rng: () => number
}): number {
  const criticalKeywords = ["down", "offline", "timeout", "failure", "unavailable", "gateway", "wan", "vpn"]
  const moderateKeywords = ["slow", "intermittent", "sync", "mismatch", "degraded", "blocked"]
  let score = 0.08 + input.rng() * 0.14
  if (input.incident.keywords.some((k) => criticalKeywords.includes(k))) score += 0.22
  if (input.incident.keywords.some((k) => moderateKeywords.includes(k))) score += 0.1
  if (["NETWORK", "PAYMENT", "STORE_INFRA"].includes(input.perimeterKey)) score += 0.08
  if (input.storeSize === "hyper") score += 0.06
  score += input.queueLoad * 0.18
  if (input.ambiguity) score += input.rng() * 0.12 - 0.04
  return score + input.rng() * 0.16
}

function assignPriorityLabels(drafts: TicketDraft[], rng: () => number): void {
  const sorted = [...drafts].sort((a, b) => b.urgencyScore - a.urgencyScore)
  const n = drafts.length
  const p1n = Math.round(n * PRIORITY_RATIOS.P1)
  const p2n = Math.round(n * PRIORITY_RATIOS.P2)
  const p3n = Math.round(n * PRIORITY_RATIOS.P3)
  const p4n = Math.max(0, n - p1n - p2n - p3n)
  const priorityByIndex = new Map<number, PriorityClass>()

  let cursor = 0
  for (let i = 0; i < p1n; i++) priorityByIndex.set(sorted[cursor++]!.index, "P1")
  for (let i = 0; i < p2n; i++) priorityByIndex.set(sorted[cursor++]!.index, "P2")
  for (let i = 0; i < p3n; i++) priorityByIndex.set(sorted[cursor++]!.index, "P3")
  for (let i = 0; i < p4n; i++) priorityByIndex.set(sorted[cursor++]!.index, "P4")

  applyPriorityLabelNoise(priorityByIndex, drafts, rng)

  for (const draft of drafts) {
    draft.priority = priorityByIndex.get(draft.index) ?? "P3"
  }
}

/** Flip priority labels to mimic understated urgency and late escalation patterns. */
function applyPriorityLabelNoise(
  priorityByIndex: Map<number, PriorityClass>,
  drafts: TicketDraft[],
  rng: () => number,
): void {
  for (const draft of drafts) {
    const current = priorityByIndex.get(draft.index) ?? "P3"
    if (current === "P1" && draft.queueLoad < 0.35 && maybe(rng, 0.07)) priorityByIndex.set(draft.index, "P3")
    if (current === "P1" && draft.ambiguity && maybe(rng, 0.06)) priorityByIndex.set(draft.index, "P2")
    if (current === "P4" && draft.queueLoad > 0.82 && maybe(rng, 0.08)) priorityByIndex.set(draft.index, "P2")
    if (current === "P4" && draft.incident.keywords.includes("down") && maybe(rng, 0.05)) priorityByIndex.set(draft.index, "P1")
    if (current === "P2" && maybe(rng, 0.025)) priorityByIndex.set(draft.index, "P4")
    if (current === "P3" && draft.queueLoad > 0.78 && maybe(rng, 0.06)) priorityByIndex.set(draft.index, "P2")
    if (current === "P2" && draft.ambiguity && maybe(rng, 0.04)) priorityByIndex.set(draft.index, "P1")
    if (current === "P1" && draft.queueLoad > 0.75 && maybe(rng, 0.05)) priorityByIndex.set(draft.index, "P2")
    if (current === "P3" && maybe(rng, 0.018)) priorityByIndex.set(draft.index, "P4")
    if (maybe(rng, 0.012)) {
      const options: PriorityClass[] = ["P1", "P2", "P3"]
      priorityByIndex.set(draft.index, pick(rng, options))
    }
  }
}

function computeSlaScore(input: {
  priority: PriorityClass
  queueLoad: number
  storeSize: string
  ambiguity: AmbiguityPattern | null
  escalationRequired: boolean
  transferRequired: boolean
  rng: () => number
}): number {
  const priorityBoost = SLA_PRIORITY_BOOST[input.priority]
  let score = 0.06 + input.rng() * 0.1
  score += priorityBoost * 0.55
  score += input.queueLoad * 0.32
  score += input.storeSize === "hyper" ? 0.07 : input.storeSize === "market" ? 0.05 : 0.03
  if (input.ambiguity) score += 0.09

  // Operational ambiguity — decouple SLA from routing flags.
  if (input.escalationRequired && maybe(input.rng, 0.24)) score -= 0.11
  if (input.transferRequired && maybe(input.rng, 0.2)) score -= 0.09
  if (input.priority === "P1" && maybe(input.rng, 0.22)) score -= 0.13
  if (input.priority === "P4" && input.queueLoad > 0.72 && maybe(input.rng, 0.18)) score += 0.15
  if (input.priority === "P3" && input.queueLoad > 0.8 && maybe(input.rng, 0.12)) score += 0.1

  return score + input.rng() * 0.12
}

/** Flip SLA labels to mimic fast P1 closures, queue overload breaches, and routing without breach. */
function applySlaLabelNoise(
  baseSet: Set<number>,
  drafts: TicketDraft[],
  escalationByIndex: Map<number, boolean>,
  transferByIndex: Map<number, boolean>,
  rng: () => number,
): Set<number> {
  const selected = new Set(baseSet)

  for (const draft of drafts) {
    const positive = selected.has(draft.index)
    const escalationRequired = escalationByIndex.get(draft.index) ?? false
    const transferRequired = transferByIndex.get(draft.index) ?? false

    if (positive && draft.priority === "P1" && maybe(rng, 0.09)) selected.delete(draft.index)
    if (!positive && draft.priority === "P1" && maybe(rng, 0.05)) selected.add(draft.index)

    if (!positive && (draft.priority === "P4" || draft.priority === "P3") && draft.queueLoad > 0.7 && maybe(rng, 0.08)) {
      selected.add(draft.index)
    }

    if (positive && escalationRequired && maybe(rng, 0.085)) selected.delete(draft.index)
    if (positive && transferRequired && maybe(rng, 0.07)) selected.delete(draft.index)
    if (!positive && escalationRequired && maybe(rng, 0.045)) selected.add(draft.index)

    if (positive && draft.ambiguity && maybe(rng, 0.065)) selected.delete(draft.index)
    if (!positive && draft.ambiguity && maybe(rng, 0.055)) selected.add(draft.index)

    if (positive && draft.queueLoad < 0.35 && maybe(rng, 0.06)) selected.delete(draft.index)
    if (!positive && draft.queueLoad > 0.85 && maybe(rng, 0.065)) selected.add(draft.index)

    if (positive && maybe(rng, 0.04)) selected.delete(draft.index)
    if (!positive && maybe(rng, 0.038)) selected.add(draft.index)
  }

  return selected
}

type ActionDraftInput = {
  priority: PriorityClass
  perimeterKey: PerimeterKey
  incident: IncidentPattern
  ambiguity: AmbiguityPattern | null
  escalationRequired: boolean
  transferRequired: boolean
  slaBreached: boolean
  missingDescription: boolean
}

function scoreRecommendedActions(input: ActionDraftInput, rng: () => number): Record<RecommendedAction, number> {
  const {
    priority,
    perimeterKey,
    incident,
    ambiguity,
    escalationRequired,
    transferRequired,
    slaBreached,
    missingDescription,
  } = input
  const scores: Record<RecommendedAction, number> = {
    RESOLVE_LOCALLY: 0.04 + rng() * 0.06,
    APPLY_KM: 0.04 + rng() * 0.06,
    ESCALATE_N3: 0.03 + rng() * 0.05,
    TRANSFER_PERIMETER: 0.03 + rng() * 0.05,
    REQUEST_INFORMATION: 0.03 + rng() * 0.05,
    MONITOR: 0.02 + rng() * 0.05,
  }

  const priorityBoost = ACTION_PRIORITY_BOOST[priority]
  scores.ESCALATE_N3 += priorityBoost * 0.42
  scores.TRANSFER_PERIMETER += priorityBoost * 0.38

  if (escalationRequired) scores.ESCALATE_N3 += 0.78 + rng() * 0.08
  if (transferRequired) scores.TRANSFER_PERIMETER += 0.74 + rng() * 0.08
  if (!escalationRequired && !transferRequired) scores.RESOLVE_LOCALLY += 0.58 + rng() * 0.08

  if (missingDescription) scores.REQUEST_INFORMATION += 0.62 + rng() * 0.08
  if (slaBreached) {
    scores.ESCALATE_N3 += 0.12 + rng() * 0.06
    scores.REQUEST_INFORMATION += 0.06
  }

  const kmFriendly = incident.keywords.some((k) =>
    ["restart", "sync", "configuration", "session", "cache", "procedure", "replay"].includes(k),
  )
  if (kmFriendly && !transferRequired) scores.APPLY_KM += 0.52 + rng() * 0.08
  if (kmFriendly && escalationRequired) scores.APPLY_KM += 0.14 + rng() * 0.08

  if ((priority === "P4" || priority === "P3") && !escalationRequired && !transferRequired) {
    scores.MONITOR += 0.38 + rng() * 0.06
  }
  if (ambiguity) {
    scores.MONITOR += 0.1 + rng() * 0.05
    scores.REQUEST_INFORMATION += 0.08
    scores.RESOLVE_LOCALLY += 0.04
  }

  // Operational ambiguity — overlapping routing signals.
  if (transferRequired && priority === "P4" && maybe(rng, 0.28)) scores.RESOLVE_LOCALLY += 0.24
  if (escalationRequired && priority === "P4" && maybe(rng, 0.22)) scores.MONITOR += 0.2
  if (!escalationRequired && priority === "P1" && maybe(rng, 0.18)) scores.RESOLVE_LOCALLY += 0.18
  if (transferRequired && maybe(rng, 0.14)) scores.ESCALATE_N3 += 0.16
  if (escalationRequired && maybe(rng, 0.12)) scores.TRANSFER_PERIMETER += 0.14
  if (kmFriendly && escalationRequired && maybe(rng, 0.16)) scores.APPLY_KM += 0.18
  if (missingDescription && maybe(rng, 0.2)) scores.MONITOR += 0.14

  if (HIGH_TRANSFER_PERIMETERS.includes(perimeterKey)) {
    scores.TRANSFER_PERIMETER += 0.08
    scores.APPLY_KM += 0.05
  }

  for (const action of RECOMMENDED_ACTIONS) scores[action] += rng() * 0.04
  return scores
}

function pickActionFromScores(scores: Record<RecommendedAction, number>, rng: () => number): RecommendedAction {
  const entries = RECOMMENDED_ACTIONS.map((action) => [action, scores[action]] as const)
  const max = Math.max(...entries.map(([, value]) => value))
  let roll = rng()
  let total = 0
  const weights = entries.map(([action, value]) => {
    const weight = Math.exp((value - max) / 0.22)
    total += weight
    return [action, weight] as const
  })
  roll *= total
  for (const [action, weight] of weights) {
    roll -= weight
    if (roll <= 0) return action
  }
  return entries[0]![0]
}

function applyActionLabelNoise(
  action: RecommendedAction,
  input: ActionDraftInput,
  rng: () => number,
): RecommendedAction {
  const alternatives = RECOMMENDED_ACTIONS.filter((candidate) => candidate !== action)
  if (maybe(rng, 0.04)) return pick(rng, alternatives)
  if (input.ambiguity && maybe(rng, 0.03)) return pick(rng, alternatives)
  if (input.transferRequired && action === "TRANSFER_PERIMETER" && maybe(rng, 0.04)) {
    return pick(rng, ["ESCALATE_N3", "APPLY_KM", "MONITOR"])
  }
  if (input.escalationRequired && action === "ESCALATE_N3" && maybe(rng, 0.04)) {
    return pick(rng, ["TRANSFER_PERIMETER", "REQUEST_INFORMATION", "APPLY_KM"])
  }
  if (input.missingDescription && action === "REQUEST_INFORMATION" && maybe(rng, 0.03)) {
    return pick(rng, ["MONITOR", "RESOLVE_LOCALLY"])
  }
  if (action === "APPLY_KM" && input.escalationRequired && maybe(rng, 0.03)) {
    return pick(rng, ["ESCALATE_N3", "MONITOR"])
  }
  if (!input.escalationRequired && !input.transferRequired && action === "RESOLVE_LOCALLY" && maybe(rng, 0.03)) {
    return pick(rng, ["APPLY_KM", "MONITOR"])
  }
  if (input.priority === "P1" && action === "ESCALATE_N3" && maybe(rng, 0.03)) {
    return pick(rng, ["TRANSFER_PERIMETER", "RESOLVE_LOCALLY"])
  }
  return action
}

function actionAlignmentBoost(action: RecommendedAction, input: ActionDraftInput): number {
  const kmFriendly = input.incident.keywords.some((k) =>
    ["restart", "sync", "configuration", "session", "cache", "procedure", "replay"].includes(k),
  )
  switch (action) {
    case "ESCALATE_N3":
      return input.escalationRequired ? 1.5 : 0
    case "TRANSFER_PERIMETER":
      return input.transferRequired ? 1.5 : 0
    case "REQUEST_INFORMATION":
      return input.missingDescription ? 1.5 : 0
    case "APPLY_KM":
      return kmFriendly && !input.transferRequired ? 1.2 : 0
    case "MONITOR":
      return (input.priority === "P4" || input.priority === "P3") &&
        !input.escalationRequired &&
        !input.transferRequired
        ? 0.9
        : 0
    case "RESOLVE_LOCALLY":
      return !input.escalationRequired && !input.transferRequired && !input.missingDescription ? 0.8 : 0
    default:
      return 0
  }
}

function assignRecommendedActionsBatch(
  inputs: Array<ActionDraftInput & { index: number }>,
  rng: () => number,
): Map<number, RecommendedAction> {
  const assignments = new Map<number, RecommendedAction>()
  const unassigned = new Set(inputs.map((input) => input.index))
  const scored = inputs.map((input) => ({
    input,
    scores: scoreRecommendedActions(input, rng),
  }))

  const quotaCounts = Object.fromEntries(
    RECOMMENDED_ACTIONS.map((action) => [action, Math.round(ACTION_QUOTA_RATIOS[action] * inputs.length)]),
  ) as Record<RecommendedAction, number>

  let allocated = Object.values(quotaCounts).reduce((sum, count) => sum + count, 0)
  while (allocated < inputs.length) {
    const action = pick(rng, RECOMMENDED_ACTIONS)
    quotaCounts[action]++
    allocated++
  }
  while (allocated > inputs.length) {
    const action = RECOMMENDED_ACTIONS.reduce((best, candidate) =>
      quotaCounts[candidate] > quotaCounts[best] ? candidate : best,
    )
    if (quotaCounts[action] <= 1) break
    quotaCounts[action]--
    allocated--
  }

  for (const action of RECOMMENDED_ACTIONS) {
    const needed = quotaCounts[action]
    const candidates = scored
      .filter((item) => unassigned.has(item.input.index))
      .sort((a, b) => {
        const alignDiff = actionAlignmentBoost(action, b.input) - actionAlignmentBoost(action, a.input)
        if (Math.abs(alignDiff) > 0.01) return alignDiff
        return b.scores[action] - a.scores[action]
      })
      .slice(0, needed)

    for (const candidate of candidates) {
      assignments.set(
        candidate.input.index,
        applyActionLabelNoise(action, candidate.input, rng),
      )
      unassigned.delete(candidate.input.index)
    }
  }

  for (const item of scored.filter((entry) => unassigned.has(entry.input.index))) {
    const fallback = pickActionFromScores(item.scores, rng)
    assignments.set(item.input.index, applyActionLabelNoise(fallback, item.input, rng))
    unassigned.delete(item.input.index)
  }

  return assignments
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
  if (/^p1$|critical/i.test(priority)) return 240
  if (/^p2$|high/i.test(priority)) return 720
  if (/^p3$|medium/i.test(priority)) return 1_440
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
  transferRequired: boolean
  escalationRequired: boolean
  recommendedAction: RecommendedAction
  perimeterKey: PerimeterKey
  primaryArticle: KmArticleSeed | null
  relevantKmIds: string[]
  kmArticles: KmArticleSeed[]
  rng: () => number
  level: NoiseLevel
  groupSymptom?: string | null
}) {
  const {
    title,
    incident,
    storeName,
    city,
    priority,
    ambiguity,
    transferRequired,
    escalationRequired,
    recommendedAction,
    perimeterKey,
    primaryArticle,
    relevantKmIds,
    kmArticles,
    rng,
    level,
    groupSymptom,
  } = input
  const symptom = pick(rng, incident.symptoms)
  const templates = [
    `${symptom} at ${storeName}, ${city}. Priority ${priority}. Store requests support before peak traffic.`,
    `${title}. ${symptom}. Local restart attempted once, issue still present on store side.`,
    `${symptom}; impact reported by store ops. Need check logs, lane/service health and recent changes.`,
    `${title} - ${symptom}. Store says issue is intermittent and affects customer flow.`,
    `${symptom}. Vendor not yet contacted. Please verify perimeter before transfer.`,
    `${symptom}. First-line team unsure if this stays on ${PERIMETER_LABELS[perimeterKey]} or needs routing.`,
    `${title}. Mixed symptoms reported; operator description inconsistent across shift handover.`,
  ]
  let text = pick(rng, templates)
  if (groupSymptom) {
    text = `${text} ${groupSymptom}.`
  }
  if (maybe(rng, 0.42)) {
    text = `${text} Category ${incident.category.replaceAll("_", " ").toLowerCase()}. Operational keywords: ${incident.keywords.slice(0, 3).join(", ")}.`
  }
  if (maybe(rng, 0.24)) {
    text = `${text} Store referenced ${incident.category.replaceAll("_", " ").toLowerCase()} recovery guidance.`
  }
  if (ambiguity && maybe(rng, 0.68)) text = `${text} ${ambiguity.note}`
  if (maybe(rng, 0.14)) text = `${text} ${pick(rng, incident.symptoms)}. ${pick(rng, incident.symptoms)}.`

  if (!transferRequired) {
    if (ambiguity && maybe(rng, 0.16)) {
      text = `${text} ${pick(rng, TRANSFER_LANGUAGE_NO_TRANSFER)}`
    }
    if (HIGH_TRANSFER_PERIMETERS.includes(perimeterKey) && maybe(rng, 0.11)) {
      text = `${text} ${pick(rng, TRANSFER_LANGUAGE_NO_TRANSFER)}`
    }
    if (maybe(rng, 0.1)) {
      text = `${text} ${pick(rng, LOCAL_RESOLUTION_SNIPPETS)}`
    }
    if (maybe(rng, 0.08)) {
      text = `${text} ${pick(rng, BORDERLINE_ROUTING_SNIPPETS)}`
    }
  } else {
    if (maybe(rng, 0.3)) {
      text = `${text} ${pick(rng, TRANSFER_CONFIRMED_SNIPPETS)}`
    }
    if (maybe(rng, 0.09)) {
      text = `${text} ${pick(rng, LOCAL_RESOLUTION_SNIPPETS)}`
    }
    if (maybe(rng, 0.07)) {
      text = `${text} ${pick(rng, TRANSFER_LANGUAGE_NO_TRANSFER)}`
    }
    if (maybe(rng, 0.06)) {
      text = `${text} ${pick(rng, BORDERLINE_ROUTING_SNIPPETS)}`
    }
  }

  if (recommendedAction === "APPLY_KM" && maybe(rng, 0.42)) {
    text = `${text} KM procedure likely applies; check documented restart or sync steps.`
  }
  if (primaryArticle && recommendedAction === "APPLY_KM" && maybe(rng, 0.38)) {
    text = `${text} Store referenced ${primaryArticle.title}; recovery steps needed on ${PERIMETER_LABELS[perimeterKey]}.`
  }
  if (recommendedAction === "MONITOR" && maybe(rng, 0.38)) {
    text = `${text} Intermittent pattern — monitor before escalation unless impact worsens.`
  }
  if (recommendedAction === "REQUEST_INFORMATION" && maybe(rng, 0.35)) {
    text = `${text} Need device id, lane number, and exact error timestamp from store.`
  }
  if (recommendedAction === "ESCALATE_N3" && maybe(rng, 0.36)) {
    text = `${text} N3 escalation criteria met; attach logs and attempted actions.`
  }
  if (escalationRequired && recommendedAction !== "ESCALATE_N3" && maybe(rng, 0.12)) {
    text = `${text} Supervisor mentioned possible N3 but routing not confirmed.`
  }

  const scenarioSnippets = KM_SCENARIO_SNIPPETS[incident.category]
  if (scenarioSnippets && maybe(rng, 0.52)) {
    text = `${text} ${pick(rng, scenarioSnippets)}`
  }

  if (relevantKmIds.length > 1) {
    const relatedArticles = kmArticles.filter((article) => relevantKmIds.includes(article.kmId))
    const relatedPerimeters = [...new Set(relatedArticles.map((article) => article.perimeter))]
    if (relatedPerimeters.length > 1 && maybe(rng, 0.58)) {
      text = `${text} Triage note: symptoms overlap ${relatedPerimeters.join(" and ")} procedures (e.g. ${relatedArticles.map((article) => article.title).slice(0, 2).join("; ")}).`
    } else if (relatedArticles.length > 1 && maybe(rng, 0.45)) {
      text = `${text} Multiple KM paths possible: ${relatedArticles.map((article) => article.title).slice(0, 2).join(" or ")}.`
    }
  }

  if (maybe(rng, 0.22)) {
    const symptom = pick(rng, incident.symptoms)
    text = `${text} Field report (paraphrased): ${symptom} reported during store operations; exact component codes not provided by the operator.`
  }

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
  const slaMsg = rangeCheck("sla_breached=yes", sla, 28, 35)
  if (escMsg) warnings.push(escMsg)
  if (transferMsg) warnings.push(transferMsg)
  if (slaMsg) warnings.push(slaMsg)

  const actionDist = distribution(tickets.map((t) => t.recommendedAction))
  for (const [action, [min, max]] of Object.entries(ACTION_CLASS_RANGES) as [RecommendedAction, [number, number]][]) {
    const pct = actionDist[action]?.pct ?? 0
    const msg = rangeCheck(`recommended_action=${action}`, pct, min, max, false)
    if (msg) warnings.push(msg.replace("FAIL:", "WARN:"))
  }

  const priorityDist = distribution(priorities)
  const priorityTargets = {
    P1: [12, 18],
    P2: [24, 32],
    P3: [35, 45],
    P4: [10, 18],
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
    actionDistribution: actionDist,
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

function buildKmCategoryIndex(articles: KmArticleSeed[]): Map<string, KmArticleSeed[]> {
  const index = new Map<string, KmArticleSeed[]>()
  for (const article of articles) {
    const key = `${article.perimeter}::${article.incidentCategory}`
    const bucket = index.get(key) ?? []
    bucket.push(article)
    index.set(key, bucket)
  }
  return index
}

function sharesOperationalKeywords(a: KmArticleSeed, b: KmArticleSeed): boolean {
  const wordsA = new Set(a.keywords.toLowerCase().split(/[\s,;]+/).filter(Boolean))
  const wordsB = new Set(b.keywords.toLowerCase().split(/[\s,;]+/).filter(Boolean))
  let overlap = 0
  for (const word of wordsA) {
    if (wordsB.has(word)) overlap++
    if (overlap >= 2) return true
  }
  return false
}

function scoreKmCandidate(article: KmArticleSeed, incident: IncidentPattern): number {
  const incidentWords = new Set(incident.keywords.map((keyword) => keyword.toLowerCase()))
  let score = 0
  for (const token of article.keywords.toLowerCase().split(/[\s,]+/)) {
    if (incidentWords.has(token)) score += 1
  }
  if (article.incidentCategory === incident.category) score += 4
  if (article.title.includes("recovery")) score += 2
  return score
}

type SimilarCaseMeta = {
  similarCaseGroupId: string
  incidentCluster: string
  semanticGroup: string
  memberIndex: number
  groupPerimeterLabel: string
  incidentFamily: string
  rootCauseFamily: string
  resolutionPattern: string
  titleVariants: string[]
  groupContext: string
}

function buildGroupProfile(
  category: string,
  incident: IncidentPattern,
  rng: () => number,
): Omit<SimilarCaseMeta, "similarCaseGroupId" | "incidentCluster" | "semanticGroup" | "memberIndex" | "groupPerimeterLabel"> {
  const base = similarGroupProfile(category, incident)
  const titleVariants = [...base.titleVariants]
  shuffleInPlace(titleVariants, rng)
  const familyVariants = [
    base.incidentFamily,
    `${base.incidentFamily} during peak traffic`,
    `${base.incidentFamily} after lane restart`,
    `${category.replaceAll("_", " ").toLowerCase()} affecting store checkout`,
    `${base.incidentFamily} reported by store operations`,
  ]
  const rootVariants = [
    base.rootCauseFamily,
    `${base.rootCauseFamily} under checkout load`,
    `${base.rootCauseFamily} after recent maintenance`,
  ]
  const symptom = pick(rng, incident.symptoms)
  const groupContext = `${symptom}; ${pick(rng, ["multiple lanes", "self-checkout lanes", "checkout terminals", "store endpoints"])} affected`
  return {
    incidentFamily: pick(rng, familyVariants),
    rootCauseFamily: pick(rng, rootVariants),
    resolutionPattern: base.resolutionPattern,
    titleVariants,
    groupContext,
  }
}

function shuffleInPlace<T>(items: T[], rng: () => number): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[items[i], items[j]] = [items[j]!, items[i]!]
  }
}

function assignSimilarCaseGroups(
  drafts: TicketDraft[],
  rng: () => number,
): Map<number, SimilarCaseMeta> {
  const grouped = new Map<string, TicketDraft[]>()
  for (const draft of drafts) {
    const baseCategory = draft.incident.category
    const key = `${draft.perimeterKey}::${baseCategory}`
    const bucket = grouped.get(key) ?? []
    bucket.push(draft)
    grouped.set(key, bucket)
  }

  const meta = new Map<number, SimilarCaseMeta>()
  for (const [key, items] of grouped) {
    const [perimeterKey, category] = key.split("::") as [PerimeterKey, string]
    shuffleInPlace(items, rng)
    const bucketSize = 8 + Math.floor(rng() * 23)
    const rawChunks: TicketDraft[][] = []
    for (let offset = 0; offset < items.length; offset += bucketSize) {
      rawChunks.push(items.slice(offset, offset + bucketSize))
    }
    if (rawChunks.length > 1 && rawChunks[rawChunks.length - 1]!.length < 8) {
      const tail = rawChunks.pop()!
      rawChunks[rawChunks.length - 1]!.push(...tail)
    }

    let bucketIndex = 0
    for (const slice of rawChunks) {
      if (slice.length < 8) continue
      const groupId = `${category}_GROUP_${String(bucketIndex++).padStart(4, "0")}`
      const incidentCluster = `IC-${PERIMETER_LABELS[perimeterKey]}-${category}`
      const semanticGroup = `${SEMANTIC_FAMILY[category] ?? `SEM-${perimeterKey}-${category}`}-${String(bucketIndex - 1).padStart(4, "0")}`
      const groupPerimeterLabel = PERIMETER_LABELS[perimeterKey]
      const groupProfile = buildGroupProfile(category, slice[0]!.incident, rng)
      for (const [memberIndex, draft] of slice.entries()) {
        meta.set(draft.index, {
          similarCaseGroupId: groupId,
          incidentCluster,
          semanticGroup,
          memberIndex,
          groupPerimeterLabel,
          incidentFamily: groupProfile.incidentFamily,
          rootCauseFamily: groupProfile.rootCauseFamily,
          resolutionPattern: groupProfile.resolutionPattern,
          titleVariants: groupProfile.titleVariants,
          groupContext: groupProfile.groupContext,
        })
      }
    }
  }

  const unassigned = drafts.filter((draft) => !meta.has(draft.index))
  shuffleInPlace(unassigned, rng)
  for (const draft of unassigned) {
    const category = draft.incident.category
    const hostEntry = [...meta.entries()].find(([, value]) =>
      value.similarCaseGroupId.startsWith(`${category}_GROUP`),
    )
    if (!hostEntry) continue
    const [, hostMeta] = hostEntry
    meta.set(draft.index, {
      ...hostMeta,
      memberIndex: hostMeta.memberIndex + 1,
    })
  }

  return meta
}

function assignRetrievalSplitsByGroup(
  drafts: TicketDraft[],
  similarCaseMeta: Map<number, SimilarCaseMeta>,
  rng: () => number,
): void {
  const draftByIndex = new Map(drafts.map((draft) => [draft.index, draft]))
  const byGroup = new Map<string, number[]>()
  for (const [index, caseMeta] of similarCaseMeta) {
    const bucket = byGroup.get(caseMeta.similarCaseGroupId) ?? []
    bucket.push(index)
    byGroup.set(caseMeta.similarCaseGroupId, bucket)
  }

  for (const members of byGroup.values()) {
    const shuffled = [...members]
    shuffleInPlace(shuffled, rng)
    const testCount = Math.max(1, Math.min(2, Math.round(shuffled.length * 0.2)))
    const testMembers = shuffled.slice(0, testCount)
    const corpusMembers = shuffled.slice(testCount)
    if (corpusMembers.length < 3) continue

    for (const index of testMembers) {
      draftByIndex.get(index)!.split = "test"
    }
    for (let position = 0; position < corpusMembers.length; position++) {
      const ratio = position / Math.max(corpusMembers.length - 1, 1)
      draftByIndex.get(corpusMembers[position]!)!.split = ratio < 0.85 ? "train" : "validation"
    }
  }
}

function assignKmGroundTruth(input: {
  draft: TicketDraft
  incident: IncidentPattern
  ambiguity: AmbiguityPattern | null
  recommendedAction: RecommendedAction
  kmArticles: KmArticleSeed[]
  kmByCategory: Map<string, KmArticleSeed[]>
  rng: () => number
}): { expectedKmId: string | null; relevantKmIds: string[]; primaryArticle: KmArticleSeed | null } {
  const perimeterLabel = PERIMETER_LABELS[input.draft.perimeterKey]
  const categoryKey = input.ambiguity?.rootCauseCategory
    ? `${input.incident.category}__ROOT_${input.ambiguity.rootCauseCategory}`
    : input.incident.category
  const lookupKey = `${perimeterLabel}::${categoryKey}`
  const baseKey = `${perimeterLabel}::${input.incident.category}`
  const primaryCandidates = input.kmByCategory.get(lookupKey) ?? input.kmByCategory.get(baseKey) ?? []

  const overlappingArticles = input.kmArticles.filter(
    (article) =>
      article.incidentCategory === input.incident.category ||
      sharesOperationalKeywords(article, {
        kmId: "",
        title: input.incident.category,
        procedureSteps: "",
        perimeter: perimeterLabel,
        incidentCategory: input.incident.category,
        keywords: input.incident.keywords.join(", "),
        difficultyLevel: "medium",
        applicabilityScore: 0.5,
      }),
  )

  if (primaryCandidates.length === 0 && overlappingArticles.length === 0) {
    return { expectedKmId: null, relevantKmIds: [], primaryArticle: null }
  }

  const relevant = new Set<string>()
  const recoveryCandidates = primaryCandidates.filter((article) => article.title.includes("recovery"))
  const rankedCandidates = [...(recoveryCandidates.length ? recoveryCandidates : primaryCandidates)].sort(
    (a, b) => scoreKmCandidate(b, input.incident) - scoreKmCandidate(a, input.incident),
  )
  const primary = rankedCandidates[0] ?? overlappingArticles[0] ?? null

  if (primary) relevant.add(primary.kmId)

  const alternatePool = overlappingArticles.filter((article) => article.kmId !== primary?.kmId)
  if (alternatePool.length > 0) {
    relevant.add(pick(input.rng, alternatePool).kmId)
  }
  if (alternatePool.length > 1 && maybe(input.rng, 0.28)) {
    const second = pick(input.rng, alternatePool)
    if (second.kmId !== primary?.kmId) relevant.add(second.kmId)
  }

  if (input.recommendedAction !== "APPLY_KM" && maybe(input.rng, 0.06) && alternatePool.length >= 2) {
    const picks = [pick(input.rng, alternatePool), pick(input.rng, alternatePool)]
    return {
      expectedKmId: null,
      relevantKmIds: [...new Set(picks.map((article) => article.kmId))].slice(0, 3),
      primaryArticle: primary,
    }
  }

  if (!primary) {
    return { expectedKmId: null, relevantKmIds: [...relevant].slice(0, 3), primaryArticle: null }
  }

  return {
    expectedKmId: primary.kmId,
    relevantKmIds: [...relevant].slice(0, 3),
    primaryArticle: primary,
  }
}

function buildOverlappingKmArticles(rng: () => number): KmArticleSeed[] {
  let counter = 10_000
  const nextKmId = () => `KM-${String(counter++).padStart(4, "0")}`
  const overlaps: Array<Omit<KmArticleSeed, "kmId">> = [
    {
      title: "payment gateway timeout triage",
      procedureSteps:
        "Validate payment host reachability.\nReview gateway latency and recent declines.\nRestart payment service if queue is blocked.\nConfirm card authorization with test transaction.",
      perimeter: PERIMETER_LABELS.PAYMENT,
      incidentCategory: "PAYMENT_GATEWAY_TIMEOUT",
      keywords: "payment, timeout, gateway, authorization, latency, card",
      difficultyLevel: "medium",
      applicabilityScore: 0.78,
    },
    {
      title: "network latency affecting payment authorization",
      procedureSteps:
        "Check WAN link utilization and packet loss.\nValidate DNS and firewall rules for payment subnet.\nCompare store router metrics with baseline.\nEscalate to network if latency persists beyond SLA.",
      perimeter: PERIMETER_LABELS.NETWORK,
      incidentCategory: "PAYMENT_GATEWAY_TIMEOUT",
      keywords: "network, latency, payment, timeout, wan, dns, authorization",
      difficultyLevel: "medium",
      applicabilityScore: 0.74,
    },
    {
      title: "SCO lane reboot and recovery",
      procedureSteps:
        "Confirm SCO lane ID and last transaction state.\nRestart SCO application and peripheral stack.\nValidate scanner and bagging area.\nRun controlled test basket before reopening lane.",
      perimeter: PERIMETER_LABELS.SCO,
      incidentCategory: "SCO_TERMINAL_OFFLINE",
      keywords: "sco, offline, reboot, lane, self checkout",
      difficultyLevel: "low",
      applicabilityScore: 0.81,
    },
    {
      title: "store network check for SCO connectivity",
      procedureSteps:
        "Ping SCO subnet gateway and POS controller.\nReview switch port errors on SCO VLAN.\nValidate DHCP lease and DNS resolution.\nCoordinate with store infra if packet loss remains.",
      perimeter: PERIMETER_LABELS.NETWORK,
      incidentCategory: "SCO_TERMINAL_OFFLINE",
      keywords: "sco, network, offline, vlan, connectivity, switch",
      difficultyLevel: "medium",
      applicabilityScore: 0.72,
    },
    {
      title: "receipt printer reset procedure",
      procedureSteps:
        "Power-cycle printer and clear paper jam.\nReinstall driver profile on POS host.\nPrint diagnostic page and test receipt.\nConfirm with cashier before peak hours.",
      perimeter: PERIMETER_LABELS.HARDWARE,
      incidentCategory: "RECEIPT_PRINTER_OFFLINE",
      keywords: "printer, receipt, reset, jam, hardware",
      difficultyLevel: "low",
      applicabilityScore: 0.77,
    },
    {
      title: "peripheral hardware replacement checklist",
      procedureSteps:
        "Identify failing peripheral serial and warranty status.\nSwap spare device from store stock if available.\nRegister replacement in asset inventory.\nSchedule vendor RMA when spare is unavailable.",
      perimeter: PERIMETER_LABELS.HARDWARE,
      incidentCategory: "RECEIPT_PRINTER_OFFLINE",
      keywords: "printer, hardware, replacement, peripheral, rma",
      difficultyLevel: "high",
      applicabilityScore: 0.69,
    },
    {
      title: "checkout lane freeze recovery",
      procedureSteps:
        "Capture lane state and last basket ID.\nRestart POS client without clearing open transaction.\nValidate peripheral heartbeat.\nConfirm recovery with store manager.",
      perimeter: PERIMETER_LABELS.CHECKOUT,
      incidentCategory: "CHECKOUT_LANE_UNAVAILABLE",
      keywords: "checkout, lane, freeze, pos, recovery",
      difficultyLevel: "medium",
      applicabilityScore: 0.76,
    },
    {
      title: "loyalty service recovery guide",
      procedureSteps:
        "Verify loyalty host availability.\nRetry lookup with alternate identifier.\nCheck recent promotion sync status.\nApply manual loyalty adjustment if policy allows.",
      perimeter: PERIMETER_LABELS.LOYALTY,
      incidentCategory: "LOYALTY_SERVICE_UNAVAILABLE",
      keywords: "loyalty, service, unavailable, member, profile, recovery",
      difficultyLevel: "low",
      applicabilityScore: 0.73,
    },
    {
      title: "POS synchronization recovery procedure",
      procedureSteps:
        "Inspect POS sync queue and failed batches.\nReplay pending sales files from lane controller.\nValidate closing totals against back-office.\nConfirm end-of-day close with store supervisor.",
      perimeter: PERIMETER_LABELS.CHECKOUT,
      incidentCategory: "POS_SYNC_ISSUE",
      keywords: "pos, sync, synchronization, closing, back-office, totals",
      difficultyLevel: "medium",
      applicabilityScore: 0.79,
    },
    {
      title: "store network connectivity diagnostic",
      procedureSteps:
        "Ping checkout VLAN gateway and core switch.\nReview packet loss and latency on store WAN.\nValidate DNS and DHCP for affected subnet.\nDocument findings before perimeter transfer.",
      perimeter: PERIMETER_LABELS.NETWORK,
      incidentCategory: "STORE_NETWORK_INSTABILITY",
      keywords: "network, connectivity, vlan, wan, latency, diagnostic",
      difficultyLevel: "medium",
      applicabilityScore: 0.75,
    },
  ]

  return overlaps.map((article) => ({ ...article, kmId: nextKmId() }))
}

function buildKmArticles(rng: () => number): KmArticleSeed[] {
  const out: KmArticleSeed[] = []
  let counter = 1
  const nextKmId = () => `KM-${String(counter++).padStart(4, "0")}`
  const procedureVariants = [
    {
      suffix: "recovery procedure",
      focus: "service restoration",
      finalStep: "Validate service with store operations and update ticket timeline.",
      categorySuffix: "",
      includeInPrimaryIndex: true,
    },
    {
      suffix: "diagnostic checklist",
      focus: "root cause qualification",
      finalStep: "Record diagnostic evidence before escalation or transfer.",
      categorySuffix: "_DIAGNOSTIC",
      includeInPrimaryIndex: false,
    },
    {
      suffix: "store validation guide",
      focus: "store-side confirmation",
      finalStep: "Confirm business recovery with the store supervisor.",
      categorySuffix: "_VALIDATION",
      includeInPrimaryIndex: false,
    },
    {
      suffix: "escalation readiness guide",
      focus: "handover preparation",
      finalStep: "Attach logs, impact summary, and attempted actions before routing.",
      categorySuffix: "_ESCALATION",
      includeInPrimaryIndex: false,
    },
  ]

  for (const [perimeterKey, incidents] of Object.entries(INCIDENTS) as [PerimeterKey, IncidentPattern[]][]) {
    for (const incident of incidents) {
      for (const variant of procedureVariants) {
        out.push({
          kmId: nextKmId(),
          title: `${incident.category.replaceAll("_", " ").toLowerCase()} ${variant.suffix}`,
          procedureSteps: [
            `Category: ${incident.category.replaceAll("_", " ").toLowerCase()}.`,
            "Confirm store, impacted device, and business impact.",
            `Focus area: ${variant.focus}.`,
            `Check symptoms: ${incident.symptoms.join("; ")}.`,
            "Review recent changes, logs, and monitoring alerts.",
            incident.resolution,
            variant.finalStep,
          ].join("\n"),
          perimeter: PERIMETER_LABELS[perimeterKey],
          incidentCategory: `${incident.category}${variant.categorySuffix}`,
          keywords: [...incident.keywords, incident.category, variant.focus].join(", "),
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
      recommendedAction: t.recommendedAction,
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

  const drafts: TicketDraft[] = []
  const baseDate = new Date(generatedAt)
  baseDate.setDate(baseDate.getDate() - 240)

  for (let i = 0; i < size; i++) {
    const perimeterKey = perimeters[i] as PerimeterKey
    const incident = pick(rng, INCIDENTS[perimeterKey])
    const ambiguity = maybe(rng, 0.26) ? pick(rng, AMBIGUITY[perimeterKey] ?? [null]) : null
    const store = CARREFOUR_OPERATIONAL_STORES[i % CARREFOUR_OPERATIONAL_STORES.length]!
    const createdAt = addMinutes(baseDate, i * 79 + Math.floor(rng() * 240))
    const queueLoad = deriveQueueLoad(rng, store, createdAt)
    const storeSize = mapStoreSize(store.storeType)
    const urgencyScore = computeUrgencyScore({
      incident,
      perimeterKey,
      queueLoad,
      storeSize,
      ambiguity,
      rng,
    })

    drafts.push({
      index: i,
      ticketId: `ML-CARE-${String(i + 1).padStart(6, "0")}`,
      perimeterKey,
      priority: "P3",
      urgencyScore,
      split: splitForIndex(i, size),
      store,
      incident,
      createdAt,
      ambiguity,
      escalationScore: 0,
      transferScore: 0,
      slaScore: 0,
      queueLoad,
      storeSize,
    })
  }

  assignPriorityLabels(drafts, rng)

  for (const draft of drafts) {
    const { priority, perimeterKey, ambiguity, incident } = draft
    const priorityWeight = PRIORITY_WEIGHT[priority]
    const escalationPerimeterWeight = ["NETWORK", "HARDWARE", "STORE_INFRA"].includes(perimeterKey)
      ? 0.24
      : ["PAYMENT", "BACK_OFFICE"].includes(perimeterKey)
        ? 0.13
        : 0.04
    const transferPriorityWeight = TRANSFER_PRIORITY_WEIGHT[priority]
    const transferPerimeterWeight = ["PAYMENT", "NETWORK", "HARDWARE", "BACK_OFFICE"].includes(perimeterKey)
      ? 0.26
      : ["LOYALTY", "SCO"].includes(perimeterKey)
        ? 0.12
        : 0.06
    const incidentTransferHint = incident.keywords.some((k) =>
      ["network", "payment", "hardware", "vpn", "gateway", "wan", "pinpad", "printer", "sync"].includes(k),
    )
      ? 0.06
      : 0
    const ambiguityWeight = ambiguity ? 0.2 : 0
    draft.escalationScore = priorityWeight * 0.55 + escalationPerimeterWeight + ambiguityWeight + rng() * 0.62
    draft.transferScore =
      transferPriorityWeight * 0.55 + transferPerimeterWeight + incidentTransferHint + ambiguityWeight + rng() * 0.48
  }

  const escalatedSet = selectTopByScore(drafts, "escalationScore", Math.round(size * 0.4))
  const transferSet = applyTransferLabelNoise(
    selectTopByScore(drafts, "transferScore", Math.round(size * 0.35)),
    drafts,
    rng,
  )
  const escalationByIndex = new Map(drafts.map((d) => [d.index, escalatedSet.has(d.index)]))
  const transferByIndex = new Map(drafts.map((d) => [d.index, transferSet.has(d.index)]))

  for (const draft of drafts) {
    draft.slaScore = computeSlaScore({
      priority: draft.priority,
      queueLoad: draft.queueLoad,
      storeSize: draft.storeSize,
      ambiguity: draft.ambiguity,
      escalationRequired: escalationByIndex.get(draft.index) ?? false,
      transferRequired: transferByIndex.get(draft.index) ?? false,
      rng,
    })
  }

  const slaSet = applySlaLabelNoise(
    selectTopByScore(drafts, "slaScore", Math.round(size * 0.315)),
    drafts,
    escalationByIndex,
    transferByIndex,
    rng,
  )

  const actionInputs: Array<ActionDraftInput & { index: number }> = drafts.map((draft) => {
    const escalationRequired = escalatedSet.has(draft.index)
    const transferRequired = transferSet.has(draft.index)
    const slaBreached = slaSet.has(draft.index)
    const missingDescription = maybe(rng, NOISE_CONFIG[noiseLevel].missingDescription)
    return {
      index: draft.index,
      priority: draft.priority,
      perimeterKey: draft.perimeterKey,
      incident: draft.incident,
      ambiguity: draft.ambiguity,
      escalationRequired,
      transferRequired,
      slaBreached,
      missingDescription,
    }
  })
  const recommendedActionByIndex = assignRecommendedActionsBatch(actionInputs, rng)

  const kmArticles = [...buildKmArticles(rng), ...buildOverlappingKmArticles(rng)]
  const kmByCategory = buildKmCategoryIndex(kmArticles)
  const similarCaseMeta = assignSimilarCaseGroups(drafts, rng)
  assignRetrievalSplitsByGroup(drafts, similarCaseMeta, rng)

  const tickets: HistoricalTicketSeed[] = []
  const actions: HistoricalActionSeed[] = []
  const resolutions: HistoricalResolutionSeed[] = []

  for (const draft of drafts) {
    const { index, ticketId, priority, perimeterKey, incident, store, ambiguity, createdAt } = draft
    const escalationRequired = escalatedSet.has(index)
    const transferRequired = transferSet.has(index)
    const slaBreached = slaSet.has(index)
    const missingDescription = actionInputs[index]!.missingDescription
    const operationalComplexity = computeOperationalComplexity({
      ambiguity,
      escalationRequired,
      transferRequired,
      missingDescription,
      incident,
      rng,
    })
    const resolved = maybe(rng, priority === "P1" ? 0.64 : 0.76)
    const resolutionBase = priority === "P1" ? 420 : priority === "P2" ? 680 : priority === "P3" ? 1_120 : 1_650
    const transferResolutionBump = transferRequired ? 90 + Math.floor(rng() * 150) : 0
    const slaBudget = prioritySlaMinutes(priority)
    let resolutionTimeMinutes = resolved
      ? Math.max(
          25,
          Math.round(
            resolutionBase * (0.55 + rng() * 1.25) +
              transferResolutionBump +
              (slaBreached ? slaBudget * (0.1 + rng() * 0.16) : 0),
          ),
        )
      : null
    if (resolved && resolutionTimeMinutes != null) {
      if (slaBreached && maybe(rng, 0.28)) {
        resolutionTimeMinutes = Math.max(30, Math.round(slaBudget * (0.42 + rng() * 0.38)))
      }
      if (!slaBreached && maybe(rng, 0.26)) {
        resolutionTimeMinutes = Math.max(25, Math.round(slaBudget * (0.92 + rng() * 0.48)))
      }
      if (maybe(rng, 0.32)) {
        resolutionTimeMinutes = Math.max(20, Math.round(resolutionTimeMinutes * (0.68 + rng() * 0.62)))
      }
      if (maybe(rng, 0.2)) {
        resolutionTimeMinutes = null
      }
    }
    const ticketAgeMinutes = resolved && resolutionTimeMinutes != null
      ? Math.max(
          30,
          Math.round(
            resolutionTimeMinutes *
              (slaBreached ? 0.68 + rng() * 0.22 : 0.32 + rng() * 0.28),
          ),
        )
      : Math.max(45, Math.round(slaBudget * (0.35 + rng() * 0.45)))
    const resolvedAt = resolved && resolutionTimeMinutes != null ? addMinutes(createdAt, resolutionTimeMinutes) : null
    const finalResolutionStatus = resolved
      ? pick(rng, ["resolved", "closed", "resolved", "validated"])
      : pick(rng, ["open", "in_progress", "monitoring"])
    const status = resolved
      ? pick(rng, ["Resolved", "Closed", "RESOLVED"])
      : pick(rng, ["Open", "In Progress", "Monitoring", "OPEN", "in progress"])

    const caseMeta = similarCaseMeta.get(index)
    if (!caseMeta) {
      throw new Error(`Missing similar case metadata for ticket index ${index}`)
    }
    const titleSource = caseMeta.titleVariants[caseMeta.memberIndex % caseMeta.titleVariants.length]!
    const title = applyTextNoise(titleSource, rng, noiseLevel)
    const symptomVariants = SEMANTIC_SYMPTOM_VARIANTS[incident.category]
    const groupSymptom = symptomVariants
      ? applyTextNoise(symptomVariants[caseMeta.memberIndex % symptomVariants.length]!, rng, noiseLevel)
      : applyTextNoise(pick(rng, incident.symptoms), rng, noiseLevel)
    const recommendedAction = recommendedActionByIndex.get(index)!
    const kmGroundTruth = assignKmGroundTruth({
      draft,
      incident,
      ambiguity,
      recommendedAction,
      kmArticles,
      kmByCategory,
      rng,
    })
    const description = missingDescription
      ? applyTextNoise(groupSymptom, rng, noiseLevel)
      : buildDescription({
          title,
          incident,
          storeName: store.storeName,
          city: store.city,
          priority,
          ambiguity,
          transferRequired,
          escalationRequired,
          recommendedAction,
          perimeterKey,
          primaryArticle: kmGroundTruth.primaryArticle,
          relevantKmIds: kmGroundTruth.relevantKmIds,
          kmArticles,
          rng,
          level: noiseLevel,
          groupSymptom,
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
      ? applyTextNoise(
          pick(rng, [
            incident.resolution,
            caseMeta.resolutionPattern,
            `${incident.resolution} ${pick(rng, LOCAL_RESOLUTION_SNIPPETS)}`,
          ]),
          rng,
          noiseLevel,
        )
      : null

    const ticket: HistoricalTicketSeed = {
      ticketId,
      title,
      description,
      perimeter: maybe(rng, 0.12)
        ? pick(rng, PERIMETER_VARIANTS[perimeterKey])
        : caseMeta.groupPerimeterLabel,
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
      ticketAgeMinutes,
      queueLoad: draft.queueLoad,
      storeSize: draft.storeSize,
      operationalComplexity,
      escalationRequired,
      transferRequired,
      recommendedAction,
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
      expectedKmId: kmGroundTruth.expectedKmId,
      relevantKmIds: kmGroundTruth.relevantKmIds,
      similarCaseGroupId: caseMeta.similarCaseGroupId,
      incidentCluster: caseMeta.incidentCluster,
      semanticGroup: caseMeta.semanticGroup,
      incidentFamily: caseMeta.incidentFamily,
      rootCauseFamily: caseMeta.rootCauseFamily,
      resolutionPattern: caseMeta.resolutionPattern,
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
      recommendedAction: summary.actionDistribution,
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
