import "./load-env"

import { runActionRecommendations } from "@/lib/ai/run-action-recommendations"
import { runEscalationPredictions } from "@/lib/ai/run-escalation-predictions"
import { runKmRecommendations } from "@/lib/ai/run-km-recommendations"
import { runMissingInformationAnalysis } from "@/lib/ai/run-missing-information-analysis"
import { runPriorityPredictions } from "@/lib/ai/run-priority-predictions"
import { runSlaPredictions } from "@/lib/ai/run-sla-predictions"
import { runTransferPredictions } from "@/lib/ai/run-transfer-predictions"

const steps = [
  { name: "escalation", run: runEscalationPredictions },
  { name: "transfer", run: runTransferPredictions },
  { name: "action", run: runActionRecommendations },
  { name: "sla", run: runSlaPredictions },
  { name: "priority", run: runPriorityPredictions },
  { name: "km", run: runKmRecommendations, optional: true },
  { name: "missing-information", run: runMissingInformationAnalysis },
] as const

console.log("Running AI batch for all synchronized CARE tickets…\n")

for (const step of steps) {
  const started = Date.now()
  try {
    const result = await step.run()
    const elapsed = ((Date.now() - started) / 1000).toFixed(1)
    console.log(`✓ ${step.name} (${elapsed}s)`)
    console.log(result)
  } catch (e) {
    const elapsed = ((Date.now() - started) / 1000).toFixed(1)
    if ("optional" in step && step.optional) {
      console.log(`⚠ ${step.name} skipped (${elapsed}s): ${e instanceof Error ? e.message : String(e)}`)
    } else {
      throw e
    }
  }
  console.log("")
}

console.log("AI batch complete. Run `bun run ai:llm-explanations:run` separately for LLM explanations (requires Ollama).")
