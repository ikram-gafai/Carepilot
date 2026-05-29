/** Canonical front-office perimeter code (replaces legacy FO_VLP). */
export const FO_PERIMETER = "FO"

const LEGACY_FO_PATTERNS = [
  "FO_VLP",
  "FO / VLP",
  "FO/VLP",
  "FO VLP",
  "Checkout (VLP)",
  "Checkout (vlp)",
] as const

function legacyFoKey(value: string): string {
  return value.trim().toUpperCase().replace(/\s*\/\s*/g, " ").replace(/\s+/g, " ")
}

function isLegacyFoPerimeter(trimmed: string): boolean {
  const key = legacyFoKey(trimmed)
  return (
    LEGACY_FO_PATTERNS.some((p) => legacyFoKey(p) === key) ||
    key === "FOVLP" ||
    key === "FO"
  )
}

/** Normalize stored perimeter codes for writes and sync (preserves null/empty). */
export function normalizePerimeterForStorage(
  perimeter: string | null | undefined,
): string | null {
  if (perimeter == null || !perimeter.trim()) return perimeter?.trim() || null
  const trimmed = perimeter.trim()
  if (isLegacyFoPerimeter(trimmed)) return FO_PERIMETER
  return trimmed
}

/** Normalize stored perimeter codes for display and new writes. */
export function normalizePerimeterCode(perimeter: string | null | undefined): string {
  const normalized = normalizePerimeterForStorage(perimeter)
  if (!normalized) return "—"
  return normalized
}

export function formatPerimeterLabel(perimeter: string | null | undefined): string {
  return normalizePerimeterCode(perimeter)
}
