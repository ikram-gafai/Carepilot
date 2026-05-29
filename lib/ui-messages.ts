/** Messages UI partagés — français. */

export const DB_UNAVAILABLE_TITLE = "Base de données indisponible"

export function dbUnavailableDescription(reason: "offline" | "unavailable"): string {
  return reason === "offline" ? "Configurez DATABASE_URL." : "Exécutez la configuration et le seed de la base."
}