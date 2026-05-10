import { CarePilotShell } from "@/components/carepilot-shell"

export default function CarePilotLayout({ children }: { children: React.ReactNode }) {
  return <CarePilotShell>{children}</CarePilotShell>
}
