import { adminSurfaces } from "@/lib/admin-surface"
import { cn } from "@/lib/utils"

export function AdminTableWrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn(adminSurfaces.tableWrap, className)}>{children}</div>
}

export const adminTableHeadClass = adminSurfaces.tableHead
export const adminTableHeaderRowClass = adminSurfaces.tableRow
export const adminTableBodyRowClass = adminSurfaces.tableBodyRow
export const adminTableHeadCellClass = "h-9 text-[10px] font-semibold uppercase text-zinc-500"
