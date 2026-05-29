/** Derive suggested transfer destination and operational reason from ticket text. */
export function deriveTransferTargetPerimeter(input: {
  title: string
  description: string
  perimeter: string | null
  category: string | null
}): string {
  const text = `${input.title} ${input.description} ${input.perimeter ?? ""} ${input.category ?? ""}`.toLowerCase()

  if (/network|lan|wan|wifi|vpn|connectivity|packet loss|offline.*network/.test(text)) {
    return "Network"
  }
  if (/payment|monetique|tpe|pinpad|pin pad|card|terminal.?payment|acquirer|gateway/.test(text)) {
    return "Payment"
  }
  if (/hardware|printer|scanner|periph|fiscal|drawer|device replacement/.test(text)) {
    return "Hardware"
  }
  if (/server|infra|infrastructure|disk|database|store.?server/.test(text)) {
    return "Store infrastructure"
  }
  if (/inventory|replication|back.?office|price sync|pos application|pos client/.test(text)) {
    return "Back office"
  }
  if (/sco|self.?checkout|self checkout/.test(text)) {
    return "SCO"
  }
  if (/loyalty|fidelite|customer account/.test(text)) {
    return "Loyalty"
  }

  const perimeter = (input.perimeter ?? "").toLowerCase()
  if (perimeter.includes("network") || perimeter.includes("reseau")) return "Network"
  if (perimeter.includes("payment") || perimeter.includes("monetique")) return "Payment"
  if (perimeter.includes("hardware") || perimeter.includes("materiel")) return "Hardware"
  if (perimeter.includes("infra")) return "Store infrastructure"
  if (perimeter.includes("back") || perimeter.includes("bo")) return "Back office"
  if (perimeter.includes("sco")) return "SCO"
  if (perimeter.includes("loyal") || perimeter.includes("fidel")) return "Loyalty"
  if (perimeter.includes("checkout") || perimeter.includes("fo") || perimeter.includes("vlp")) {
    return "FO"
  }

  return "Network"
}

export function deriveTransferReason(input: {
  title: string
  description: string
  perimeter: string | null
  category: string | null
  targetPerimeter: string
}): string {
  const text = `${input.title} ${input.description}`.toLowerCase()
  const target = input.targetPerimeter.toLowerCase()

  if (target.includes("network")) {
    if (/payment|terminal|authorization|timeout/.test(text)) {
      return "Payment issue linked to network instability"
    }
    return "Network dependency detected outside current perimeter"
  }
  if (target.includes("payment")) return "Payment processing failure outside lane scope"
  if (target.includes("hardware")) return "Physical device issue requires hardware perimeter"
  if (target.includes("back office")) return "Back-office sync or application dependency identified"
  if (target.includes("store infra")) return "Store infrastructure issue beyond lane diagnostics"
  if (target.includes("sco")) return "SCO-specific failure outside front-office lane scope"
  if (target.includes("loyalty")) return "Loyalty service dependency outside checkout perimeter"

  const trimmed = input.title.trim()
  if (trimmed.length > 0) {
    return trimmed.length > 56 ? `${trimmed.slice(0, 53)}…` : trimmed
  }

  return "Cross-perimeter routing signal from operational text"
}

export function formatTransferRecommendation(
  predictedTransferRequired: boolean,
  targetPerimeter: string,
): string {
  if (!predictedTransferRequired) return "No transfer required"
  return `Transfer to ${targetPerimeter} perimeter`
}
