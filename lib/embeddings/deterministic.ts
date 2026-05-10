const DIM = 384

/** Deterministic pseudo-embedding for local dev / CI when no API key is configured. */
export function embedTextDeterministic(text: string): number[] {
  const v = new Array<number>(DIM).fill(0)
  const norm = text.toLowerCase()
  for (let i = 0; i < norm.length; i++) {
    const j = i % DIM
    v[j] += norm.charCodeAt(i) / 255
  }
  let mag = 0
  for (const x of v) mag += x * x
  mag = Math.sqrt(mag) || 1
  return v.map((x) => x / mag)
}

export const EMBEDDING_MODEL_MVP = "carepilot-deterministic-v1"
