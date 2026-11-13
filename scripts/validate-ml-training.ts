import "./load-env"

import { getDb, getSql } from "@/lib/db"
import {
  mlTrainingHistoricalTickets,
  mlTrainingKmArticles,
} from "@/lib/db/schema/ml-training"
import {
  validateMlTrainingDataset,
  type HistoricalTicketSeed,
  type KmArticleSeed,
} from "@/lib/ml-training/dataset-generator"

function printSection(title: string, value: unknown) {
  console.log(`\n--- ${title} ---`)
  console.log(JSON.stringify(value, null, 2))
}

async function main() {
  const db = getDb()
  const [tickets, kmArticles] = await Promise.all([
    db.select().from(mlTrainingHistoricalTickets),
    db.select().from(mlTrainingKmArticles),
  ])

  const summary = validateMlTrainingDataset(
    tickets.map((t) => ({
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
      recommendedAction: t.recommendedAction as HistoricalTicketSeed["recommendedAction"],
      incidentCategory: t.incidentCategory,
      environmentType: t.environmentType,
      ticketSource: t.ticketSource,
      resolutionSummary: t.resolutionSummary,
      finalResolutionStatus: t.finalResolutionStatus,
      split: t.split as HistoricalTicketSeed["split"],
      noiseLevel: t.noiseLevel as HistoricalTicketSeed["noiseLevel"],
      rawText: t.rawText ?? "",
      cleanedText: t.cleanedText ?? "",
      vectorizationText: t.vectorizationText ?? "",
      expectedKmId: t.expectedKmId,
      relevantKmIds: t.relevantKmIds,
      similarCaseGroupId: t.similarCaseGroupId ?? "",
      incidentCluster: t.incidentCluster ?? "",
      semanticGroup: t.semanticGroup ?? "",
      incidentFamily: t.incidentFamily ?? "",
      rootCauseFamily: t.rootCauseFamily ?? "",
      resolutionPattern: t.resolutionPattern ?? "",
    })) satisfies HistoricalTicketSeed[],
    kmArticles.map((km) => ({
      kmId: km.kmCode,
      title: km.title,
      procedureSteps: km.procedureSteps,
      perimeter: km.perimeter,
      incidentCategory: km.incidentCategory,
      keywords: km.keywords,
      difficultyLevel: km.difficultyLevel,
      applicabilityScore: km.applicabilityScore,
    })) satisfies KmArticleSeed[],
  )

  console.log("ML training dataset validation")
  console.log(`Status: ${summary.status.toUpperCase()}`)
  console.log(`Total tickets: ${summary.totalTickets}`)
  console.log(`Unique stores: ${summary.uniqueStores}`)
  console.log(`Unique categories: ${summary.uniqueCategories}`)
  console.log(`KM articles: ${summary.kmArticles}`)
  console.log(`Average description length: ${summary.averageDescriptionLength}`)

  printSection("Escalation distribution", summary.escalationDistribution)
  printSection("Transfer distribution", summary.transferDistribution)
  printSection("SLA breached distribution", summary.slaBreachedDistribution)
  printSection("Priority distribution", summary.priorityDistribution)
  printSection("Perimeter distribution", summary.perimeterDistribution)
  printSection("Split distribution", summary.splitDistribution)
  printSection("Missing values", {
    counts: summary.missingValues,
    percentages: summary.missingPercentages,
  })

  if (summary.warnings.length > 0) {
    printSection("Validation warnings", summary.warnings)
  }

  await getSql().end({ timeout: 5 })
  if (summary.status === "fail") process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
