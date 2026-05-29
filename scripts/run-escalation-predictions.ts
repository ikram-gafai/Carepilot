import "./load-env"

import { runEscalationPredictions } from "@/lib/ai/run-escalation-predictions"

const result = await runEscalationPredictions()

console.log("Escalation prediction batch complete:")
console.log(result)
