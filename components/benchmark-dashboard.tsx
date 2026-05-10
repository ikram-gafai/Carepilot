"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { BenchmarkReport } from "@/lib/benchmark/report"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function pct(n: number) {
  return `${Math.round(n * 100)}%`
}

export function BenchmarkDashboard({ report }: { report: BenchmarkReport }) {
  const chartData = report.precisionAtK.map((p) => ({
    k: `@${p.k}`,
    value: Math.round(p.km_hit_rate * 1000) / 10,
  }))

  const confusion = report.confusionEscalation

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] text-muted-foreground">
          Vue administrative — métriques plafonnées à 95 %. Généré :{" "}
          <span className="tabular-nums">{new Date(report.generatedAt).toLocaleString("fr-FR")}</span>
        </p>
        {report.note ? (
          <p className="mt-2 rounded border border-dashed border-border bg-muted/30 p-2 text-[11px] text-muted-foreground">
            {report.note}
          </p>
        ) : null}
      </div>

      {Object.keys(report.metrics).length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          {Object.entries(report.metrics).map(([key, val]) => (
            <Card key={key} className="border-border bg-background shadow-none">
              <CardHeader className="border-b border-border py-2">
                <CardTitle className="text-[11px] font-medium capitalize text-muted-foreground">
                  {key.replace(/_/g, " ")}
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="text-lg font-semibold tabular-nums">{pct(val)}</div>
                <p className="mt-0.5 text-[10px] text-muted-foreground">≤ 95 % (règle MVP)</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border bg-background shadow-none">
          <CardHeader className="border-b border-border py-3">
            <CardTitle className="text-sm">Retrieval KM — precision@k</CardTitle>
          </CardHeader>
          <CardContent className="h-[220px] pt-3">
            {chartData.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">Pas de données golden KM.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis dataKey="k" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 95]} tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip
                    formatter={(value) => [`${Number(value ?? 0)}%`, "Hit rate"]}
                    contentStyle={{ fontSize: 11 }}
                  />
                  <Bar dataKey="value" fill="#64748b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-background shadow-none">
          <CardHeader className="border-b border-border py-3">
            <CardTitle className="text-sm">Comparaison modèles (MVP vs réserve V1)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-9 text-xs">Modèle</TableHead>
                  {report.modelComparison.columns.map((c) => (
                    <TableHead key={c} className="h-9 text-right text-xs">
                      {c.replace(/_/g, " ")}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.modelComparison.rows.map((row) => (
                  <TableRow key={row.model} className="text-xs">
                    <TableCell className="py-2 font-medium">{row.model}</TableCell>
                    <TableCell className="py-2 text-right tabular-nums">{pct(row.entity_quality)}</TableCell>
                    <TableCell className="py-2 text-right tabular-nums">{pct(row.km_p_at_3)}</TableCell>
                    <TableCell className="py-2 text-right tabular-nums">{pct(row.decision_f1_proxy)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-background shadow-none">
        <CardHeader className="border-b border-border py-3">
          <CardTitle className="text-sm">Matrice confusion — buckets escalade/transfert (rule-based)</CardTitle>
          <p className="text-[11px] font-normal text-muted-foreground">{confusion.note}</p>
        </CardHeader>
        <CardContent className="overflow-x-auto py-3">
          {confusion.labels.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Pas de décisions golden à comparer.</p>
          ) : (
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr>
                  <th className="border border-border bg-muted/40 p-1 text-left font-medium">
                    Or → Est.
                  </th>
                  {confusion.labels.map((lab) => (
                    <th
                      key={lab}
                      className="border border-border bg-muted/40 p-1 text-center font-normal capitalize"
                    >
                      {lab.replace(/_/g, " ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {confusion.labels.map((rowLab, ri) => (
                  <tr key={rowLab}>
                    <td className="border border-border bg-muted/30 p-1 font-medium capitalize">
                      {rowLab.replace(/_/g, " ")}
                    </td>
                    {confusion.labels.map((_, ci) => {
                      const v = confusion.matrix[ri]?.[ci] ?? 0
                      return (
                        <td
                          key={ci}
                          className={
                            v > 0
                              ? "border border-border bg-muted/70 p-1 text-center text-xs font-medium tabular-nums"
                              : "border border-border p-1 text-center text-xs tabular-nums text-muted-foreground"
                          }
                        >
                          {v}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <p className="text-[10px] text-muted-foreground">
        Jeu golden : {report.counts.golden} cas — extraction / retrieval / décision évalués sans modèle ML entraîné.
      </p>
    </div>
  )
}
