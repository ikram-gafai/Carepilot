/**
 * Seed content for `cp_agent.procedures` (English operational text).
 * Loaded by `scripts/seed-cp-agent.ts` only — merged into agent Runbooks usage telemetry.
 */
export type AgentProcedureSample = {
  kmCode: string
  title: string
  category: string
  perimeter: string
  summary: string
  prerequisites: string
  steps: string[]
  tags: string
  /** 0–1 display score when no usage telemetry */
  baselineRelevance: number
}

export const AGENT_PROCEDURE_SAMPLES: AgentProcedureSample[] = [
  {
    kmCode: "KM-OP-ISO",
    title: "Lane isolation and session diagnostics",
    category: "CHECKOUT",
    perimeter: "FO",
    summary:
      "Checkout isolation sequence: session lock, context capture, application diagnostics, and minimal network perimeter.",
    prerequisites: "Cashier identity, store code, lane number",
    steps: [
      "Put the lane in short maintenance and inform the store.",
      "Capture symptom time, application version, and visible error messages.",
      "Check active sessions and local file locks.",
      "Test the session on a second lane if available (comparison).",
      "Document gaps before any corrective action.",
    ],
    tags: "isolation,diagnostic,session",
    baselineRelevance: 0.94,
  },
  {
    kmCode: "KM-OP-LIA",
    title: "Store link checks",
    category: "NETWORK",
    perimeter: "NETWORK",
    summary:
      "Structured store link checks: gateway, latency, loss, DNS, and path to the regional network.",
    prerequisites: "Incident time window, known store topology",
    steps: [
      "Ping gateway and first ISP hop.",
      "Check DNS resolution for business services.",
      "Verify store VLAN and lane aggregation port.",
      "Compare with a reference lane from the same batch.",
      "Record metrics in the incident record.",
    ],
    tags: "link,store,vlan",
    baselineRelevance: 0.91,
  },
  {
    kmCode: "KM-OP-SCO",
    title: "SCO controlled restart",
    category: "CHECKOUT",
    perimeter: "FO",
    summary:
      "Controlled SCO module restart: shutdown order, local queue flush, post-restart integrity check.",
    prerequisites: "Empty customer queue or neighbor-lane fallback",
    steps: [
      "Close in-flight transactions per store rule.",
      "Ordered application stop then OS restart if required.",
      "Check SCO services and peripheral connectivity.",
      "Dry-run payment then return to production.",
    ],
    tags: "sco,restart,checkout",
    baselineRelevance: 0.88,
  },
  {
    kmCode: "KM-OP-VLP",
    title: "VLP synchronization verification",
    category: "DATA",
    perimeter: "FO",
    summary:
      "Catalog/item sync job checks: windows, load, middleware errors, and idempotent retry.",
    prerequisites: "Start time of slowdown or sync error",
    steps: [
      "Identify last successful job and time delta.",
      "Review middleware logs and DB locks.",
      "Retry incremental sync if authorized.",
      "Validate a sample of floor items.",
    ],
    tags: "vlp,sync,catalog",
    baselineRelevance: 0.87,
  },
  {
    kmCode: "KM-OP-TPE",
    title: "Bank PIN pad checks",
    category: "PIN_PAD",
    perimeter: "FO",
    summary:
      "Field PIN pad test: line, acquirer contract, hardware swap, test transaction then production.",
    prerequisites: "PIN pad error code and timestamped trace",
    steps: [
      "Controlled PIN pad reboot and line test.",
      "Verify SIRET / MID and firmware version.",
      "Run acquirer test transaction.",
      "Hardware substitution if failure repeats.",
    ],
    tags: "pinpad,bank,acquirer",
    baselineRelevance: 0.9,
  },
  {
    kmCode: "KM-OP-VCC",
    title: "VCC upload validation",
    category: "DATA",
    perimeter: "FO",
    summary:
      "VCC upload checks: field consistency, anomaly filtering, validation against regional reference.",
    prerequisites: "Batch ID or ticket range",
    steps: [
      "Extract error records for the range.",
      "Compare to regional reference and validation rules.",
      "Correct or reject with traceable reason.",
      "Retry upload after correction.",
    ],
    tags: "vcc,validation,data",
    baselineRelevance: 0.85,
  },
]
