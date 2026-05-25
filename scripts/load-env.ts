/**
 * Load `.env` then `.env.local` from the repo root (not only `cwd`),
 * with override so files win over empty or stale environment variables.
 * If still missing: same default as docker-compose.yml (local PostgreSQL).
 */
import { config } from "dotenv"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const LOCAL_DOCKER_URL = "postgresql://carepilot:carepilot@localhost:5433/carepilot"

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")

config({ path: resolve(projectRoot, ".env"), override: true })
config({ path: resolve(projectRoot, ".env.local"), override: true })

const resolved =
  process.env.DATABASE_URL?.trim() || process.env.POSTGRES_DATABASE_URL?.trim()
if (!resolved) {
  process.env.DATABASE_URL = LOCAL_DOCKER_URL
  console.warn(
    "[scripts] DATABASE_URL / POSTGRES_DATABASE_URL missing — using default local Docker URL. Copy .env.example to .env.local to customize.",
  )
} else if (!process.env.DATABASE_URL?.trim() && process.env.POSTGRES_DATABASE_URL?.trim()) {
  process.env.DATABASE_URL = process.env.POSTGRES_DATABASE_URL.trim()
}
