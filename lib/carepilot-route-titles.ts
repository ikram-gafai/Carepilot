/** Titres de repli lorsque `CarePilotSetHeader` n'a pas encore été exécuté. */
export function getCarePilotFallbackTitle(pathname: string): string {
  if (pathname.startsWith("/tickets/") && pathname !== "/tickets") {
    return "Ticket"
  }

  const exact: Record<string, string> = {
    "/dashboard": "Tableau de bord",
    "/tickets": "Tickets",
    "/analytics": "Analytique",
    "/similar": "Tickets similaires",
    "/km": "Procédures KM",
    "/escalation-transfer": "Assistance escalade et transfert",
    "/settings": "Paramètres",
    "/admin/dashboard": "Tableau de bord",
    "/admin/queues": "Files d'attente",
    "/admin/escalations": "Escalades",
    "/admin/recommendations": "Recommandations",
    "/admin/feedback": "Retours",
    "/admin/users": "Agents",
  }

  return exact[pathname] ?? "CAREPILOT"
}
