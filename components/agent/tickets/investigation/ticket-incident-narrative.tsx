import { extractIncidentArtifacts } from "@/lib/agent/incident-narrative"
import { cn } from "@/lib/utils"

import { InvestigationSection } from "./investigation-section"

function ArtifactLine({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-2 text-[11px] leading-snug">
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <span className={cn("min-w-0 text-foreground", mono && "font-mono")}>{value}</span>
    </div>
  )
}

export function TicketIncidentNarrative({ description }: { description: string }) {
  const artifacts = extractIncidentArtifacts(description)
  const narrative = description.trim()

  return (
    <InvestigationSection title="Description incident">
      <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground">{narrative}</p>
      {artifacts.length > 0 ? (
        <div className="mt-2 space-y-1 border-t border-border/40 pt-2">
          {artifacts.map((a) => (
            <ArtifactLine
              key={`${a.kind}-${a.value}`}
              label={a.label}
              value={a.value}
              mono={a.kind === "error_code" || a.kind === "terminal" || a.kind === "log"}
            />
          ))}
        </div>
      ) : null}
    </InvestigationSection>
  )
}
