import Image from "next/image"
import Link from "next/link"

import { cn } from "@/lib/utils"

export const CAREPILOT_BRAND_NAME = "CAREPILOT" as const

/** Uppercase wordmark styling — use on any visible “CAREPILOT” label. */
export function carepilotBrandNameClassName(className?: string) {
  return cn("font-semibold uppercase tracking-[0.14em]", className)
}

export function CarePilotBrandName({ className }: { className?: string }) {
  return <span className={carepilotBrandNameClassName(className)}>{CAREPILOT_BRAND_NAME}</span>
}

/** Carrefour logo + CAREPILOT wordmark; entire control links to `href`. */
export function CarePilotBrandMark({
  href,
  className,
  logoClassName = "h-7 w-auto shrink-0 opacity-95",
  nameClassName,
  priority = false,
}: {
  href: string
  className?: string
  logoClassName?: string
  nameClassName?: string
  priority?: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-md outline-none ring-primary/40 transition-opacity hover:opacity-90 focus-visible:ring-2",
        className,
      )}
      aria-label={`${CAREPILOT_BRAND_NAME} — go to dashboard`}
    >
      <Image
        src="/logo/carrefour.svg"
        alt=""
        width={131}
        height={82}
        className={logoClassName}
        priority={priority}
      />
      <CarePilotBrandName className={cn("truncate text-[13px] text-zinc-900 dark:text-zinc-50", nameClassName)} />
    </Link>
  )
}
