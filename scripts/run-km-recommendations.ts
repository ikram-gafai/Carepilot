import "./load-env"

import { runKmRecommendations } from "@/lib/ai/run-km-recommendations"

const result = await runKmRecommendations()

console.log("KM recommendation batch complete:")
console.log(result)
