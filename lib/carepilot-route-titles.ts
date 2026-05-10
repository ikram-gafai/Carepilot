/** Fallback titles when `CarePilotSetHeader` has not run yet (navigation, refresh). */
export function getCarePilotFallbackTitle(pathname: string): string {
  if (pathname.startsWith("/tickets/") && pathname !== "/tickets") {
    return "Ticket"
  }

  const exact: Record<string, string> = {
    "/dashboard": "Operational dashboard",
    "/tickets": "Tickets FO VLP",
    "/similar": "Similar Tickets",
    "/km": "KM Procedures",
    "/escalation-transfer": "Escalation & Transfer Assistance",
    "/sync": "Synchronization",
    "/benchmarks": "Benchmarks & évaluation",
    "/settings": "Settings",
  }

  return exact[pathname] ?? "CAREPILOT"
}
