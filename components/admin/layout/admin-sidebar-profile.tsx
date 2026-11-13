"use client"

import * as React from "react"
import {
  Bell,
  ChevronDown,
  ImagePlus,
  LogOut,
  Monitor,
  Moon,
  Pencil,
  Rows3,
  Sun,
  User,
} from "lucide-react"
import { useTheme } from "next-themes"
import { toast } from "sonner"

import { useAdminPreferences } from "@/components/admin/layout/admin-preferences-context"
import type { CarePilotSessionUser } from "@/lib/auth/session"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"


function profileName(sessionUser?: CarePilotSessionUser | null) {
  if (!sessionUser) return "Superviseur"
  const n = `${sessionUser.firstName} ${sessionUser.lastName}`.trim()
  return n || sessionUser.email
}

function profileSubtitle(sessionUser?: CarePilotSessionUser | null) {
  if (!sessionUser) return "Admin · Support"
  const dept = sessionUser.department?.trim()
  return dept ? `${sessionUser.role} · ${dept}` : sessionUser.role
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "CP"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
}

export function AdminSidebarProfile({ sessionUser }: { sessionUser?: CarePilotSessionUser | null }) {
  const { theme, setTheme } = useTheme()
  const { compact: compactPref, setCompact, notifyEnabled, setNotifyEnabled } = useAdminPreferences()

  const [displayName, setDisplayName] = React.useState(() => profileName(sessionUser))
  const teamLine = profileSubtitle(sessionUser)

  // Re-derive the display name when the session user changes (during render, not in an effect).
  const [prevSessionUser, setPrevSessionUser] = React.useState(sessionUser)
  if (sessionUser !== prevSessionUser) {
    setPrevSessionUser(sessionUser)
    setDisplayName(profileName(sessionUser))
  }

  const [avatarObjectUrl, setAvatarObjectUrl] = React.useState<string | null>(null)
  const [editOpen, setEditOpen] = React.useState(false)
  const [editDraft, setEditDraft] = React.useState(displayName)
  const fileRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    return () => {
      if (avatarObjectUrl) URL.revokeObjectURL(avatarObjectUrl)
    }
  }, [avatarObjectUrl])

  const themeValue = theme === "dark" || theme === "light" ? theme : "system"

  const onAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !file.type.startsWith("image/")) {
      toast.message("Veuillez sélectionner un fichier image.")
      return
    }
    setAvatarObjectUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
    toast.success("Avatar mis à jour.")
  }

  const saveEditName = () => {
    const next = editDraft.trim() || profileName(sessionUser)
    setDisplayName(next)
    setEditOpen(false)
    toast.success("Nom mis à jour.")
  }

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatarFile} />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xs gap-3 p-4 sm:max-w-xs" showCloseButton>
          <DialogHeader className="gap-1 text-left">
            <DialogTitle className="text-sm">Modifier le nom affiché</DialogTitle>
            <DialogDescription className="text-xs">
              Met à jour le nom affiché pour cette session de navigation uniquement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="admin-profile-name" className="text-xs">
              Nom
            </Label>
            <Input
              id="admin-profile-name"
              value={editDraft}
              onChange={(ev) => setEditDraft(ev.target.value)}
              autoComplete="name"
              className="h-9"
            />
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>
              Annuler
            </Button>
            <Button type="button" size="sm" onClick={saveEditName}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title={`${displayName} — ${teamLine}`}
            className={cn(
              "flex w-full items-center gap-2 rounded-md border border-transparent px-1.5 py-1.5 text-left outline-none transition-colors",
              "hover:border-zinc-200 hover:bg-white/80 focus-visible:ring-2 focus-visible:ring-zinc-400/30 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/50 dark:focus-visible:ring-zinc-500/40",
              "data-[state=open]:border-zinc-200 data-[state=open]:bg-white data-[state=open]:shadow-sm dark:data-[state=open]:border-zinc-700 dark:data-[state=open]:bg-zinc-900/80",
              compactPref && "py-1",
            )}
          >
            <Avatar className="size-7 ring-1 ring-zinc-200 dark:ring-zinc-700">
              {avatarObjectUrl ? <AvatarImage src={avatarObjectUrl} alt="" /> : null}
              <AvatarFallback className="text-[10px] font-semibold">{initials(displayName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "truncate font-semibold text-zinc-900 dark:text-zinc-50",
                  compactPref ? "text-[11px]" : "text-[12px]",
                )}
              >
                {displayName}
              </div>
              <div className={cn("truncate text-zinc-500 dark:text-zinc-400", compactPref ? "text-[9px]" : "text-[10px]")}>
                {teamLine}
              </div>
            </div>
            <ChevronDown className={cn("size-3.5 shrink-0 text-zinc-400", compactPref && "size-3")} aria-hidden />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          side="top"
          align="start"
          sideOffset={8}
          className="w-[min(17.5rem,calc(100vw-1rem))] rounded-lg border border-border/60 p-1 shadow-md ring-1 ring-primary/12"
        >
          <div className="flex items-center gap-2 rounded-md px-2 py-2">
            <Avatar className="size-9 ring-1 ring-border">
              {avatarObjectUrl ? <AvatarImage src={avatarObjectUrl} alt="" /> : null}
              <AvatarFallback className="text-xs font-semibold">{initials(displayName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{teamLine}</p>
            </div>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Profil
            </DropdownMenuLabel>
            <DropdownMenuItem className="gap-2 text-xs" onSelect={() => {}}>
              <User className="size-3.5 opacity-70" aria-hidden />
              Voir le profil
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 text-xs"
              onSelect={() => {
                setEditDraft(displayName)
                setEditOpen(true)
              }}
            >
              <Pencil className="size-3.5 opacity-70" aria-hidden />
              Modifier le nom
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-xs" onSelect={() => fileRef.current?.click()}>
              <ImagePlus className="size-3.5 opacity-70" aria-hidden />
              Changer l&apos;avatar
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Apparence
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={themeValue} onValueChange={(v) => setTheme(v)}>
              <DropdownMenuRadioItem value="light" className="gap-2 text-xs">
                <Sun className="size-3.5 opacity-70" aria-hidden />
                Mode clair
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark" className="gap-2 text-xs">
                <Moon className="size-3.5 opacity-70" aria-hidden />
                Mode sombre
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system" className="gap-2 text-xs">
                <Monitor className="size-3.5 opacity-70" aria-hidden />
                Mode système
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Préférences
            </DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              className="gap-2 text-xs"
              checked={compactPref}
              onCheckedChange={(v) => setCompact(v === true)}
            >
              <Rows3 className="size-3.5 opacity-70" aria-hidden />
              Mode compact
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              className="gap-2 text-xs"
              checked={notifyEnabled}
              onCheckedChange={(v) => setNotifyEnabled(v === true)}
            >
              <Bell className="size-3.5 opacity-70" aria-hidden />
              Préférences de notification
            </DropdownMenuCheckboxItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Compte
            </DropdownMenuLabel>
            <DropdownMenuItem
              variant="destructive"
              className="gap-2 text-xs"
              onSelect={(e) => {
                e.preventDefault()
                void fetch("/api/auth/logout", { method: "POST", credentials: "include" }).finally(() => {
                  window.location.assign("/login?from=/admin/dashboard")
                })
              }}
            >
              <LogOut className="size-3.5" aria-hidden />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
