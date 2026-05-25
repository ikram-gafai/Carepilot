/** Short, shared UI copy — avoid repeating long setup text on every page. */

export const DB_UNAVAILABLE_TITLE = "Database unavailable"

export function dbUnavailableDescription(reason: "offline" | "unavailable"): string {
  return reason === "offline" ? "Configure DATABASE_URL." : "Run database setup and seed."
}
