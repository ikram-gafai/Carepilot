import { SIMILAR_TICKET_PREVIEW_METHOD } from "@/lib/care-operational/similar-ticket-preview-seed"

export function formatSimilarScore(score: number): string {
  return `${Math.round(score * 100)}%`
}

export function formatSimilarPreviewMethod(method: string): string {
  if (method === SIMILAR_TICKET_PREVIEW_METHOD) {
    return "Operational similarity preview"
  }
  return "Historical reference case"
}

export const SIMILAR_TICKET_SECTION_TITLE = "Similar Historical Incidents"
export const SIMILAR_TICKET_SECTION_HINT =
  "Historical reference cases from resolved operational incidents — preview data for demo workflows."
