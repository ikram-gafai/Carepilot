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
    title: "Redémarrage contrôlé caisse VLP",
    perimeter: "FO_VLP",
    category: "CAISSE",
    content:
      "Procédure standard : isolation caisse, vérif session, redémarrage applicatif, contrôle logs erreur.",
    prerequisites: "Magasin et caisse identifiés",
    tags: "caisse,vlp,redémarrage",
  },
  {
    kmCode: "KM-VLP-002",
    title: "Erreur scanner douchette",
    perimeter: "FO_VLP",
    category: "PERIPH",
    content:
      "Vérifier rattachement USB, ports hub, pilote scanner, test lecture codes dégradés.",
    prerequisites: "Erreur scanner reproduite",
    tags: "scanner,matériel,douchette",
  },
  {
    kmCode: "KM-VLP-003",
    title: "Perte liaison réseau magasin",
    perimeter: "NETWORK",
    category: "RESEAU",
    content:
      "Ping passerelle, VLAN magasin, DNS, tests cablage rack caisse — escalade réseau si persistant.",
    prerequisites: "Symptômes réseau décrits",
    tags: "réseau,vlan,dns",
  },
  {
    kmCode: "KM-VLP-004",
    title: "Blocage impression ticket client",
    perimeter: "FO_VLP",
    category: "PRINT",
    content:
      "File spooler, test page Windows, driver imprimante thermique, alignement rouleau.",
    prerequisites: "Modèle imprimante",
    tags: "impression,thermique",
  },
  {
    kmCode: "KM-VLP-005",
    title: "Incident terminal paiement",
    perimeter: "FO_VLP",
    category: "TPE",
    content:
      "Recette TPE : reboot, test ligne, contrat acquéreur, substitution matériel selon stock.",
    prerequisites: "Code erreur TPE",
    tags: "tpe,paiement",
  },
  {
    kmCode: "KM-VLP-006",
    title: "Sync catalogue article lent",
    perimeter: "FO_VLP",
    category: "DATA",
    content:
      "Vérifier fenêtre sync, charge serveur régionale, relance job sync, logs middleware.",
    prerequisites: "Horodatage incident",
    tags: "sync,catalogue",
  },
  {
    kmCode: "KM-VLP-007",
    title: "Session caissier verrouillée",
    perimeter: "FO_VLP",
    category: "IAM",
    content:
      "Déverrouillage superviseur, reset session AD locale, contrôle politique mot de passe.",
    prerequisites: "Identité caissier",
    tags: "session,iam",
  },
  {
    kmCode: "KM-VLP-008",
    title: "Remontée anomalies inventaire",
    perimeter: "FO_VLP",
    category: "INV",
    content:
      "Extraction logs inventaire, réconciliation stock théorique / physique, purge caches.",
    prerequisites: "Référence inventaire",
    tags: "inventaire,stock",
  },
]

const TITLE_TEMPLATES = [
  "Caisse {reg} — erreur transaction intermittente",
  "Scanner ne lit pas les EAN sur caisse {reg}",
  "Coupure liaison HQ — magasin {store}",
  "Impression ticket client décalée",
  "Latence excessive ouverture vente",
  "TPE refuse carte sans contact",
  "Crash applicatif après mise à jour nocturne",
  "Doublon ticket inventaire — besoin clarification",
  "[URG] caisse {reg} HS intermitt.",
  "Pb sync — mag {store} (idem hier)",
  "VLP {reg} : latence + coupures wifi ???",
  "Doublon — cf CARE précédent même mag",
  "Escalade N3 demandée par mag — à valider",
]

const SHORT_COMMENTS = [
  "vu avec mag",
  "pas de capture",
  "idem hier",
  "?",
  "esc N3 ???",
  "transfert fw?",
  "scanner ou vlan pas clair",
  "besoin n° série",
]

async function truncateSimulator() {
  const sql = getSql()
  await sql.unsafe(`
    TRUNCATE TABLE
      carepilot.golden_test_cases,
      carepilot.similar_ticket_results,
      carepilot.km_recommendations,
      carepilot.decision_suggestions,
      carepilot.ticket_timeline_events,
      carepilot.ticket_analysis,
      carepilot.embeddings,
      carepilot.tickets,
      carepilot.sync_logs
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
    console.error("DATABASE_URL manquant")
    process.exit(1)
  }

  const db = getDb()
  await truncateSimulator()

  const rnd = mulberry32(42)

  console.log(`Seed: ${TICKET_COUNT} tickets synthétiques anonymisés FO VLP`)

  const cityPairs = [
    ["101", "Magasin Nord Alpha", "Lille"],
    ["102", "Magasin Est Beta", "Metz"],
    ["103", "Magasin Sud Gamma", "Toulouse"],
    ["104", "Magasin Ouest Delta", "Nantes"],
    ["105", "Magasin Centre Epsilon", "Lyon"],
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
  const categories = ["CAISSE", "RESEAU", "PERIPH", "PRINT", "TPE", "DATA"]

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

    let description = `Incident opérationnel FO VLP — ${title}. `
    description += hardwareHeavy
      ? "Symptômes matériels (USB/scanner/roller). "
      : ""
    description += networkHeavy
      ? "Symptômes réseau (latence, VLAN, perte paquets). "
      : ""
    description += ambiguousHwNw ? "Ambiguïté terrain : périf ou infra — qualification floue. " : ""
    description += `Contexte magasin ${storeCode}, caisse ${registerCode}. `
    description +=
      rnd() < 0.15
        ? "Libellé imprécis — besoin précisions terrain."
        : "Description détaillée disponible pour analyse."
    description += rnd() < 0.12 ? " Abrég. opérationnel — cf note magasin." : ""
    description += rnd() < 0.07 ? " Faute frappe volontaire dans libellé article (anomalie seed)." : ""

    if (i > 2 && rnd() < 0.04 && lastRichDescription.length > 40) {
      description =
        lastRichDescription.slice(0, Math.min(lastRichDescription.length - 20, 220)) +
        " … REPEAT / quasi-doublon même symptôme."
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
      finalAction = finalAction ?? "Transfer Hardware (demande mag — à valider)"
    }

    const demoSlot = i - 1 < DEMO_TICKETS_QUEUE.length ? DEMO_TICKETS_QUEUE[i - 1]! : undefined
    const careTicketId = demoSlot?.ticketId ?? `CARE-VLP-${String(i).padStart(6, "0")}`
    const seedTitle = demoSlot?.subject ?? title
    const seedDescription = demoSlot
      ? `${demoSlot.subject}. Alignement démo CAREPILOT — périmètre ${demoSlot.perimeter}.`
      : description
    const seedPerimeter = demoSlot
      ? demoSlot.perimeter.replace(/\s*\/\s*/g, "_").replace(/\s+/g, "")
      : "FO_VLP"

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
        storeCode: missingFieldsScenario ? "" : storeCode,
        cashRegisterCode: missingFieldsScenario && rnd() < 0.5 ? "" : registerCode,
        category: categories[Math.floor(rnd() * categories.length)]!,
        errorMessage: err || null,
        finalAction,
        finalReason: finalAction ? "Synthétique — résolution type PFE" : null,
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
          ? "cf historique — incident récurrent sur cette caisse."
          : "Merci de préciser capture écran erreur si possible."
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
        description: networkHeavy ? "Test ping passerelle magasin" : "Contrôle logs applicatifs caisse",
        result: rnd() < 0.4 ? "OK partiel" : "Non conclusif",
        performedBy: "N1_AGENT",
        createdAt: new Date(created.getTime() + 7200_000),
      })
    }

    if (appliedKm) {
      await db.insert(ticketActions).values({
        ticketId: tid,
        actionType: "KM_APPLY",
        description: `Application procédure ${appliedKm}`,
        result: rnd() < 0.35 ? "Échec après KM" : "OK",
        performedBy: "N2_AGENT",
        createdAt: new Date(created.getTime() + 10_800_000),
      })
    }

    if (i % 100 === 0) console.log(`  … ${i} tickets`)
  }

  console.log("Seed CARE Simulator terminé (care_source.*). Lancez POST /api/sync/care pour CAREPILOT.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
