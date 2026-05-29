import {
  formatRecommendedAsDecision,
  type DecisionMappingHints,
} from "@/lib/ai/operational-decision"
import { ACTION_MODEL_DISPLAY } from "@/lib/ai-phase"

export function formatActionLabel(action: string, hints?: DecisionMappingHints): string {
  return formatRecommendedAsDecision(action, hints)
}

export function formatActionModelLabel(modelVersion: string): string {
  if (modelVersion.includes("xgboost_action")) return ACTION_MODEL_DISPLAY
  return modelVersion
}

export function formatConfidencePct(score: number): string {
  return `${Math.round(score * 100)}%`
}
