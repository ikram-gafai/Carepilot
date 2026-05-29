import type { OperationalQualityLevel } from "@/lib/ai/missing-information"
import type { OperationalTicketCategory } from "@/lib/care-operational/ticket-catalog"
import { perimeterCodeForCategory } from "@/lib/care-operational/ticket-catalog"

/** Deterministic PFE demo scenarios — Carrefour FO/VLP operational context. */

export type DemoScenarioComment = {
  authorName: string
  authorRole: string
  body: string
  hoursAgo: number
}

export type DemoScenarioHistoryEvent = {
  eventType: string
  summary: string
  detail?: string
  actorLabel: string
  hoursAgo: number
}

export type DemoScenarioKmSeed = {
  kmId: string
  title: string
  similarity: number
  rank: number
  confidenceLevel: "HIGH" | "MEDIUM" | "LOW"
  reason: string
}

export type DemoScenarioAiSeed = {
  escalation: {
    required: boolean
    confidence: number
    probability: number
    label: string
  }
  transfer: {
    required: boolean
    confidence: number
    probability: number
    label: string
  }
  action: {
    recommended: string
    confidence: number
    reason: string
    distribution: Record<string, number>
  }
  sla: {
    breach: boolean
    confidence: number
    probability: number
    riskLevel: "HIGH" | "MEDIUM" | "LOW"
  }
  priority: {
    predicted: string
    confidence: number
    distribution: Record<string, number>
  }
  missing: {
    fields: string[]
    completeness: number
    quality: OperationalQualityLevel
    confidence: number
  }
  km: DemoScenarioKmSeed[]
  explanation: {
    operationalSummary: string
    recommendedActionExplanation: string
    reasoning: string
    missingInformationNote: string
    nextSteps: string
  }
}

export type DemoScenarioDefinition = {
  /** CARE-DEMO-00001 … */
  careId: string
  slug: string
  title: string
  objective: string
  storeCode: string
  category: OperationalTicketCategory
  status: string
  priority: "critical" | "high" | "medium" | "low"
  subCategory: string
  description: string
  /** Hours from now for SLA due (negative = already breached). */
  slaHoursFromNow: number
  assignedAgent: string
  comments: DemoScenarioComment[]
  history: DemoScenarioHistoryEvent[]
  ai: DemoScenarioAiSeed
  orchestrationHighlights: string[]
  screenshotChecklist: string[]
}

const AGENT_N1 = "Ikram Gafai"
const AGENT_N2 = "Thomas Mercier"
const SUPERVISOR = "Sarah Benali"

function demoCareId(n: number): string {
  return `CARE-DEMO-${String(n).padStart(5, "0")}`
}

export const DEMO_SCENARIOS: DemoScenarioDefinition[] = [
  {
    careId: demoCareId(1),
    slug: "escalation",
    title: "SCO basket sync failures after local recovery",
    objective: "Demonstrate high escalation probability, elevated SLA risk, and N3 routing after failed local SCO troubleshooting.",
    storeCode: "FR-HYP-LYO-PARTDIEU",
    category: "SCO",
    status: "IN_PROGRESS",
    priority: "critical",
    subCategory: "SCO_SYNC_FAILURE",
    description:
      "Self-checkout lanes 11 and 12 at Lyon Part-Dieu hypermarket fail to finalize baskets after payment authorization. " +
      "Store IT restarted SCO client services and cleared local cache twice without recovery. Error SCO-4421 persists on lane 12. " +
      "Lane 11 intermittently freezes at basket validation. No workaround for peak Saturday traffic. " +
      "Terminal IDs: SCO-LYO-11, SCO-LYO-12. Last successful sync: 06:40 CET.",
    slaHoursFromNow: 1.5,
    assignedAgent: AGENT_N2,
    comments: [
      {
        authorName: AGENT_N1,
        authorRole: "N1 Agent",
        body: "Requested store to reboot both SCO lanes and capture SCO-4421 trace from lane 12.",
        hoursAgo: 4,
      },
      {
        authorName: AGENT_N2,
        authorRole: "N2 Agent",
        body: "Local recovery attempted twice. Sync still failing after cache clear. Escalation path under review.",
        hoursAgo: 1,
      },
    ],
    history: [
      {
        eventType: "created",
        summary: "Ticket opened — SCO sync failure",
        actorLabel: "CARE",
        hoursAgo: 6,
      },
      {
        eventType: "assignment",
        summary: "Assigned to N2 checkout perimeter",
        detail: "Perimeter SCO",
        actorLabel: SUPERVISOR,
        hoursAgo: 5,
      },
      {
        eventType: "ai_recommendation",
        summary: "AI escalation signal generated",
        detail: "High confidence N3 path",
        actorLabel: "CAREPILOT",
        hoursAgo: 0.5,
      },
    ],
    ai: {
      escalation: { required: true, confidence: 0.91, probability: 0.88, label: "ESCALATION_REQUIRED" },
      transfer: { required: false, confidence: 0.82, probability: 0.14, label: "NO_TRANSFER" },
      action: {
        recommended: "ESCALATE_N3",
        confidence: 0.89,
        reason: "Local SCO recovery exhausted; multi-lane impact and persistent SCO-4421 require N3 intervention.",
        distribution: { ESCALATE_N3: 0.89, MONITOR: 0.06, RESOLVE_LOCALLY: 0.05 },
      },
      sla: { breach: true, confidence: 0.87, probability: 0.84, riskLevel: "HIGH" },
      priority: {
        predicted: "P1",
        confidence: 0.86,
        distribution: { P1: 0.86, P2: 0.1, P3: 0.04 },
      },
      missing: {
        fields: [],
        completeness: 0.92,
        quality: "COMPLETE",
        confidence: 0.95,
      },
      km: [
        {
          kmId: "KM-OP-001",
          title: "VLP lane recovery procedure",
          similarity: 0.54,
          rank: 1,
          confidenceLevel: "LOW",
          reason: "Partial match — VLP lane context; SCO sync failure needs N3 path.",
        },
      ],
      explanation: {
        operationalSummary:
          "Multi-lane SCO synchronization failure at Lyon Part-Dieu after documented local recovery attempts.",
        recommendedActionExplanation:
          "Escalate to N3 because store-level SCO restarts did not restore basket finalization and SLA exposure is high.",
        reasoning:
          "Escalation probability is high, SLA breach is imminent, and priority is P1. KM match is weak for SCO sync errors.",
        missingInformationNote: "Ticket includes lane IDs, error code, and troubleshooting history.",
        nextSteps: "Open N3 bridge, attach SCO-4421 traces from lane 12, and coordinate vendor sync restart.",
      },
    },
    orchestrationHighlights: [
      "Primary signal: recommended action → Escalate to N3",
      "Risk panel: escalation + SLA both High severity",
      "Quality complete — investigation focuses on routing not completeness",
    ],
    screenshotChecklist: [
      "Sticky primary decision bar showing Escalate to N3",
      "Operational risk section expanded with escalation + SLA signals",
      "Step 05 operational explanation with SLA impact narrative",
    ],
  },
  {
    careId: demoCareId(2),
    slug: "transfer",
    title: "Loyalty balance mismatch after back-office sync delay",
    objective: "Demonstrate transfer to back-office perimeter when loyalty symptoms originate from BO synchronization.",
    storeCode: "FR-MKT-PAR-SAINTMARCEL",
    category: "LOYALTY",
    status: "OPEN",
    priority: "high",
    subCategory: "LOYALTY_ENTITLEMENT",
    description:
      "Customer loyalty balance shown at SCO does not match Carrefour+ entitlement after coupon application. " +
      "N1 verified terminal payment path is healthy. BO entitlement batch for store FR-MKT-PAR-SAINTMARCEL last ran 04:15 CET — expected 02:00 window. " +
      "Issue affects loyalty accrual, not card authorization. Lane 4 terminal T-104 valid.",
    slaHoursFromNow: 8,
    assignedAgent: AGENT_N1,
    comments: [
      {
        authorName: AGENT_N1,
        authorRole: "N1 Agent",
        body: "Payment path clean. Loyalty mismatch correlates with delayed BO entitlement batch.",
        hoursAgo: 2,
      },
    ],
    history: [
      {
        eventType: "created",
        summary: "Ticket opened — loyalty entitlement mismatch",
        actorLabel: "CARE",
        hoursAgo: 3,
      },
      {
        eventType: "ai_recommendation",
        summary: "Transfer to back-office recommended",
        actorLabel: "CAREPILOT",
        hoursAgo: 0.3,
      },
    ],
    ai: {
      escalation: { required: false, confidence: 0.78, probability: 0.22, label: "NO_ESCALATION" },
      transfer: { required: true, confidence: 0.88, probability: 0.85, label: "TRANSFER_REQUIRED" },
      action: {
        recommended: "TRANSFER_PERIMETER",
        confidence: 0.86,
        reason: "Symptoms align with back-office entitlement sync, not front-office payment or SCO hardware.",
        distribution: { TRANSFER_PERIMETER: 0.86, REQUEST_INFORMATION: 0.08, RESOLVE_LOCALLY: 0.06 },
      },
      sla: { breach: false, confidence: 0.74, probability: 0.28, riskLevel: "MEDIUM" },
      priority: {
        predicted: "P2",
        confidence: 0.8,
        distribution: { P2: 0.8, P3: 0.15, P1: 0.05 },
      },
      missing: {
        fields: [],
        completeness: 0.88,
        quality: "ADEQUATE",
        confidence: 0.9,
      },
      km: [
        {
          kmId: "KM-OP-002",
          title: "Payment terminal diagnostic",
          similarity: 0.41,
          rank: 1,
          confidenceLevel: "LOW",
          reason: "Payment KM mismatch — incident is loyalty entitlement, not terminal authorization.",
        },
      ],
      explanation: {
        operationalSummary:
          "Loyalty entitlement mismatch at Paris Saint-Marcel Market linked to delayed back-office sync batch.",
        recommendedActionExplanation:
          "Transfer perimeter to back-office to re-run entitlement sync and validate Carrefour+ balance propagation.",
        reasoning:
          "Transfer probability is high while escalation stays low. KM match is intentionally weak (payment vs loyalty).",
        missingInformationNote: "Store, lane, and batch window documented.",
        nextSteps: "Route to BO perimeter, trigger entitlement resync, confirm customer balance on lane 4.",
      },
    },
    orchestrationHighlights: [
      "Transfer signal elevated; escalation stays low",
      "KM recommendation shows mismatch — supports transfer reasoning",
      "Explanation clarifies perimeter reassignment",
    ],
    screenshotChecklist: [
      "Risk panel showing Transfer required → BO",
      "KM section with low-confidence payment procedure",
      "Action block: Transfer perimeter",
    ],
  },
  {
    careId: demoCareId(3),
    slug: "local-resolution",
    title: "Receipt printer communication failure on checkout lane 7",
    objective: "Demonstrate local resolution with strong KM match and low escalation risk.",
    storeCode: "FR-HYP-PAR-AUTEUIL",
    category: "HARDWARE",
    status: "IN_PROGRESS",
    priority: "medium",
    subCategory: "PRINTER_COMMS",
    description:
      "Receipt printer on checkout lane 7 stops responding after paper reload. USB hub LED amber. " +
      "Lane VLP-07 operational for payment; only print path affected. Store confirmed cable seated. " +
      "Error: PRN-COMM-019. Terminal ID T-AUT-07. No prior escalation on this lane this month.",
    slaHoursFromNow: 18,
    assignedAgent: AGENT_N1,
    comments: [
      {
        authorName: AGENT_N1,
        authorRole: "N1 Agent",
        body: "Printer module swap available on site. Running KM-OP-004 peripheral recovery steps.",
        hoursAgo: 1,
      },
    ],
    history: [
      {
        eventType: "created",
        summary: "Ticket opened — receipt printer comms failure",
        actorLabel: "CARE",
        hoursAgo: 2,
      },
      {
        eventType: "ai_recommendation",
        summary: "Resolve locally with KM procedure",
        actorLabel: "CAREPILOT",
        hoursAgo: 0.2,
      },
    ],
    ai: {
      escalation: { required: false, confidence: 0.85, probability: 0.12, label: "NO_ESCALATION" },
      transfer: { required: false, confidence: 0.8, probability: 0.09, label: "NO_TRANSFER" },
      action: {
        recommended: "RESOLVE_LOCALLY",
        confidence: 0.92,
        reason: "Isolated peripheral fault with documented KM recovery and on-site swap capability.",
        distribution: { RESOLVE_LOCALLY: 0.92, APPLY_KM: 0.05, MONITOR: 0.03 },
      },
      sla: { breach: false, confidence: 0.81, probability: 0.11, riskLevel: "LOW" },
      priority: {
        predicted: "P3",
        confidence: 0.83,
        distribution: { P3: 0.83, P2: 0.12, P4: 0.05 },
      },
      missing: {
        fields: [],
        completeness: 0.94,
        quality: "COMPLETE",
        confidence: 0.96,
      },
      km: [
        {
          kmId: "KM-OP-004",
          title: "Peripheral hardware swap",
          similarity: 0.91,
          rank: 1,
          confidenceLevel: "HIGH",
          reason: "Strong match — receipt printer comms, USB hub, and acceptance test steps align.",
        },
        {
          kmId: "KM-OP-001",
          title: "VLP lane recovery procedure",
          similarity: 0.48,
          rank: 2,
          confidenceLevel: "LOW",
          reason: "Secondary — lane context only.",
        },
      ],
      explanation: {
        operationalSummary:
          "Isolated receipt printer communication failure on lane 7 at Paris Auteuil with on-site recovery options.",
        recommendedActionExplanation:
          "Resolve locally using peripheral hardware KM — swap module and run acceptance test.",
        reasoning:
          "Low escalation and transfer risk; high KM similarity for KM-OP-004. SLA remains on track.",
        missingInformationNote: "Complete operational identifiers and error code provided.",
        nextSteps: "Apply KM-OP-004, validate print path, close ticket after acceptance test.",
      },
    },
    orchestrationHighlights: [
      "Strong KM match drives local resolution",
      "All risk signals Low — calm investigation tone",
      "Explanation focused on KM-led recovery",
    ],
    screenshotChecklist: [
      "KM section expanded with HIGH confidence KM-OP-004",
      "Action: Resolve locally",
      "Risk section collapsed or showing low severity",
    ],
  },
  {
    careId: demoCareId(4),
    slug: "incomplete-ticket",
    title: "checkout not working",
    objective: "Demonstrate missing information detection and request-for-information workflow.",
    storeCode: "FR-HYP-MRS-BONNEVEINE",
    category: "CHECKOUT",
    status: "OPEN",
    priority: "medium",
    subCategory: "UNSPECIFIED",
    description: "checkout not working",
    slaHoursFromNow: 24,
    assignedAgent: AGENT_N1,
    comments: [],
    history: [
      {
        eventType: "created",
        summary: "Ticket opened — vague checkout report",
        actorLabel: "CARE",
        hoursAgo: 0.5,
      },
    ],
    ai: {
      escalation: { required: false, confidence: 0.62, probability: 0.35, label: "NO_ESCALATION" },
      transfer: { required: false, confidence: 0.58, probability: 0.2, label: "NO_TRANSFER" },
      action: {
        recommended: "REQUEST_INFORMATION",
        confidence: 0.9,
        reason: "Insufficient store, lane, error, and reproduction detail to route or resolve safely.",
        distribution: { REQUEST_INFORMATION: 0.9, MONITOR: 0.06, RESOLVE_LOCALLY: 0.04 },
      },
      sla: { breach: false, confidence: 0.55, probability: 0.18, riskLevel: "LOW" },
      priority: {
        predicted: "P3",
        confidence: 0.6,
        distribution: { P3: 0.6, P4: 0.25, P2: 0.15 },
      },
      missing: {
        fields: [
          "VAGUE_DESCRIPTION",
          "GENERIC_TITLE",
          "MISSING_STORE_IDENTIFIER",
          "MISSING_LANE_NUMBER",
          "MISSING_TERMINAL_ID",
          "MISSING_ERROR_MESSAGE",
          "MISSING_REPRODUCTION_STEPS",
        ],
        completeness: 0.22,
        quality: "POOR",
        confidence: 0.94,
      },
      km: [],
      explanation: {
        operationalSummary:
          "Checkout incident report lacks operational detail required for FO/VLP routing.",
        recommendedActionExplanation:
          "Request more information before escalation or transfer — completeness score is critically low.",
        reasoning:
          "Vague description and missing identifiers block reliable prediction. No KM match attempted safely.",
        missingInformationNote:
          "Need store lane number, terminal ID, error message, and steps already tried by the store.",
        nextSteps:
          "Contact store manager, capture lane/terminal/error details, then re-run operational intelligence.",
      },
    },
    orchestrationHighlights: [
      "Quality section open by default — Poor quality, 22% completeness",
      "Primary action: Request information",
      "KM empty — cannot recommend procedure safely",
    ],
    screenshotChecklist: [
      "Step 01 quality warnings and vague description alert",
      "Primary decision: Request information",
      "Explanation missing-info note prominent",
    ],
  },
  {
    careId: demoCareId(5),
    slug: "sla-critical",
    title: "Payment authorization outage on six SCO lanes",
    objective: "Demonstrate SLA-critical payment outage with high urgency and escalation path.",
    storeCode: "FR-HYP-PAR-AUTEUIL",
    category: "PAYMENT",
    status: "OPEN",
    priority: "critical",
    subCategory: "AUTH_OUTAGE",
    description:
      "Payment authorization failing on SCO lanes 1–6 at Paris Auteuil during peak trade. " +
      "Acquirer timeout PAY-AUTH-903 on all affected lanes since 11:05 CET. " +
      "Cash lanes operational. Approx. 40 baskets queued. Terminal IDs SCO-AUT-01 through SCO-AUT-06. " +
      "Store manager requests immediate restoration — SLA TTR 2h already consumed.",
    slaHoursFromNow: -0.5,
    assignedAgent: AGENT_N2,
    comments: [
      {
        authorName: AGENT_N2,
        authorRole: "N2 Agent",
        body: "Acquirer link verified down from store gateway. Monetique perimeter engaged.",
        hoursAgo: 0.3,
      },
    ],
    history: [
      {
        eventType: "created",
        summary: "Critical payment authorization outage",
        actorLabel: "CARE",
        hoursAgo: 2.5,
      },
      {
        eventType: "escalation",
        summary: "SLA breach window entered",
        actorLabel: SUPERVISOR,
        hoursAgo: 0.2,
      },
    ],
    ai: {
      escalation: { required: true, confidence: 0.93, probability: 0.9, label: "ESCALATION_REQUIRED" },
      transfer: { required: false, confidence: 0.7, probability: 0.4, label: "NO_TRANSFER" },
      action: {
        recommended: "ESCALATE_N3",
        confidence: 0.91,
        reason: "Multi-lane payment authorization outage with active SLA breach and customer queue impact.",
        distribution: { ESCALATE_N3: 0.91, TRANSFER_PERIMETER: 0.06, MONITOR: 0.03 },
      },
      sla: { breach: true, confidence: 0.95, probability: 0.93, riskLevel: "HIGH" },
      priority: {
        predicted: "P1",
        confidence: 0.94,
        distribution: { P1: 0.94, P2: 0.05, P3: 0.01 },
      },
      missing: {
        fields: [],
        completeness: 0.96,
        quality: "COMPLETE",
        confidence: 0.97,
      },
      km: [
        {
          kmId: "KM-OP-002",
          title: "Payment terminal diagnostic",
          similarity: 0.72,
          rank: 1,
          confidenceLevel: "MEDIUM",
          reason: "Relevant acquirer diagnostic steps — escalation still required due to scope.",
        },
      ],
      explanation: {
        operationalSummary:
          "Six-lane SCO payment authorization outage at Paris Auteuil with SLA already breached.",
        recommendedActionExplanation:
          "Escalate immediately — SLA impact, P1 urgency, and acquirer-wide timeout exceed local recovery scope.",
        reasoning:
          "SLA breach probability is highest signal. Escalation and P1 priority align. KM supports diagnostics but does not replace N3.",
        missingInformationNote: "Full lane list, error code, and business impact documented.",
        nextSteps: "N3 bridge with monetique, acquirer trace, and store queue mitigation plan.",
      },
    },
    orchestrationHighlights: [
      "SLA signal High — breach active",
      "Escalation + P1 priority aligned",
      "Explanation emphasizes SLA and business impact",
    ],
    screenshotChecklist: [
      "Risk panel: SLA At risk + Escalation Required",
      "Sticky bar + action: Escalate to N3",
      "Command bar SLA indicator in critical tone",
    ],
  },
  {
    careId: demoCareId(6),
    slug: "false-escalation-risk",
    title: "Card reader timeout with known payment KM available",
    objective: "Show moderate escalation signal overridden by strong KM-led local resolution.",
    storeCode: "FR-HYP-LYO-PARTDIEU",
    category: "PAYMENT",
    status: "IN_PROGRESS",
    priority: "high",
    subCategory: "TERMINAL_TIMEOUT",
    description:
      "Single checkout lane 3 card reader times out during authorization. Initial symptoms appear critical. " +
      "Error PAY-TMO-112 documented. Terminal T-LYO-03. N1 confirms acquirer status green. " +
      "KM-OP-002 payment terminal diagnostic applies — reboot and trace capture not yet executed.",
    slaHoursFromNow: 10,
    assignedAgent: AGENT_N1,
    comments: [
      {
        authorName: AGENT_N1,
        authorRole: "N1 Agent",
        body: "Symptoms look severe but isolated to one lane. Proceeding with payment KM before N3.",
        hoursAgo: 0.8,
      },
    ],
    history: [
      {
        eventType: "created",
        summary: "Card reader timeout — lane 3",
        actorLabel: "CARE",
        hoursAgo: 1.5,
      },
      {
        eventType: "ai_recommendation",
        summary: "KM-led local resolution preferred over escalation",
        actorLabel: "CAREPILOT",
        hoursAgo: 0.1,
      },
    ],
    ai: {
      escalation: { required: true, confidence: 0.68, probability: 0.55, label: "ESCALATION_UNCERTAIN" },
      transfer: { required: false, confidence: 0.75, probability: 0.18, label: "NO_TRANSFER" },
      action: {
        recommended: "APPLY_KM",
        confidence: 0.88,
        reason: "Strong payment KM available; single-lane timeout before KM steps exhausted.",
        distribution: { APPLY_KM: 0.88, RESOLVE_LOCALLY: 0.08, ESCALATE_N3: 0.04 },
      },
      sla: { breach: false, confidence: 0.72, probability: 0.25, riskLevel: "MEDIUM" },
      priority: {
        predicted: "P2",
        confidence: 0.77,
        distribution: { P2: 0.77, P1: 0.15, P3: 0.08 },
      },
      missing: {
        fields: [],
        completeness: 0.9,
        quality: "COMPLETE",
        confidence: 0.92,
      },
      km: [
        {
          kmId: "KM-OP-002",
          title: "Payment terminal diagnostic",
          similarity: 0.89,
          rank: 1,
          confidenceLevel: "HIGH",
          reason: "Strong match — PAY-TMO-112 aligns with terminal diagnostic and acquirer trace steps.",
        },
      ],
      explanation: {
        operationalSummary:
          "Single-lane payment timeout that appears critical but has a strong KM recovery path.",
        recommendedActionExplanation:
          "Apply payment KM before escalation — escalation probability is moderate, not definitive.",
        reasoning:
          "Orchestration balances elevated initial urgency against high KM confidence and single-lane scope.",
        missingInformationNote: "Terminal ID and error code present.",
        nextSteps: "Execute KM-OP-002 reboot and trace sequence; escalate only if timeout persists.",
      },
    },
    orchestrationHighlights: [
      "Escalation signal present but action prefers KM",
      "Demonstrates orchestration tradeoff logic",
      "Strong KM HIGH confidence vs moderate risk",
    ],
    screenshotChecklist: [
      "Risk: escalation moderate, SLA medium",
      "Action: Apply KM procedure (or Resolve locally)",
      "KM HIGH match KM-OP-002",
    ],
  },
  {
    careId: demoCareId(7),
    slug: "network-payment-ambiguity",
    title: "Payment timeout linked to store connectivity instability",
    objective: "Demonstrate operational ambiguity between payment and network perimeters.",
    storeCode: "FR-HYP-NTE-BEAULIEU",
    category: "PAYMENT",
    status: "OPEN",
    priority: "high",
    subCategory: "AUTH_TIMEOUT",
    description:
      "Intermittent payment authorization timeout on lanes 2 and 5. Error PAY-TMO-204 logged. " +
      "However store reports gateway ping loss and DNS resolution failures on VLAN 42 since 09:50 CET. " +
      "Network path unstable — may root-cause payment symptom. Terminal T-NTE-02, T-NTE-05.",
    slaHoursFromNow: 5,
    assignedAgent: AGENT_N2,
    comments: [
      {
        authorName: AGENT_N2,
        authorRole: "N2 Agent",
        body: "Payment team suspects network path. VLAN 42 flapping observed in store ping tests.",
        hoursAgo: 1,
      },
    ],
    history: [
      {
        eventType: "created",
        summary: "Payment timeout with network symptoms",
        actorLabel: "CARE",
        hoursAgo: 2,
      },
    ],
    ai: {
      escalation: { required: false, confidence: 0.65, probability: 0.42, label: "NO_ESCALATION" },
      transfer: { required: true, confidence: 0.84, probability: 0.79, label: "TRANSFER_REQUIRED" },
      action: {
        recommended: "TRANSFER_PERIMETER",
        confidence: 0.81,
        reason: "Network instability on VLAN 42 likely root cause — transfer to réseau perimeter.",
        distribution: { TRANSFER_PERIMETER: 0.81, ESCALATE_N3: 0.12, MONITOR: 0.07 },
      },
      sla: { breach: false, confidence: 0.76, probability: 0.38, riskLevel: "MEDIUM" },
      priority: {
        predicted: "P2",
        confidence: 0.79,
        distribution: { P2: 0.79, P1: 0.14, P3: 0.07 },
      },
      missing: {
        fields: [],
        completeness: 0.87,
        quality: "ADEQUATE",
        confidence: 0.88,
      },
      km: [
        {
          kmId: "KM-OP-002",
          title: "Payment terminal diagnostic",
          similarity: 0.58,
          rank: 1,
          confidenceLevel: "MEDIUM",
          reason: "Payment KM partial match — symptom may be network-induced.",
        },
        {
          kmId: "KM-OP-003",
          title: "Store network path verification",
          similarity: 0.76,
          rank: 2,
          confidenceLevel: "HIGH",
          reason: "Network KM better explains VLAN and DNS symptoms.",
        },
      ],
      explanation: {
        operationalSummary:
          "Payment authorization timeouts on two lanes with concurrent store network instability.",
        recommendedActionExplanation:
          "Transfer to network perimeter — VLAN and DNS failures explain payment symptom better than terminal fault.",
        reasoning:
          "Orchestration surfaces transfer/escalation tradeoff: payment category but network root cause likely.",
        missingInformationNote: "Network symptoms documented alongside payment error codes.",
        nextSteps: "Transfer to réseau, run KM-OP-003 path verification, re-test payment after link stable.",
      },
    },
    orchestrationHighlights: [
      "Category PAYMENT but transfer to RESEAU recommended",
      "Two KM candidates show ambiguity resolution",
      "Explanation narrates tradeoff clearly",
    ],
    screenshotChecklist: [
      "Transfer signal in risk panel",
      "KM alternatives showing network vs payment",
      "Explanation reasoning paragraph",
    ],
  },
  {
    careId: demoCareId(8),
    slug: "monitoring",
    title: "Intermittent SCO screen freeze without current reproduction",
    objective: "Demonstrate monitor recommendation with low confidence and limited urgency.",
    storeCode: "FR-MKT-PAR-SAINTMARCEL",
    category: "SCO",
    status: "MONITORING",
    priority: "low",
    subCategory: "INTERMITTENT_UI",
    description:
      "Store reports occasional SCO screen freeze on lane 8 during idle periods. No freeze in last 4 hours. " +
      "No error code captured. Terminal SCO-STM-08. Prior occurrence last Tuesday. " +
      "Store accepts monitoring until next reproduction.",
    slaHoursFromNow: 36,
    assignedAgent: AGENT_N1,
    comments: [
      {
        authorName: AGENT_N1,
        authorRole: "N1 Agent",
        body: "Cannot reproduce remotely. Monitoring agreed with store until next event.",
        hoursAgo: 3,
      },
    ],
    history: [
      {
        eventType: "created",
        summary: "Intermittent SCO UI freeze — monitoring",
        actorLabel: "CARE",
        hoursAgo: 8,
      },
      {
        eventType: "suspension",
        summary: "Moved to monitoring pending reproduction",
        actorLabel: AGENT_N1,
        hoursAgo: 3,
      },
    ],
    ai: {
      escalation: { required: false, confidence: 0.71, probability: 0.15, label: "NO_ESCALATION" },
      transfer: { required: false, confidence: 0.68, probability: 0.1, label: "NO_TRANSFER" },
      action: {
        recommended: "MONITOR",
        confidence: 0.84,
        reason: "Intermittent unreproduced issue — monitor until next occurrence with capture plan.",
        distribution: { MONITOR: 0.84, REQUEST_INFORMATION: 0.1, RESOLVE_LOCALLY: 0.06 },
      },
      sla: { breach: false, confidence: 0.69, probability: 0.08, riskLevel: "LOW" },
      priority: {
        predicted: "P4",
        confidence: 0.73,
        distribution: { P4: 0.73, P3: 0.2, P2: 0.07 },
      },
      missing: {
        fields: ["MISSING_ERROR_MESSAGE", "MISSING_REPRODUCTION_STEPS"],
        completeness: 0.68,
        quality: "INCOMPLETE",
        confidence: 0.86,
      },
      km: [
        {
          kmId: "KM-OP-001",
          title: "VLP lane recovery procedure",
          similarity: 0.52,
          rank: 1,
          confidenceLevel: "MEDIUM",
          reason: "Partial SCO context — insufficient reproduction detail for confident KM application.",
        },
      ],
      explanation: {
        operationalSummary:
          "Intermittent SCO UI freeze without current reproduction — monitoring phase active.",
        recommendedActionExplanation:
          "Monitor ticket — low escalation urgency and no stable error pattern to act on.",
        reasoning:
          "Low confidence across routing signals. Missing error capture limits KM and escalation paths.",
        missingInformationNote: "Capture error code and timestamp on next freeze event.",
        nextSteps: "Keep in monitoring; request SCO trace capture when issue reoccurs.",
      },
    },
    orchestrationHighlights: [
      "Primary action: Monitor",
      "Low severity across risk signals",
      "Quality incomplete but not blocking — monitoring appropriate",
    ],
    screenshotChecklist: [
      "Primary decision: Monitor",
      "Risk section collapsed (low severity defaults)",
      "Explanation next steps for capture plan",
    ],
  },
]

export function demoScenarioByCareId(careId: string): DemoScenarioDefinition | undefined {
  return DEMO_SCENARIOS.find((s) => s.careId === careId)
}

export function demoScenarioBySlug(slug: string): DemoScenarioDefinition | undefined {
  return DEMO_SCENARIOS.find((s) => s.slug === slug)
}

export function demoScenarioCareIds(): string[] {
  return DEMO_SCENARIOS.map((s) => s.careId)
}

export function perimeterForDemoScenario(scenario: DemoScenarioDefinition): string {
  return perimeterCodeForCategory(scenario.category)
}

export function cpAgentPriority(scenario: DemoScenarioDefinition): string {
  switch (scenario.priority) {
    case "critical":
      return "P1"
    case "high":
      return "P2"
    case "medium":
      return "P3"
    default:
      return "P4"
  }
}
