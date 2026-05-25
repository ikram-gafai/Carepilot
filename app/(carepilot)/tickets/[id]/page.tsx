import { redirect } from "next/navigation"

type PageProps = { params: Promise<{ id: string }> }

export default async function TicketDetailPage(props: PageProps) {
  const { id } = await props.params
  redirect(`/agent/tickets/${encodeURIComponent(id)}`)
}
