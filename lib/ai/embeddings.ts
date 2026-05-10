import { embedTextDeterministic, EMBEDDING_MODEL_MVP } from "@/lib/embeddings/deterministic"

export type EmbedClient = {
  modelName: string
  embed: (text: string) => Promise<number[]>
}

/** MVP: deterministic 384-dim vectors aligned with `carepilot.embeddings.embedding vector(384)`. Swap providers later without changing call sites. */
export function getEmbeddingClient(): EmbedClient {
  return {
    modelName: EMBEDDING_MODEL_MVP,
    embed: async (text: string) => embedTextDeterministic(text),
  }
}
