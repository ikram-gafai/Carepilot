/** Extract structured incident artifacts from ticket description text. */

export type IncidentArtifact = {
  kind: "log" | "error_code" | "terminal" | "lane" | "screenshot"
  label: string
  value: string
}

const ERROR_CODE = /\b(?:ERR[-_]?\d{2,6}|E\d{3,5}|error\s*(?:code)?\s*[:#]?\s*[\w-]+)\b/gi
const TERMINAL = /\b(?:terminal|tpe|pos)\s*[#:]?\s*([A-Z0-9-]{3,})\b/gi
const LANE = /\b(?:lane|register|caisse)\s*[#:]?\s*(\d{1,3})\b/gi
const LOG_LINE = /^\s*(\[[\d:]+\]|\d{4}-\d{2}-\d{2}).*(?:error|warn|fail|exception)/gim

export function extractIncidentArtifacts(description: string): IncidentArtifact[] {
  const artifacts: IncidentArtifact[] = []
  const seen = new Set<string>()

  function add(kind: IncidentArtifact["kind"], label: string, value: string) {
    const key = `${kind}:${value}`
    if (seen.has(key) || !value.trim()) return
    seen.add(key)
    artifacts.push({ kind, label, value: value.trim() })
  }

  for (const match of description.matchAll(ERROR_CODE)) {
    add("error_code", "Error code", match[0])
  }

  for (const match of description.matchAll(TERMINAL)) {
    add("terminal", "Terminal ID", match[1] ?? match[0])
  }

  for (const match of description.matchAll(LANE)) {
    add("lane", "Lane", match[1] ?? match[0])
  }

  if (/screenshot|capture|photo attached|image attached/i.test(description)) {
    add("screenshot", "Screenshot", "Referenced in incident description")
  }

  const logMatches = description.match(LOG_LINE)
  if (logMatches) {
    for (const line of logMatches.slice(0, 3)) {
      add("log", "Log excerpt", line.trim().slice(0, 160))
    }
  }

  return artifacts
}

export function extractLaneFromText(text: string): string | null {
  const match = text.match(/\b(?:lane|register|caisse)\s*[#:]?\s*(\d{1,3})\b/i)
  return match?.[1] ?? null
}
