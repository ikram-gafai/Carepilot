"use client"

import { PENDING_AI_TRAINING } from "@/lib/ai-phase"
import type { adminFeedbackSupervision } from "@/lib/queries/admin"
import { Card, CardContent } from "@/components/ui/card"
import { adminSurfaces } from "@/lib/admin-surface"
import { cn } from "@/lib/utils"

type Data = Awaited<ReturnType<typeof adminFeedbackSupervision>>

const cardClass = cn(adminSurfaces.card, "shadow-sm")

export function AdminFeedbackView({ data }: { data: Data }) {
  if ("pendingAiTraining" in data && data.pendingAiTraining) {
    return (
      <div className="mx-auto max-w-[1600px] p-4 pb-6">
        <Card className={cardClass}>
          <CardContent className="flex min-h-[16rem] flex-col items-center justify-center gap-2 px-6 py-12 text-center">
            <p className="text-base font-semibold text-foreground">{PENDING_AI_TRAINING}</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Agent feedback on AI recommendations will be available after the training phase.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
