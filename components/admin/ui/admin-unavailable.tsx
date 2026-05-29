export function AdminUnavailable({
  reason,
}: {
  reason: "offline" | "unavailable"
}) {
  return (
    <p className="p-4 text-sm text-muted-foreground">
      {reason === "offline"
        ? "Base de données hors ligne — configurez DATABASE_URL."
        : "Données indisponibles — exécutez db:seed:care-operational puis db:reset-care-sync."}
    </p>
  )
}
