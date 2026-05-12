"use client"

import { Button } from "@/components/ui/button"

const DECISION_SECTION_ID = "ticket-agent-decision-section"
const DECISION_INPUT_ID = "agent-decision"

/** Primary ticket actions shown in {@link CarePilotShellHeaderRow} (`trailingActions`). */
export function TicketShellHeaderActions() {
  function goToDecisionForm() {
    const section = document.getElementById(DECISION_SECTION_ID)
    section?.scrollIntoView({ behavior: "smooth", block: "start" })
    window.setTimeout(() => {
      document.getElementById(DECISION_INPUT_ID)?.focus()
    }, 400)
  }

  return (
    <Button
      type="button"
      size="sm"
      className="h-8 shrink-0 text-xs opacity-100"
      onClick={goToDecisionForm}
    >
      Save Decision
    </Button>
  )
}
