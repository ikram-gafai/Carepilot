/**
 * Optional deep-link into CARE for a KM procedure code.
 * Set e.g. NEXT_PUBLIC_CARE_KM_PROCEDURE_URL=https://care.example/km?code={{code}}
 */
export function buildCareKmProcedureUrl(kmCode: string): string | undefined {
  const tpl = process.env.NEXT_PUBLIC_CARE_KM_PROCEDURE_URL?.trim()
  if (!tpl) return undefined
  if (tpl.includes("{{code}}")) {
    return tpl.replaceAll("{{code}}", encodeURIComponent(kmCode))
  }
  const joiner = tpl.includes("?") ? "&" : "?"
  return `${tpl.replace(/\/$/, "")}${joiner}code=${encodeURIComponent(kmCode)}`
}
