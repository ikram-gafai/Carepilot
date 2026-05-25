import { adminSurfaces } from "@/lib/admin-surface"

export function AdminCompactList({
  items,
}: {
  items: { id: string | number; title: string; detail?: string; meta?: string }[]
}) {
  return (
    <ul className={adminSurfaces.list}>
      {items.map((item) => (
        <li key={item.id} className="px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium text-zinc-800">{item.title}</p>
            {item.meta ? <span className="shrink-0 font-mono text-[10px] text-zinc-500">{item.meta}</span> : null}
          </div>
          {item.detail ? <p className="mt-1 text-[11px] leading-snug text-zinc-600">{item.detail}</p> : null}
        </li>
      ))}
    </ul>
  )
}
