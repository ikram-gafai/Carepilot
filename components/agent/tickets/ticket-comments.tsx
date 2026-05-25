import type { InferSelectModel } from "drizzle-orm"

import { cpAgentTicketComments } from "@/lib/db/schema/cp-agent"

type CommentRow = InferSelectModel<typeof cpAgentTicketComments>

function formatDt(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d)
}

export function TicketComments({ comments }: { comments: CommentRow[] }) {
  if (!comments.length) {
    return <p className="text-xs text-muted-foreground">No comments.</p>
  }

  return (
    <ul className="space-y-3">
      {comments.map((c) => (
        <li key={c.id} className="border-b border-border/60 pb-3 last:border-0 last:pb-0">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <span className="text-xs font-semibold text-foreground">{c.authorName}</span>
            <time className="text-[11px] tabular-nums text-muted-foreground">{formatDt(c.createdAt)}</time>
          </div>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{c.authorRole}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground">{c.body}</p>
        </li>
      ))}
    </ul>
  )
}
