import { config } from "dotenv"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { defineConfig } from "drizzle-kit"

/** Repo-root `.env` / `.env.local` (same idea as `scripts/load-env.ts`) so Studio / push use this project’s DB. */
const projectRoot = dirname(fileURLToPath(import.meta.url))

config({ path: resolve(projectRoot, ".env"), override: true })
config({ path: resolve(projectRoot, ".env.local"), override: true })

const resolved =
  process.env.DATABASE_URL?.trim() || process.env.POSTGRES_DATABASE_URL?.trim()
if (!resolved) {
  process.env.DATABASE_URL = "postgresql://carepilot:carepilot@localhost:5433/carepilot"
} else if (!process.env.DATABASE_URL?.trim() && process.env.POSTGRES_DATABASE_URL?.trim()) {
  process.env.DATABASE_URL = process.env.POSTGRES_DATABASE_URL.trim()
}

const databaseUrl =
  process.env.DATABASE_URL?.trim() ||
  process.env.POSTGRES_DATABASE_URL?.trim() ||
  "postgresql://carepilot:carepilot@localhost:5433/carepilot"

export default defineConfig({
  schema: "./lib/db/schema/*.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
})
