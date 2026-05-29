import "./load-env"

import { runOperationalExplanations } from "@/lib/ai/run-llm-explanations"

const ticketIdArg = process.argv.find((a) => a.startsWith("--ticket-id="))
const ticketIds = ticketIdArg
  ? [Number(ticketIdArg.split("=")[1])].filter(Number.isFinite)
  : undefined

const result = await runOperationalExplanations({ ticketIds })
console.log(JSON.stringify(result, null, 2))
