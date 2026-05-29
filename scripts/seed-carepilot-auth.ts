import "./load-env"

import { hashPassword } from "@/lib/auth/password"
import { getDb, getSql } from "@/lib/db"
import { SUPPORT_AGENT_DEPARTMENT, SUPPORT_AGENTS } from "@/lib/data/support-agents"
import { carepilotUserPreferences, carepilotUsers } from "@/lib/db/schema/carepilot"

const DEFAULT_AGENT_PASSWORD =
  process.env.CAREPILOT_AUTH_SEED_PASSWORD?.trim() || "CarePilot2026!"

async function ensureAuthTables() {
  const sql = getSql()
  await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS carepilot`)
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS carepilot.users (
      id SERIAL PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      avatar_url TEXT,
      role TEXT NOT NULL,
      department TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS carepilot.sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES carepilot.users (id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS carepilot_sessions_user_id_idx ON carepilot.sessions (user_id)
  `)
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS carepilot.user_preferences (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES carepilot.users (id) ON DELETE CASCADE,
      theme TEXT NOT NULL DEFAULT 'light',
      compact_mode BOOLEAN NOT NULL DEFAULT false,
      notifications_enabled BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
}

const adminUsers = [
  {
    firstName: "Khalid",
    lastName: "AS",
    email: "khalid.as@carrefour.internal",
    role: "Admin" as const,
    department: SUPPORT_AGENT_DEPARTMENT,
    password: DEFAULT_AGENT_PASSWORD,
    lastLoginAt: new Date("2026-05-29T08:15:00+02:00"),
  },
] as const

async function main() {
  await ensureAuthTables()
  const sql = getSql()
  await sql.unsafe(`
    TRUNCATE TABLE carepilot.user_preferences, carepilot.sessions, carepilot.users
    RESTART IDENTITY CASCADE
  `)

  const db = getDb()
  const seedUsers = [
    ...SUPPORT_AGENTS.map((agent) => ({
      firstName: agent.firstName,
      lastName: agent.lastName,
      email: agent.email,
      role: agent.authRole,
      department: agent.department,
      password: DEFAULT_AGENT_PASSWORD,
      lastLoginAt: new Date(agent.demoLastLoginAt),
    })),
    ...adminUsers,
  ]

  for (const u of seedUsers) {
    const [row] = await db
      .insert(carepilotUsers)
      .values({
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        passwordHash: hashPassword(u.password),
        role: u.role,
        department: u.department,
        status: "active",
        lastLoginAt: u.lastLoginAt ?? null,
      })
      .returning({ id: carepilotUsers.id })

    await db.insert(carepilotUserPreferences).values({
      userId: row!.id,
      theme: "light",
      compactMode: false,
      notificationsEnabled: true,
    })
  }

  console.log(`CarePilot auth seeded (${seedUsers.length} users, ${SUPPORT_AGENTS.length} support agents).`)
  console.log("")
  console.log("Agent — Ikram Gafai:")
  console.log("  ikram.gafai@carrefour.internal")
  console.log(`  Password: ${DEFAULT_AGENT_PASSWORD}`)
  console.log("")
  console.log("Admin — Khalid AS (owner):")
  console.log("  khalid.as@carrefour.internal")
  console.log(`  Password: ${DEFAULT_AGENT_PASSWORD}`)
  console.log("")
  console.log("Other support agents (shared password unless CAREPILOT_AUTH_SEED_PASSWORD set):")
  for (const agent of SUPPORT_AGENTS.filter((a) => a.email !== "ikram.gafai@carrefour.internal")) {
    console.log(`  ${agent.email} (${agent.authRole})`)
  }
  console.log(`  Password: ${DEFAULT_AGENT_PASSWORD}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
