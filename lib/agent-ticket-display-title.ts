/**
 * Strip leading operational / routing prefixes from ticket titles for list and detail display.
 * Status, AI prediction, and actions already convey escalation, transfer, suspension, etc.
 */

const OPERATIONAL_TITLE_PREFIX =
  /^(escalat(e|ion)\s+n3|escalade\s+n3|transfer\s+(hardware|payment|workstation|network|back\s+office|infrastructure)|transfert\s+mat[eé]riel|transfert\s+bureautique|suspension|resolution|r[eé]solution|cl[oô]ture)(\s*[-–—]\s*|\s*:\s*)/i

export function agentTicketDisplayTitle(title: string): string {
  let t = title.replace(/\s+/g, " ").trim()
  if (!t) return title.trim()
  for (let i = 0; i < 5; i++) {
    const next = t.replace(OPERATIONAL_TITLE_PREFIX, "").trim()
    if (next === t) break
    t = next
  }
  if (!t) return title.trim()
  return t
}
