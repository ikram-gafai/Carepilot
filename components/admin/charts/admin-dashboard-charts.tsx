/**
 * Legacy compact table helper; main dashboard uses shadcn Table inline.
 */

import type { adminStoreImpact } from "@/lib/admin/chart-data"

export type AdminStoreImpactRow = Awaited<ReturnType<typeof adminStoreImpact>>[number]

export function AdminStoreImpactTable({ stores }: { stores: AdminStoreImpactRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border shadow-none ring-1 ring-border/80">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted/40 text-[10px] font-semibold uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Store</th>
            <th className="px-3 py-2">Open</th>
            <th className="px-3 py-2">At risk</th>
            <th className="px-3 py-2">Esc</th>
            <th className="px-3 py-2">Trend</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/80">
          {stores.map((s) => (
            <tr key={s.store} className="hover:bg-muted/30">
              <td className="px-3 py-2 font-mono font-medium text-foreground">{s.store}</td>
              <td className="px-3 py-2 font-mono tabular-nums">{s.open}</td>
              <td className="px-3 py-2 font-mono tabular-nums">{s.atRisk}</td>
              <td className="px-3 py-2 font-mono tabular-nums">{s.esc}</td>
              <td className="px-3 py-2 font-mono tabular-nums text-muted-foreground">
                {s.trend != null ? `${s.trend >= 0 ? "+" : ""}${s.trend}%` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
