import "./load-env"

import { runSlaPredictions } from "@/lib/ai/run-sla-predictions"

const result = await runSlaPredictions()

console.log("SLA prediction batch complete:")
console.log(result)
