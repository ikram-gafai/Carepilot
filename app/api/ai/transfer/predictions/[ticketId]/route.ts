import { NextResponse } from "next/server"

import { getTransferPredictionForTicket } from "@/lib/ai/run-transfer-predictions"
import { apiFail, routeErrorMessage } from "@/lib/api/http"

type Props = { params: Promise<{ ticketId: string }> }

export async function GET(_req: Request, { params }: Props) {
  try {
    const { ticketId: raw } = await params
    const ticketId = Number(raw)
    if (!Number.isFinite(ticketId)) {
      return apiFail(400, "Invalid ticket id")
    }

    const prediction = await getTransferPredictionForTicket(ticketId)
    if (!prediction) {
      return NextResponse.json({ ok: true, prediction: null })
    }

    return NextResponse.json({ ok: true, prediction })
  } catch (e) {
    return apiFail(500, routeErrorMessage(e))
  }
}
