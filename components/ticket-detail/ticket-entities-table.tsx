import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function formatLabel(key: string): string {
  return key.replace(/_/g, " ")
}

export function TicketEntitiesTable({ entities }: { entities: Record<string, unknown> }) {
  const actions = entities.actions_already_performed
  const scalarEntries = Object.entries(entities).filter(([k]) => k !== "actions_already_performed")

  const formatValue = (v: unknown): string => {
    if (v === null || v === undefined || v === "") return "—"
    if (typeof v === "object") return JSON.stringify(v)
    return String(v)
  }

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-8 w-[38%] text-[11px]">Attribute</TableHead>
            <TableHead className="h-8 text-[11px]">Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scalarEntries.map(([key, val]) => (
            <TableRow key={key} className="text-[11px]">
              <TableCell className="py-1.5 align-top font-medium text-muted-foreground">
                {formatLabel(key)}
              </TableCell>
              <TableCell className="py-1.5 align-top text-[11px] leading-snug break-all">
                {formatValue(val)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {Array.isArray(actions) && actions.length > 0 ? (
        <div>
          <div className="mb-1 text-[11px] font-semibold text-muted-foreground">
            Actions already performed (source)
          </div>
          <ul className="list-inside list-decimal space-y-1 rounded border border-border bg-muted/20 p-2 text-[11px] leading-relaxed">
            {actions.slice(0, 14).map((a, i) => (
              <li key={i}>{String(a)}</li>
            ))}
            {actions.length > 14 ? (
              <li className="text-muted-foreground">… +{actions.length - 14} more</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
