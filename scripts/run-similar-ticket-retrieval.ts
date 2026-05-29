import "./load-env"

import { runSimilarTicketRetrieval } from "@/lib/ai/run-similar-ticket-retrieval"

const result = await runSimilarTicketRetrieval()

console.log("Similar ticket retrieval batch complete:")
console.log(result)
