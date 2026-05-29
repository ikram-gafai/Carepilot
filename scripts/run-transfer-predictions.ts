import "./load-env"

import { runTransferPredictions } from "@/lib/ai/run-transfer-predictions"

const result = await runTransferPredictions()

console.log("Transfer prediction batch complete:")
console.log(result)
