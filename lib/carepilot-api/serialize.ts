/** Normalize ISO date strings from JSON API responses back to Date instances. */
export function parseDate(v: Date | string | null | undefined): Date | null {
  if (v == null) return null
  if (v instanceof Date) return v
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

export function parseTicketRow<T extends {
  slaDueAt?: Date | string | null
  createdAt?: Date | string
  updatedAt?: Date | string
  lastSyncedAt?: Date | string | null
}>(row: T) {
  return {
    ...row,
    slaDueAt: parseDate(row.slaDueAt),
    createdAt: parseDate(row.createdAt) ?? new Date(),
    updatedAt: parseDate(row.updatedAt) ?? new Date(),
    lastSyncedAt: parseDate(row.lastSyncedAt),
  }
}
