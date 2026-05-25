export function AdminUnavailable({
  reason,
}: {
  reason: "offline" | "unavailable"
}) {
  return (
    <div className="rounded-xl border border-border/90 bg-card p-3 shadow-sm dark:border-zinc-800 mx-4 mt-4">
      <p className="text-sm font-medium text-zinc-900">Operational data unavailable</p>
      <p className="mt-1 text-xs text-zinc-600">
        {reason === "offline"
          ? "Configure DATABASE_URL in your environment, then restart the application."
          : "Run bun run db:ensure-care-operational and bun run db:seed:care-operational, then bun run db:reset-care-sync before starting the dev server."}
      </p>
    </div>
  )
}
