import { sql } from "drizzle-orm"

import type { Db } from "@/lib/db"

/** Reconcile cp_agent store columns from care_source (fixes stale labels after catalog changes). */
export async function refreshCpAgentStoreFieldsFromCare(db: Db): Promise<number> {
  const result = await db.execute(sql`
    UPDATE cp_agent.tickets AS t
    SET
      store_id = s.id,
      store_code = s.store_code,
      store_name = s.store_name,
      store_city = s.city,
      store_region = s.region,
      store_type = s.store_type,
      updated_at = NOW()
    FROM care_source.tickets AS c
    INNER JOIN care_source.stores AS s ON c.store_id = s.id
    WHERE t.source = 'CARE'
      AND (t.care_id = c.care_ticket_id OR t.external_id = c.care_ticket_id)
      AND (
        t.store_id IS DISTINCT FROM s.id
        OR t.store_code IS DISTINCT FROM s.store_code
        OR t.store_name IS DISTINCT FROM s.store_name
        OR t.store_city IS DISTINCT FROM s.city
        OR t.store_region IS DISTINCT FROM s.region
        OR t.store_type IS DISTINCT FROM s.store_type
      )
  `)
  return Number(result.count ?? 0)
}
