import "./load-env"

import { runMissingInformationAnalysis } from "@/lib/ai/run-missing-information-analysis"

const result = await runMissingInformationAnalysis()
console.log(result)
