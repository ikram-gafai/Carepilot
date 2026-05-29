import "./load-env"

import { runPriorityPredictions } from "@/lib/ai/run-priority-predictions"

const result = await runPriorityPredictions()

console.log("Priority prediction batch complete:")
console.log(result)
