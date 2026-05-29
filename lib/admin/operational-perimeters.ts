/** Canonical CARE operational perimeters — shared by Dashboard and Queues. */
export type OperationalPerimeter = {
  category: string
  label: string
  sortOrder: number
}

/** CARE operational perimeters — dashboard pressure chart (MVP). */
export const DASHBOARD_OPERATIONAL_PERIMETERS: OperationalPerimeter[] = [
  { category: "CHECKOUT", label: "FO", sortOrder: 1 },
  { category: "SCO", label: "SCO", sortOrder: 2 },
  { category: "PAYMENT", label: "Monétique", sortOrder: 3 },
  { category: "NETWORK", label: "Réseau", sortOrder: 4 },
  { category: "HARDWARE", label: "Matériel", sortOrder: 5 },
]

/** Extended list for queues / routing views. */
export const OPERATIONAL_QUEUE_PERIMETERS: OperationalPerimeter[] = [
  ...DASHBOARD_OPERATIONAL_PERIMETERS,
  { category: "IT_DESK", label: "Back-office", sortOrder: 6 },
  { category: "LOGISTICS", label: "Logistique", sortOrder: 7 },
  { category: "SYNC", label: "Synchronisation", sortOrder: 8 },
]

const PERIMETER_CATEGORIES = new Set(OPERATIONAL_QUEUE_PERIMETERS.map((p) => p.category))

const CATEGORY_ALIASES: Record<string, string> = {
  CAISSE: "CHECKOUT",
  RESEAU: "NETWORK",
  MONETIQUE: "PAYMENT",
  MONÉTIQUE: "PAYMENT",
  MATERIEL: "HARDWARE",
  MATÉRIEL: "HARDWARE",
  BO: "IT_DESK",
  BUREAUTIQUE: "IT_DESK",
  VLP: "LOGISTICS",
  LOGISTIQUE: "LOGISTICS",
  SYNCHRONISATION: "SYNC",
  PERIPHERAL: "HARDWARE",
  PERIPH: "HARDWARE",
  PÉRIPH: "HARDWARE",
}

export function resolvePerimeterCategory(category: string | null | undefined): string | null {
  if (category == null || category === "") return null
  const k = category.trim().toUpperCase().replace(/\s+/g, "_")
  const mapped = CATEGORY_ALIASES[k] ?? k
  return PERIMETER_CATEGORIES.has(mapped) ? mapped : null
}

export function perimeterLabel(category: string): string {
  return OPERATIONAL_QUEUE_PERIMETERS.find((p) => p.category === category)?.label ?? category
}
