import { BenchmarkDashboard } from "@/components/benchmark-dashboard"
import {
  type BenchmarkReport,
  buildBenchmarkReport,
  offlineBenchmarkReport,
} from "@/lib/benchmark/report"
import { getDb } from "@/lib/db"

export default async function BenchmarksPage() {
  let report: BenchmarkReport
  try {
    report = await buildBenchmarkReport(getDb())
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    report = offlineBenchmarkReport(msg)
  }
  return <BenchmarkDashboard report={report} />
}
