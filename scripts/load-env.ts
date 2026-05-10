/**
 * Charge `.env` puis `.env.local` (override), comme Next.js — pour les scripts CLI (`tsx`).
 * Si toujours absent : même valeur que docker-compose.yml (PostgreSQL local).
 */
import { config } from "dotenv"
import { resolve } from "node:path"

const LOCAL_DOCKER_URL = "postgresql://carepilot:carepilot@localhost:5433/carepilot"

config({ path: resolve(process.cwd(), ".env") })
config({ path: resolve(process.cwd(), ".env.local"), override: true })

if (!process.env.DATABASE_URL?.trim()) {
  process.env.DATABASE_URL = LOCAL_DOCKER_URL
  console.warn(
    "[scripts] DATABASE_URL absent — utilisation de l’URL Docker locale par défaut. Copiez .env.example vers .env.local pour personnaliser.",
  )
}
