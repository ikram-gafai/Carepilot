/**
 * Vérifie que PostgreSQL répond sur DATABASE_URL (scripts/load-env + fallback Docker).
 * Usage : bun run db:ping
 */
import "./load-env"

import postgres from "postgres"

async function main() {
  const url = process.env.DATABASE_URL
  if (!url?.trim()) {
    console.error("DATABASE_URL vide après chargement des fichiers d’environnement.")
    process.exit(1)
  }

  console.log("Connexion à :", maskUrl(url))

  const sql = postgres(url, { max: 1 })
  try {
    const rows = await sql`select now() as now, version() as version`
    const row = rows[0] as { now: Date; version: string }
    const { now, version } = row
    console.log("Statut : OK — base joignable.")
    console.log("Heure serveur :", now?.toISOString?.() ?? now)
    console.log("Version :", version?.split("\n")[0] ?? version)
  } catch (e) {
    console.error("Statut : ÉCHEC — impossible de se connecter ou d’exécuter la requête.")
    if (e instanceof Error) {
      console.error(e.message)
      if ("code" in e && (e as NodeJS.ErrnoException).code === "ECONNREFUSED") {
        console.error(
          "→ Rien n’écoute sur ce port : vérifiez `docker compose up -d` et que DATABASE_URL utilise le bon port (5433 avec le compose du dépôt).",
        )
      }
    } else {
      console.error(e)
    }
    process.exit(1)
  } finally {
    await sql.end({ timeout: 5 })
  }
}

function maskUrl(raw: string): string {
  try {
    const u = new URL(raw)
    if (u.password) u.password = "***"
    return u.toString()
  } catch {
    return "(URL non parseable)"
  }
}

main()
