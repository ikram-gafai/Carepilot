/** Shared route labels and paths for sidebar tabs and the command palette. */
export type CarePilotRoute = { title: string; url: string }

export const CAREPILOT_OPERATION_ROUTES: CarePilotRoute[] = [
  { title: "Dashboard", url: "/dashboard" },
  { title: "Tickets", url: "/tickets" },
  { title: "Analytics", url: "/analytics" },
]

export const CAREPILOT_ADMIN_LINK_ROUTES: CarePilotRoute[] = [
  { title: "Settings", url: "/settings" },
]
