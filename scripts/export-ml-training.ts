import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import "./load-env"

import { and, eq } from "drizzle-orm"

import { getDb, getSql } from "@/lib/db"
import { mlTrainingDatasetExports } from "@/lib/db/schema/ml-training"

type ExportType = "raw_text" | "cleaned_text" | "vectorization_ready"
type Split = "train" | "validation" | "test" | "all"

function argValue(name: string) {
  const prefix = `--${name}=`
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length)
}

function parseExportType(raw: string | undefined): ExportType {
  if (raw === "raw_text" || raw === "cleaned_text" || raw === "vectorization_ready") return raw
  return "raw_text"
}

function parseSplit(raw: string | undefined): Split {
  if (raw === "train" || raw === "validation" || raw === "test" || raw === "all") return raw
  return "all"
}

async function main() {
  const exportType = parseExportType(argValue("type"))
  const split = parseSplit(argValue("split"))
  const db = getDb()

  const where =
    split === "all"
      ? eq(mlTrainingDatasetExports.exportType, exportType)
      : and(
          eq(mlTrainingDatasetExports.exportType, exportType),
          eq(mlTrainingDatasetExports.split, split),
        )

  const rows = await db
    .select()
    .from(mlTrainingDatasetExports)
    .where(where)

  const outDir = join(process.cwd(), "exports", "ml-training")
  mkdirSync(outDir, { recursive: true })
  const outPath = join(outDir, `${exportType}-${split}.jsonl`)
  const body = rows
    .map((r) =>
      JSON.stringify({
        ticket_id: r.ticketId,
        split: r.split,
        text: r.textPayload,
        labels: r.labelPayload,
      }),
    )
    .join("\n")
  writeFileSync(outPath, body ? `${body}\n` : "", "utf8")
  await getSql().end({ timeout: 5 })
  console.log(`Exported ${rows.length} rows to ${outPath}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
