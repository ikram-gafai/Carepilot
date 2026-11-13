import "./load-env"

import { eq } from "drizzle-orm"

import { getDb, getSql } from "@/lib/db"
import {
  careSourceTickets,
  cashRegisters,
  kmProcedures,
  stores,
  ticketActions,
  ticketComments,
} from "@/lib/db/schema/care-source"
import { DEMO_TICKETS_QUEUE } from "@/lib/tickets-demo-queue"

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const TICKET_COUNT = Number(process.env.SEED_TICKET_COUNT ?? "520")

const KM_SEED = [
  {
    kmCode: "KM-VLP-001",
    title: "Controlled VLP lane restart",
    perimeter: "FO",
    category: "CHECKOUT",
    content:
      "Standard procedure: isolate lane, verify session, restart application, review error logs.",
    prerequisites: "Store and lane identified",
    tags: "lane,vlp,restart",
  },
  {
    kmCode: "KM-VLP-002",
    title: "Handheld scanner error",
    perimeter: "FO",
    category: "PERIPH",
    content:
      "Check USB attachment, hub ports, scanner driver, test degraded barcode reads.",
    prerequisites: "Scanner error reproduced",
    tags: "scanner,hardware,handheld",
  },
  {
    kmCode: "KM-VLP-003",
    title: "Store network link loss",
    perimeter: "NETWORK",
    category: "NETWORK",
    content:
      "Ping gateway, store VLAN, DNS, cabling tests at lane rack — escalate to network if persistent.",
    prerequisites: "Network symptoms described",
    tags: "network,vlan,dns",
  },
  {
    kmCode: "KM-VLP-004",
    title: "Customer receipt print blocked",
    perimeter: "FO",
    category: "PRINT",
    content:
      "Print spooler, Windows test page, thermal printer driver, roller alignment.",
    prerequisites: "Printer model",
    tags: "print,thermal",
  },
  {
    kmCode: "KM-VLP-005",
    title: "Payment terminal incident",
    perimeter: "FO",
    category: "TPE",
    content:
      "TPE checklist: reboot, line test, acquirer contract, hardware swap from stock.",
    prerequisites: "TPE error code",
    tags: "tpe,payment",
  },
  {
    kmCode: "KM-VLP-006",
    title: "Slow article catalog sync",
    perimeter: "FO",
    category: "DATA",
    content:
      "Check sync window, regional server load, restart sync job, middleware logs.",
    prerequisites: "Incident timestamp",
    tags: "sync,catalog",
  },
  {
    kmCode: "KM-VLP-007",
    title: "Cashier session locked",
    perimeter: "FO",
    category: "IAM",
    content:
      "Supervisor unlock, local AD session reset, password policy check.",
    prerequisites: "Cashier identity",
    tags: "session,iam",
  },
  {
    kmCode: "KM-VLP-008",
    title: "Inventory anomaly report",
    perimeter: "FO",
    category: "INV",
    content:
      "Pull inventory logs, reconcile theoretical vs physical stock, clear caches.",
    prerequisites: "Inventory reference",
    tags: "inventory,stock",
  },
]

const TITLE_TEMPLATES = [
  "Lane {reg} — intermittent transaction error",
  "Scanner not reading EANs on lane {reg}",
  "HQ link down — store {store}",
  "Customer receipt print misaligned",
  "Excessive latency opening a sale",
  "POS terminal refusing contactless card",
  "App crash after overnight update",
  "Duplicate inventory ticket — needs clarification",
  "[URG] lane {reg} intermittently down",
  "Sync issue — store {store} (same as yesterday)",
  "VLP {reg}: latency + Wi-Fi drops ???",
  "Duplicate — see prior CARE same store",
  "N3 escalation requested by store — pending validation",
]

const SHORT_COMMENTS = [
  "checked with store",
  "no screenshot",
  "same as yesterday",
  "?",
  "N3 esc ???",
  "transfer to fw?",
  "scanner vs VLAN unclear",
  "need serial number",
]

async function truncateSimulator() {
  const sql = getSql()
  const [embeddingsTable] = await sql`
    SELECT 1 AS ok FROM information_schema.tables
    WHERE table_schema = 'carepilot' AND table_name = 'embeddings'
    LIMIT 1
  `
  const carepilotTables = [
    "carepilot.golden_test_cases",
    "carepilot.similar_ticket_results",
    "carepilot.km_recommendations",
    "carepilot.decision_suggestions",
    "carepilot.ticket_timeline_events",
    "carepilot.ticket_analysis",
    ...(embeddingsTable ? ["carepilot.embeddings"] : []),
    "carepilot.tickets",
    "carepilot.sync_logs",
  ].join(",\n      ")

  await sql.unsafe(`
    TRUNCATE TABLE
      ${carepilotTables}
    RESTART IDENTITY CASCADE;
  `)
  await sql.unsafe(`
    TRUNCATE TABLE
      care_source.ticket_comments,
      care_source.ticket_actions,
      care_source.tickets,
      care_source.cash_registers,
      care_source.km_procedures,
      care_source.stores
    RESTART IDENTITY CASCADE;
  `)
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required")
    process.exit(1)
  }

  const db = getDb()
  await truncateSimulator()

  const rnd = mulberry32(42)

  console.log(`Seed: ${TICKET_COUNT} anonymized FO operational tickets`)

  const cityPairs = [
    ["101", "North Alpha Store", "Lille"],
    ["102", "East Beta Store", "Metz"],
    ["103", "South Gamma Store", "Toulouse"],
    ["104", "West Delta Store", "Nantes"],
    ["105", "Central Epsilon Store", "Lyon"],
  ]

  const storeIds: number[] = []
  for (const [code, name, city] of cityPairs) {
    const [row] = await db
      .insert(stores)
      .values({ storeCode: code, storeName: name, city })
      .returning({ id: stores.id })
    storeIds.push(row!.id)

    for (let r = 1; r <= 6; r++) {
      await db.insert(cashRegisters).values({
        storeId: row!.id,
        registerCode: `REG-${code}-${r}`,
        status: rnd() > 0.05 ? "ACTIVE" : "MAINTENANCE",
      })
    }
  }

  for (const km of KM_SEED) {
    await db.insert(kmProcedures).values({
      kmCode: km.kmCode,
      title: km.title,
      perimeter: km.perimeter,
      category: km.category,
      content: km.content,
      steps: "",
      prerequisites: km.prerequisites,
      tags: km.tags,
    })
  }

  const kmRows = await db.select().from(kmProcedures)
  const kmCodes = kmRows.map((k) => k.kmCode)

  const statuses = ["OPEN", "IN_PROGRESS", "WAITING_STORE", "RESOLVED", "TRANSFERRED"]
  const priorities = ["P3", "P2", "P1"]
  const categories = ["CHECKOUT", "NETWORK", "PERIPH", "PRINT", "TPE", "DATA"]

  let lastRichDescription = ""

  for (let i = 1; i <= TICKET_COUNT; i++) {
    const storeIdx = Math.floor(rnd() * storeIds.length)
    const storeId = storeIds[storeIdx]!
    const storeRow = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1)
    const storeCode = storeRow[0]!.storeCode

    const regNum = 1 + Math.floor(rnd() * 6)
    const registerCode = `REG-${storeCode}-${regNum}`

    const missingFieldsScenario = rnd() < 0.12
    const title = TITLE_TEMPLATES[i % TITLE_TEMPLATES.length]!
      .replace("{reg}", registerCode)
      .replace("{store}", storeCode)

    let hardwareHeavy = rnd() < 0.25
    let networkHeavy = rnd() < 0.22 && !hardwareHeavy
    const ambiguousHwNw = rnd() < 0.09
    if (ambiguousHwNw) {
      hardwareHeavy = true
      networkHeavy = true
    }

    let description = `FO operational incident — ${title}. `
    description += hardwareHeavy
      ? "Hardware symptoms (USB/scanner/roller). "
      : ""
    description += networkHeavy
      ? "Network symptoms (latency, VLAN, packet loss). "
      : ""
    description += ambiguousHwNw ? "Field ambiguity: peripheral vs infra — unclear qualification. " : ""
    description += `Store ${storeCode}, lane ${registerCode}. `
    description +=
      rnd() < 0.15
        ? "Vague wording — needs field details."
        : "Detailed description available for analysis."
    description += rnd() < 0.12 ? " Abbreviated ops note — see store comment." : ""
    description += rnd() < 0.07 ? " Intentional typo in item label (seed anomaly)." : ""

    if (i > 2 && rnd() < 0.04 && lastRichDescription.length > 40) {
      description =
        lastRichDescription.slice(0, Math.min(lastRichDescription.length - 20, 220)) +
        " … REPEAT / near-duplicate same symptom."
    }

    lastRichDescription = description

    const err =
      rnd() < 0.65
        ? `ERR-VLP-${1000 + Math.floor(rnd() * 900)}`
        : rnd() < 0.4
          ? ""
          : "TIMEOUT_SYNC_REGION"

    const kmPick = kmCodes[Math.floor(rnd() * kmCodes.length)]!
    const appliedKm = rnd() < 0.35 ? kmPick : null
    const kmApplicable = rnd() < 0.78 ? kmPick : null

    const created = new Date(Date.now() - Math.floor(rnd() * 14 * 86400_000))
    const slaDue = new Date(created.getTime() + (6 + Math.floor(rnd() * 30)) * 3600_000)

    const status = statuses[Math.floor(rnd() * statuses.length)]!
    let finalAction =
      status === "RESOLVED"
        ? rnd() < 0.7
          ? "Resolved N2"
          : "Escalated N3"
        : status === "TRANSFERRED"
          ? rnd() < 0.65
            ? "Transfer Hardware"
            : "Transfer Network"
          : null

    let escalationRequired = /\bN3\b/i.test(finalAction ?? "")
    let transferRequired = /transfer/i.test(finalAction ?? "")
    const escalationMismatch = rnd() < 0.045 && status === "RESOLVED" && finalAction === "Resolved N2"
    if (escalationMismatch) {
      escalationRequired = true
    }
    const transferMismatch = rnd() < 0.035 && status === "OPEN" && rnd() < 0.5
    if (transferMismatch) {
      transferRequired = true
      finalAction = finalAction ?? "Transfer Hardware (store request — pending validation)"
    }

    const demoSlot = i - 1 < DEMO_TICKETS_QUEUE.length ? DEMO_TICKETS_QUEUE[i - 1]! : undefined
    const careTicketId = demoSlot?.ticketId ?? `CARE-VLP-${String(i).padStart(6, "0")}`
    const seedTitle = demoSlot?.subject ?? title
    const seedDescription = demoSlot
      ? `${demoSlot.subject}. CAREPILOT demo alignment — perimeter ${demoSlot.perimeter}.`
      : description
    const seedPerimeter = demoSlot
      ? demoSlot.perimeter.replace(/\s*\/\s*/g, "_").replace(/\s+/g, "")
      : "FO"

    const [ticketRow] = await db
      .insert(careSourceTickets)
      .values({
        careTicketId,
        title: seedTitle,
        description: seedDescription,
        perimeter: seedPerimeter,
        status,
        priority: priorities[Math.floor(rnd() * priorities.length)]!,
        channel: rnd() < 0.8 ? "PORTAL" : "PHONE",
        storeId,
        storeCode: missingFieldsScenario ? "" : storeCode,
        cashRegisterCode: missingFieldsScenario && rnd() < 0.5 ? "" : registerCode,
        category: categories[Math.floor(rnd() * categories.length)]!,
        errorMessage: err || null,
        finalAction,
        finalReason: finalAction ? "PFE-style operational resolution" : null,
        incidentCategory: categories[Math.floor(rnd() * categories.length)]!,
        escalationRequired,
        transferRequired,
        targetPerimeter: /hardware/i.test(finalAction ?? "") ? "MATERIEL" : null,
        kmApplicable,
        resolvedByKm: appliedKm ? rnd() < 0.45 : false,
        missingInformationFlag: missingFieldsScenario || !err,
        appliedKmCode: appliedKm,
        createdAt: created,
        updatedAt: created,
        closedAt: status === "RESOLVED" ? new Date(slaDue.getTime() - 3600_000) : null,
        slaDueAt: slaDue,
      })
      .returning({ id: careSourceTickets.id })

    const tid = ticketRow!.id

    if (rnd() < 0.85) {
      const longComment =
        rnd() < 0.3
          ? "See history — recurring incident on this lane."
          : "Please attach an error screenshot if possible."
      await db.insert(ticketComments).values({
        ticketId: tid,
        authorRole: rnd() < 0.5 ? "N1_AGENT" : "STORE_MANAGER",
        content: rnd() < 0.35 ? SHORT_COMMENTS[Math.floor(rnd() * SHORT_COMMENTS.length)]! : longComment,
        createdAt: new Date(created.getTime() + 3600_000),
      })
    }

    if (rnd() < 0.18) {
      await db.insert(ticketComments).values({
        ticketId: tid,
        authorRole: "N1_AGENT",
        content: SHORT_COMMENTS[Math.floor(rnd() * SHORT_COMMENTS.length)]!,
        createdAt: new Date(created.getTime() + 4200_000),
      })
    }

    if (rnd() < 0.55) {
      await db.insert(ticketActions).values({
        ticketId: tid,
        actionType: "DIAGNOSTIC",
        description: networkHeavy ? "Ping store gateway" : "Review lane application logs",
        result: rnd() < 0.4 ? "Partial OK" : "Inconclusive",
        performedBy: "N1_AGENT",
        createdAt: new Date(created.getTime() + 7200_000),
      })
    }

    if (appliedKm) {
      await db.insert(ticketActions).values({
        ticketId: tid,
        actionType: "KM_APPLY",
        description: `Applied procedure ${appliedKm}`,
        result: rnd() < 0.35 ? "Failed after KM" : "OK",
        performedBy: "N2_AGENT",
        createdAt: new Date(created.getTime() + 10_800_000),
      })
    }

    if (i % 100 === 0) console.log(`  … ${i} tickets`)
  }

  console.log("CARE Simulator seed complete (care_source.*). Run POST /api/sync/care for CAREPILOT.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
