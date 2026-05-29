"use client"

import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
import { Lock, Mail } from "lucide-react"
import { toast } from "sonner"

import { CarePilotBrandName } from "@/components/carepilot-brand-mark"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { resolvePostLoginPath } from "@/lib/auth/login-redirect"
import { cn } from "@/lib/utils"

function readLoginFields(form: HTMLFormElement) {
  const fd = new FormData(form)
  return {
    email: String(fd.get("email") ?? "").trim(),
    password: String(fd.get("password") ?? ""),
  }
}

export function CarePilotLoginForm({ className }: { className?: string }) {
  const sp = useSearchParams()
  const fromParam = sp.get("from")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [remember, setRemember] = useState(true)
  const [pending, start] = useTransition()

  // Browser autofill does not always fire React onChange — sync DOM values before submit.
  useEffect(() => {
    const syncAutofill = () => {
      const emailEl = document.getElementById("cp-email") as HTMLInputElement | null
      const passEl = document.getElementById("cp-password") as HTMLInputElement | null
      if (emailEl?.value) setEmail(emailEl.value)
      if (passEl?.value) setPassword(passEl.value)
    }
    syncAutofill()
    const t = window.setTimeout(syncAutofill, 250)
    return () => window.clearTimeout(t)
  }, [])

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fromDom = readLoginFields(e.currentTarget)
    const em = fromDom.email || email.trim()
    const pwd = fromDom.password || password
    if (!em || !pwd) {
      toast.error("Saisissez votre e-mail et votre mot de passe.")
      return
    }
    start(async () => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: em, password: pwd, remember }),
      })
      const raw = await res.text()
      let data: { ok?: boolean; error?: string; user?: { role?: string } }
      try {
        data = raw ? (JSON.parse(raw) as typeof data) : {}
      } catch {
        toast.error("Échec de la connexion — réponse serveur invalide.")
        return
      }
      if (!res.ok || !data.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Échec de la connexion")
        return
      }
      const destination = resolvePostLoginPath({
        role: data.user?.role ?? "Agent",
        fromParam,
        fallback: "/agent/dashboard",
      })
      window.location.assign(destination)
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "cp-login-form w-full max-w-[400px] space-y-6 rounded-2xl border border-zinc-200/90 bg-white p-8 shadow-lg shadow-zinc-900/5 ring-1 ring-zinc-950/[0.04]",
        className,
      )}
    >
      <div className="space-y-1 text-center">
        <div className="mx-auto mb-4 flex justify-center">
          <Image
            src="/logo/carrefour.svg"
            alt=""
            width={131}
            height={82}
            className="h-7 w-auto opacity-95"
            priority
          />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
          Connexion à <CarePilotBrandName className="text-[0.95em] text-zinc-900" />
        </h1>
        <p className="text-sm text-zinc-600">Support Carrefour</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cp-email" className="text-xs font-medium text-zinc-700">
            E-mail
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              id="cp-email"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onInput={(e) => setEmail(e.currentTarget.value)}
              className="h-10 border-zinc-200 bg-white pl-9 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus-visible:border-primary/45 focus-visible:ring-primary/20"
              placeholder="name@carrefour.internal"
              disabled={pending}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cp-password" className="text-xs font-medium text-zinc-700">
            Mot de passe
          </Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              id="cp-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onInput={(e) => setPassword(e.currentTarget.value)}
              className="h-10 border-zinc-200 bg-white pl-9 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus-visible:border-primary/45 focus-visible:ring-primary/20"
              placeholder="••••••••"
              disabled={pending}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="cp-remember"
              checked={remember}
              onCheckedChange={(v) => setRemember(v === true)}
              disabled={pending}
              className="border-zinc-300 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
            />
            <Label htmlFor="cp-remember" className="text-xs font-normal text-zinc-600">
              Mémoriser la session
            </Label>
          </div>
          <button
            type="button"
            className="text-xs text-primary/90 underline-offset-4 hover:text-primary hover:underline"
            onClick={() =>
              toast.message("Réinitialisation du mot de passe", {
                description: "Contactez votre administrateur informatique.",
              })
            }
          >
            Mot de passe oublié ?
          </button>
        </div>

        <Button
          type="submit"
          className="h-10 w-full bg-primary text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90"
          disabled={pending}
        >
          {pending ? "Connexion en cours…" : "Se connecter"}
        </Button>
      </div>
    </form>
  )
}
