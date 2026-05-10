import type { Db } from "@/lib/db"
import { getEmbeddingClient } from "@/lib/ai/embeddings"
import { kmProcedures } from "@/lib/db/schema/care-source"
import { embeddings } from "@/lib/db/schema/carepilot"

export async function ensureKmEmbeddings(db: Db) {
  const kms = await db.select().from(kmProcedures)
  const embedClient = getEmbeddingClient()

  for (const km of kms) {
    const text = `${km.title}\n${km.perimeter}\n${km.category}\n${km.content}\n${km.tags}`
    const v = await embedClient.embed(text)

    await db
      .insert(embeddings)
      .values({
        sourceType: "km_procedure",
        sourceId: String(km.id),
        embedding: v,
        modelName: embedClient.modelName,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [embeddings.sourceType, embeddings.sourceId, embeddings.modelName],
        set: {
          embedding: v,
          updatedAt: new Date(),
        },
      })
  }
}
