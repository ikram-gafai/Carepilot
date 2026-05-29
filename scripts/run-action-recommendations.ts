import "./load-env"

import { runActionRecommendations } from "@/lib/ai/run-action-recommendations"

const result = await runActionRecommendations()

console.log("Action recommendation batch complete:")
console.log(result)
