import { adminAlignmentLabel, loadOrchestratedAdminContext } from "@/lib/admin/orchestrated-supervision"

/** Supervision retours agent + alignement décisionnel (même source que l'agent). */
export async function adminFeedbackSupervision() {
  const ctx = await loadOrchestratedAdminContext()

  return {
    summary: ctx.decisionFeedback,
    diagnostics: ctx.diagnostics,
    coverage: ctx.coverage,
    feedbackRows: ctx.feedbackRows.map((row) => ({
      ...row,
      alignmentLabel: adminAlignmentLabel(row.alignmentStatus),
      helpfulLabel:
        row.helpful === true ? "Utile" : row.helpful === false ? "Peu utile" : "—",
    })),
    recommendationRows: ctx.recommendationRows.slice(0, 50).map((row) => ({
      ...row,
      alignmentLabel: adminAlignmentLabel(row.alignmentStatus),
    })),
  }
}
