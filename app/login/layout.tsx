import { Toaster } from "@/components/ui/sonner"

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="min-h-dvh bg-zinc-50 text-zinc-900">{children}</div>
      <Toaster richColors position="top-center" />
    </>
  )
}
