export const OPERATIONAL_EXPLANATION_SECTION_TITLE = "Synthèse opérationnelle"

export function formatExplanationModelLabel(modelName: string): string {
  if (modelName === "carepilot-template-fallback") return "Template fallback (Ollama offline)"
  if (modelName.startsWith("mistral")) return "Mistral (Ollama local)"
  if (modelName.startsWith("llama3")) return "Llama 3 (Ollama local)"
  if (modelName.includes("deepseek")) return "DeepSeek R1 Distill (Ollama local)"
  return modelName
}

export function formatLatencyMs(ms: number): string {
  if (ms <= 0) return "Instant (template)"
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(1)} s`
}
