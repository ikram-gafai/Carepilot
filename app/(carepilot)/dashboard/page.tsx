import { DashboardSummaryMetrics } from "@/components/dashboard-summary-metrics"
import { DashboardSyncedTicketsTable } from "@/components/dashboard-synced-tickets-table"
import { DashboardTicketsIaCharts } from "@/components/dashboard-tickets-ia-charts"
import { CarePilotSetHeader } from "@/components/carepilot-page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getDashboardMetrics } from "@/lib/queries/dashboard-metrics"

function pct(n: number) {
  return `${Math.round(n * 100)}%`
}

export default async function DashboardPage() {
  let metrics = null as Awaited<ReturnType<typeof getDashboardMetrics>> | null
  let error: string | null = null

  try {
    metrics = await getDashboardMetrics()
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
  }

  return (
    <div className="space-y-4">
      <CarePilotSetHeader title="Operational dashboard" />

      <DashboardSummaryMetrics demo metrics={metrics} />

      <DashboardTicketsIaCharts />

      <DashboardSyncedTicketsTable />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle className="text-sm">
            Base de données indisponible
          </AlertTitle>
          <AlertDescription className="space-y-2 text-xs">
            <p>{error}</p>
            <p>
              Démarrez Docker (
              <code className="rounded bg-muted px-1">
                docker compose up -d
              </code>
              ), puis{" "}
              <code className="rounded bg-muted px-1">bun run db:init</code>,{" "}
              <code className="rounded bg-muted px-1">bun run db:seed</code>, et{" "}
              <code className="rounded bg-muted px-1">POST /api/sync/care</code>
              .
            </p>
          </AlertDescription>
        </Alert>
      ) : null}

      {metrics ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Backlog actif"
              value={String(metrics.backlog)}
              hint="OPEN / IN_PROGRESS / WAITING_STORE"
            />
            <MetricCard
              title="SLA à risque (&lt; 8h)"
              value={String(metrics.slaAtRisk)}
              hint="fenêtre courte"
            />
            <MetricCard
              title="Escalade (source CARE)"
              value={pct(metrics.escalationRate)}
              hint="labels simulateur — erreurs possibles"
            />
            <MetricCard
              title="Transfert (source CARE)"
              value={pct(metrics.transferRate)}
              hint="périmètres matériel / réseau"
            />
            <MetricCard
              title="Infos manquantes"
              value={pct(metrics.missingInformationRate)}
              hint="tickets source flaggés"
            />
            <MetricCard
              title="Couverture reco KM"
              value={pct(metrics.kmRecommendationCoverage)}
              hint="≥ 1 reco"
            />
            <MetricCard
              title="Dernière sync"
              value={metrics.lastSync?.status ?? "—"}
              hint={
                metrics.lastSync?.finishedAt
                  ? new Date(metrics.lastSync.finishedAt).toLocaleString(
                      "fr-FR"
                    )
                  : "aucune exécution"
              }
            />
            <MetricCard
              title="Sync imports / maj"
              value={`${metrics.lastSync?.imported ?? 0} / ${metrics.lastSync?.updated ?? 0}`}
              hint="dernier batch terminé"
            />
          </div>

          <Card className="border-border bg-background shadow-none">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="text-sm font-semibold">
                Répartition par statut
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-9 text-xs">Statut</TableHead>
                    <TableHead className="h-9 text-right text-xs">
                      Volume
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(metrics.ticketsByStatus).map(
                    ([status, count]) => (
                      <TableRow key={status} className="text-xs">
                        <TableCell className="py-2 font-medium">
                          {status}
                        </TableCell>
                        <TableCell className="py-2 text-right tabular-nums">
                          {count}
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}

function MetricCard({
  title,
  value,
  hint,
}: {
  title: string
  value: string
  hint: string
}) {
  return (
    <Card className="border-border bg-background shadow-none">
      <CardHeader className="space-y-1 border-b border-border py-3">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="py-3">
        <div className="text-xl font-semibold tracking-tight tabular-nums">
          {value}
        </div>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          {hint}
        </p>
      </CardContent>
    </Card>
  )
}
