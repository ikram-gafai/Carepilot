import { readFileSync } from "node:fs"
import { join } from "node:path"

import "./load-env"

import {
  generateMlTrainingDataset,
  type NoiseLevel,
} from "@/lib/ml-training/dataset-generator"
import { getDb, getSql } from "@/lib/db"
import {
  mlTrainingDatasetExports,
  mlTrainingDatasetMetadata,
  mlTrainingHistoricalActions,
  mlTrainingHistoricalResolutions,
  mlTrainingHistoricalTickets,
  mlTrainingKmArticles,
  mlTrainingModelPredictions,
} from "@/lib/db/schema/ml-training"

function argValue(name: string) {
  const prefix = `--${name}=`
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length)
}

function parseNoiseLevel(raw: string | undefined): NoiseLevel {
  if (raw === "low" || raw === "medium" || raw === "high") return raw
  return "medium"
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

async function insertBatches<T>(items: T[], batchSize: number, insert: (batch: T[]) => Promise<unknown>) {
  for (const batch of chunk(items, batchSize)) {
    await insert(batch)
  }
}

async function main() {
  const total = Number(argValue("size") ?? process.env.ML_TRAINING_SIZE ?? 14000)
  const seed = Number(argValue("seed") ?? process.env.ML_TRAINING_SEED ?? 20260525)
  const noiseLevel = parseNoiseLevel(argValue("noise") ?? process.env.ML_TRAINING_NOISE)
  // The generator derives timestamps (and, through hour-of-day branches, the number of PRNG draws)
  // from `generatedAt`. Pinning it (plus TZ=UTC) makes the dataset a pure function of the seed.
  // Default stays `new Date()` so existing behaviour is unchanged.
  const generatedAtRaw = argValue("generated-at") ?? process.env.ML_TRAINING_GENERATED_AT
  const generatedAt = generatedAtRaw ? new Date(generatedAtRaw) : undefined
  if (generatedAt && Number.isNaN(generatedAt.getTime())) {
    throw new Error(`Invalid --generated-at / ML_TRAINING_GENERATED_AT value: ${generatedAtRaw}`)
  }

  const sql = getSql()
  const ddl = readFileSync(join(process.cwd(), "sql", "ensure-ml-training.sql"), "utf8")
  await sql.unsafe(ddl)
  // `missing_information_labels` is inserted below but only created by patch 020; apply it so a
  // fresh database can be seeded in one step (the patch is idempotent).
  const missingInfoPatch = readFileSync(
    join(process.cwd(), "sql", "patches", "020_ml_training_missing_information_labels.sql"),
    "utf8",
  )
  await sql.unsafe(missingInfoPatch)

  const db = getDb()
  const dataset = generateMlTrainingDataset({ size: total, seed, noiseLevel, generatedAt })

  await sql`
    TRUNCATE
      ml_training.model_predictions,
      ml_training.dataset_exports,
      ml_training.historical_resolutions,
      ml_training.historical_actions,
      ml_training.km_articles,
      ml_training.dataset_metadata,
      ml_training.historical_tickets
    RESTART IDENTITY CASCADE
  `

  await insertBatches(dataset.tickets, 500, (batch) =>
    db.insert(mlTrainingHistoricalTickets).values(
      batch.map((t) => ({
        ticketId: t.ticketId,
        title: t.title,
        description: t.description,
        perimeter: t.perimeter,
        priority: t.priority,
        status: t.status,
        storeId: t.storeId,
        storeName: t.storeName,
        city: t.city,
        region: t.region,
        assignedTeam: t.assignedTeam,
        createdAt: t.createdAt,
        resolvedAt: t.resolvedAt,
        resolutionTimeMinutes: t.resolutionTimeMinutes,
        slaBreached: t.slaBreached,
        ticketAgeMinutes: t.ticketAgeMinutes,
        queueLoad: t.queueLoad,
        storeSize: t.storeSize,
        operationalComplexity: t.operationalComplexity,
        escalationRequired: t.escalationRequired,
        transferRequired: t.transferRequired,
        recommendedAction: t.recommendedAction,
        incidentCategory: t.incidentCategory,
        environmentType: t.environmentType,
        ticketSource: t.ticketSource,
        resolutionSummary: t.resolutionSummary,
        finalResolutionStatus: t.finalResolutionStatus,
        split: t.split,
        noiseLevel: t.noiseLevel,
        rawText: t.rawText,
        cleanedText: t.cleanedText,
        vectorizationText: t.vectorizationText,
        expectedKmId: t.expectedKmId,
        relevantKmIds: t.relevantKmIds,
        similarCaseGroupId: t.similarCaseGroupId,
        incidentCluster: t.incidentCluster,
        semanticGroup: t.semanticGroup,
        incidentFamily: t.incidentFamily,
        rootCauseFamily: t.rootCauseFamily,
        resolutionPattern: t.resolutionPattern,
      })),
    ),
  )

  await insertBatches(dataset.actions, 800, (batch) =>
    db.insert(mlTrainingHistoricalActions).values(
      batch.map((a) => ({
        ticketId: a.ticketId,
        actionType: a.actionType,
        previousStatus: a.previousStatus,
        newStatus: a.newStatus,
        assignedGroup: a.assignedGroup,
        timestamp: a.timestamp,
        actionAuthor: a.actionAuthor,
      })),
    ),
  )

  await insertBatches(dataset.resolutions, 600, (batch) =>
    db.insert(mlTrainingHistoricalResolutions).values(
      batch.map((r) => ({
        ticketId: r.ticketId,
        resolutionSummary: r.resolutionSummary,
        resolutionCategory: r.resolutionCategory,
        closureReason: r.closureReason,
        solvedByTeam: r.solvedByTeam,
        resolutionType: r.resolutionType,
        fixDurationMinutes: r.fixDurationMinutes,
      })),
    ),
  )

  await db.insert(mlTrainingKmArticles).values(
    dataset.kmArticles.map((km) => ({
      kmCode: km.kmId,
      title: km.title,
      procedureSteps: km.procedureSteps,
      perimeter: km.perimeter,
      incidentCategory: km.incidentCategory,
      keywords: km.keywords,
      difficultyLevel: km.difficultyLevel,
      applicabilityScore: km.applicabilityScore,
    })),
  )

  await db.insert(mlTrainingDatasetMetadata).values({
    datasetName: dataset.metadata.datasetName,
    generatedAt: dataset.metadata.generatedAt,
    totalTickets: dataset.metadata.totalTickets,
    noiseLevel: dataset.metadata.noiseLevel,
    seed: dataset.metadata.seed,
    splitRatios: dataset.metadata.splitRatios,
    classDistributions: dataset.metadata.classDistributions,
    missingness: dataset.metadata.missingness,
    uniqueStores: dataset.metadata.uniqueStores,
    uniqueCategories: dataset.metadata.uniqueCategories,
    validationStatus: dataset.metadata.validationStatus,
    validationWarnings: dataset.metadata.validationWarnings,
  })

  await insertBatches(dataset.exports, 1_000, (batch) =>
    db.insert(mlTrainingDatasetExports).values(
      batch.map((e) => ({
        exportType: e.exportType,
        split: e.split,
        ticketId: e.ticketId,
        textPayload: e.textPayload,
        labelPayload: e.labelPayload,
      })),
    ),
  )

  // Keep the predictions table intentionally empty. It is for future benchmarking outputs.
  await db.delete(mlTrainingModelPredictions)
  await sql.end({ timeout: 5 })

  console.log(
    `ml_training seeded: ${dataset.tickets.length} tickets, ${dataset.actions.length} actions, ${dataset.resolutions.length} resolutions, ${dataset.kmArticles.length} KM articles, ${dataset.exports.length} export rows.`,
  )
  console.log(`noise=${noiseLevel}, seed=${seed}, validation=${dataset.metadata.validationStatus}`)
  if (dataset.metadata.validationWarnings.length > 0) {
    console.warn(dataset.metadata.validationWarnings.join("\n"))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
