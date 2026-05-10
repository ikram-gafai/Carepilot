/** Shared route labels and paths for sidebar tabs and the command palette. */
export type CarePilotRoute = { title: string; url: string }

export const CAREPILOT_OPERATION_ROUTES: CarePilotRoute[] = [
  { title: "Dashboard", url: "/dashboard" },
  { title: "Tickets FO VLP", url: "/tickets" },
  { title: "Similar Tickets", url: "/similar" },
  { title: "KM Procedures", url: "/km" },
  { title: "Escalation & Transfer Assistance", url: "/escalation-transfer" },
  { title: "Synchronization", url: "/sync" },
]

export const CAREPILOT_ADMIN_LINK_ROUTES: CarePilotRoute[] = [
  { title: "Benchmarks", url: "/benchmarks" },
  { title: "Settings", url: "/settings" },
]
