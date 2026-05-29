import {
  TRANSFER_MODEL_DISPLAY,
  TRANSFER_MODEL_VERSION,
} from "@/lib/ai-phase"

export function formatTransferModelLabel(modelVersion: string): string {
  if (modelVersion === TRANSFER_MODEL_VERSION) return TRANSFER_MODEL_DISPLAY
  return modelVersion
}

export function formatConfidencePct(score: number): string {
  return `${Math.round(score * 100)}%`
}
