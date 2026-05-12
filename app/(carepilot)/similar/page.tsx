import Link from "next/link"

import { CarePilotSetHeader } from "@/components/carepilot-page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function SimilarTicketsPage() {
  return (
    <div className="space-y-3">
      <CarePilotSetHeader title="Similar Tickets" />
      <div>
        <p className="text-xs text-muted-foreground">
          La recherche sémantique est exécutée via PostgreSQL + pgvector après synchronisation.
        </p>
      </div>
      <Card className="border-border bg-background shadow-none">
        <CardHeader className="border-b border-border py-3">
          <CardTitle className="text-sm">Navigation</CardTitle>
        </CardHeader>
        <CardContent className="pb-3 pt-0 text-xs text-muted-foreground">
          Ouvrez un ticket dans la{" "}
          <Link href="/tickets" className="text-primary underline-offset-2 hover:underline">
            file Tickets FO VLP
          </Link>{" "}
          pour voir le panneau « Tickets similaires », les niveaux de confiance et la section « Pourquoi ? ».
        </CardContent>
      </Card>
    </div>
  )
}
