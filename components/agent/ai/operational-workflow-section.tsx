"use client"

import { ChevronDown } from "lucide-react"
import type { ReactNode } from "react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

type Props = {
  step: string
  title: string
  subtitle?: string
  children: ReactNode
  collapsible?: boolean
  defaultOpen?: boolean
  emphasized?: boolean
  trailing?: ReactNode
  className?: string
}

function SectionHeader({
  step,
  title,
  subtitle,
  emphasized,
  trailing,
}: Pick<Props, "step" | "title" | "subtitle" | "emphasized" | "trailing">) {
  return (
    <div className="flex min-w-0 flex-1 items-start gap-2.5">
      <span
        className={cn(
          "mt-0.5 shrink-0 font-mono text-[10px] tabular-nums",
          emphasized ? "text-primary" : "text-muted-foreground/70",
        )}
        aria-hidden
      >
        {step}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className={cn("font-semibold tracking-tight text-foreground", emphasized ? "text-sm" : "text-xs")}>
            {title}
          </h3>
          {trailing}
        </div>
        {subtitle ? <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{subtitle}</p> : null}
      </div>
    </div>
  )
}

export function OperationalWorkflowSection({
  step,
  title,
  subtitle,
  children,
  collapsible = false,
  defaultOpen = true,
  emphasized = false,
  trailing,
  className,
}: Props) {
  const bodyClass = cn("mt-2.5", emphasized ? "pl-[1.625rem]" : "pl-[1.625rem]")

  if (!collapsible) {
    return (
      <section
        className={cn(
          "border-b border-border/50 px-3 py-3 last:border-b-0",
          emphasized && "border-y border-primary/20 bg-primary/[0.03]",
          className,
        )}
      >
        <SectionHeader step={step} title={title} subtitle={subtitle} emphasized={emphasized} trailing={trailing} />
        <div className={bodyClass}>{children}</div>
      </section>
    )
  }

  return (
    <Collapsible defaultOpen={defaultOpen} className={cn("border-b border-border/50 last:border-b-0", className)}>
      <section className="px-3 py-3">
        <CollapsibleTrigger className="group flex w-full items-start gap-2 text-left">
          <SectionHeader step={step} title={title} subtitle={subtitle} emphasized={emphasized} trailing={trailing} />
          <ChevronDown className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className={bodyClass}>{children}</CollapsibleContent>
      </section>
    </Collapsible>
  )
}
