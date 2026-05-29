/** Local Ollama HTTP client — Task 9 (free, no paid APIs). */

export type OllamaGenerateOptions = {
  model: string
  prompt: string
  system?: string
  temperature?: number
  numPredict?: number
}

export type OllamaGenerateResult = {
  response: string
  latencyMs: number
  model: string
}

export function getOllamaBaseUrl(): string {
  return process.env.OLLAMA_BASE_URL ?? "http://localhost:11434"
}

export function getOllamaExplanationModel(): string {
  return process.env.OLLAMA_EXPLANATION_MODEL ?? "mistral"
}

export async function isOllamaAvailable(baseUrl = getOllamaBaseUrl()): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function listOllamaModels(baseUrl = getOllamaBaseUrl()): Promise<string[]> {
  try {
    const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return []
    const json = (await res.json()) as { models?: Array<{ name: string }> }
    return (json.models ?? []).map((m) => m.name)
  } catch {
    return []
  }
}

export async function ollamaGenerate(opts: OllamaGenerateOptions): Promise<OllamaGenerateResult> {
  const baseUrl = getOllamaBaseUrl()
  const start = performance.now()
  const res = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opts.model,
      prompt: opts.prompt,
      system: opts.system,
      stream: false,
      options: {
        temperature: opts.temperature ?? 0.15,
        num_predict: opts.numPredict ?? 420,
      },
    }),
    signal: AbortSignal.timeout(120_000),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Ollama generate failed (${opts.model}): ${res.status} ${err}`)
  }

  const json = (await res.json()) as { response?: string }
  const latencyMs = Math.round(performance.now() - start)
  return {
    response: (json.response ?? "").trim(),
    latencyMs,
    model: opts.model,
  }
}
