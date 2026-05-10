import { getSql } from "@/lib/db"

export type VectorHit = { sourceId: string; score: number }

function vecLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`
}

export async function searchSimilarTickets(params: {
  queryVector: number[]
  excludeTicketId: string
  limit: number
}): Promise<VectorHit[]> {
  const sql = getSql()
  const lit = vecLiteral(params.queryVector)
  const rows = (await sql.unsafe(
    `
      SELECT source_id::text AS sid,
             (1 - (embedding <=> '${lit}'::vector))::float8 AS score
      FROM carepilot.embeddings
      WHERE source_type = 'ticket'
        AND source_id <> $1
      ORDER BY embedding <=> '${lit}'::vector ASC
      LIMIT $2
    `,
    [params.excludeTicketId, params.limit],
  )) as Array<{ sid: string; score: number }>
  return rows.map((r) => ({ sourceId: r.sid, score: r.score }))
}

export async function searchKmProcedures(params: {
  queryVector: number[]
  limit: number
}): Promise<VectorHit[]> {
  const sql = getSql()
  const lit = vecLiteral(params.queryVector)
  const rows = (await sql.unsafe(
    `
      SELECT source_id::text AS sid,
             (1 - (embedding <=> '${lit}'::vector))::float8 AS score
      FROM carepilot.embeddings
      WHERE source_type = 'km_procedure'
      ORDER BY embedding <=> '${lit}'::vector ASC
      LIMIT $1
    `,
    [params.limit],
  )) as Array<{ sid: string; score: number }>
  return rows.map((r) => ({ sourceId: r.sid, score: r.score }))
}
