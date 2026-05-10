import { config } from "dotenv"
import { resolve } from "node:path"

import { defineConfig } from "drizzle-kit"

/** Même chargement que les scripts CLI (.env puis .env.local). */
config({ path: resolve(process.cwd(), ".env") })
config({ path: resolve(process.cwd(), ".env.local"), override: true })

const databaseUrl =
  process.env.DATABASE_URL?.trim() ||
  "postgresql://carepilot:carepilot@localhost:5433/carepilot"

export default defineConfig({
  schema: "./lib/db/schema/*.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
})
