/**
 * Enterprise CARE operational ticket catalog — Carrefour France retail ITSM.
 * Titles and descriptions are seeded into care_source and flow to cp_agent via sync.
 */

export type OperationalTicketCategory =
  | "CHECKOUT"
  | "SCO"
  | "PAYMENT"
  | "NETWORK"
  | "HARDWARE"
  | "LOYALTY"
  | "BACK_OFFICE"
  | "STORE_INFRA"

export type OperationalTicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "ESCALATED"
  | "MONITORING"
  | "RESOLVED"

export type OperationalTicketPriority = "critical" | "high" | "medium" | "low"

export type OperationalTicketCatalogEntry = {
  title: string
  category: OperationalTicketCategory
  priority: OperationalTicketPriority
  status: OperationalTicketStatus
  subCategory: string
  description: string
}

const PERIMETER_CODE: Record<OperationalTicketCategory, string> = {
  CHECKOUT: "FO_VLP",
  SCO: "FO_VLP",
  PAYMENT: "MONETIQUE",
  NETWORK: "RESEAU",
  HARDWARE: "MATERIEL",
  LOYALTY: "FIDELITE",
  BACK_OFFICE: "BO",
  STORE_INFRA: "INF",
}

export function perimeterCodeForCategory(category: OperationalTicketCategory): string {
  return PERIMETER_CODE[category]
}

/** 70 unique operational incidents: short titles with no placeholder numbering. */
export const OPERATIONAL_TICKET_CATALOG: OperationalTicketCatalogEntry[] = [
  // Checkout (14)
  {
    title: "Checkout lane unavailable",
    category: "CHECKOUT",
    priority: "critical",
    status: "OPEN",
    subCategory: "VLP_LANE_DOWN",
    description:
      "Lane stopped accepting sales after an application hang. Store cannot process baskets on the affected checkout. Restart attempted locally without recovery.",
  },
  {
    title: "POS startup failure",
    category: "CHECKOUT",
    priority: "high",
    status: "IN_PROGRESS",
    subCategory: "POS_BOOT",
    description:
      "POS remains on splash screen after reboot. Other lanes in the zone are operational. Logs requested from store IT contact.",
  },
  {
    title: "Checkout login authentication failure",
    category: "CHECKOUT",
    priority: "medium",
    status: "OPEN",
    subCategory: "CASHIER_AUTH",
    description:
      "Operators cannot authenticate to the lane application. Active Directory reachability suspected. Workaround not available for new sessions.",
  },
  {
    title: "Cash register synchronization issue",
    category: "CHECKOUT",
    priority: "high",
    status: "MONITORING",
    subCategory: "SESSION_SYNC",
    description:
      "Lane totals diverge from back-office closing figures. Synchronization job retried; monitoring for drift on end-of-day reconciliation.",
  },
  {
    title: "Transaction validation timeout",
    category: "CHECKOUT",
    priority: "high",
    status: "IN_PROGRESS",
    subCategory: "TXN_VALIDATE",
    description:
      "Completed baskets fail final validation with a timeout. Customers are being redirected to adjacent lanes. Pattern started within the last hour.",
  },
  {
    title: "Fiscal printer unavailable",
    category: "CHECKOUT",
    priority: "critical",
    status: "ESCALATED",
    subCategory: "FISCAL_PRINT",
    description:
      "Fiscal receipt printing blocked; sales compliance at risk. Hardware reset performed. Escalated to vendor bridge for certificate and spooler checks.",
  },
  {
    title: "Lane payment terminal unresponsive",
    category: "CHECKOUT",
    priority: "high",
    status: "OPEN",
    subCategory: "LANE_TPE",
    description:
      "Integrated PIN pad does not respond to amount send. Chip and contactless attempts both fail at the lane. Terminal power cycle incomplete.",
  },
  {
    title: "Basket transfer failure between lanes",
    category: "CHECKOUT",
    priority: "medium",
    status: "OPEN",
    subCategory: "BASKET_XFER",
    description:
      "Suspended baskets cannot be moved to another lane after hardware swap. Store operations impacted during peak traffic.",
  },
  {
    title: "VLP application not responding",
    category: "CHECKOUT",
    priority: "critical",
    status: "IN_PROGRESS",
    subCategory: "VLP_APP",
    description:
      "VLP client frozen on welcome screen for multiple lanes in the same zone. Local service restart did not restore UI responsiveness.",
  },
  {
    title: "Mixed payment tender rejected",
    category: "CHECKOUT",
    priority: "medium",
    status: "MONITORING",
    subCategory: "TENDER_MIX",
    description:
      "Split-tender transactions decline after the first authorization. Occurs on card plus meal-voucher combinations. Under observation after parameter check.",
  },
  {
    title: "Supervisor override unavailable",
    category: "CHECKOUT",
    priority: "high",
    status: "OPEN",
    subCategory: "SUP_OVERRIDE",
    description:
      "Manager approval prompts return an authorization error. Price overrides and voids blocked until service is restored.",
  },
  {
    title: "End-of-day close blocked",
    category: "CHECKOUT",
    priority: "high",
    status: "ESCALATED",
    subCategory: "EOD_CLOSE",
    description:
      "Z-close cannot complete due to open sessions on lane. Financial closing deadline at risk. Store controller engaged.",
  },
  {
    title: "Barcode price mismatch at lane",
    category: "CHECKOUT",
    priority: "medium",
    status: "RESOLVED",
    subCategory: "PRICE_MISMATCH",
    description:
      "Shelf price differs from central file on selected PLUs. Temporary override applied. Master price push confirmed successful.",
  },
  {
    title: "Customer display disconnected",
    category: "CHECKOUT",
    priority: "low",
    status: "IN_PROGRESS",
    subCategory: "POLE_DISPLAY",
    description:
      "Pole display lost connection to POS; customer-facing totals not shown. Sales continue with cashier screen only.",
  },
  // SCO (12)
  {
    title: "SCO terminal offline",
    category: "SCO",
    priority: "critical",
    status: "OPEN",
    subCategory: "SCO_OFFLINE",
    description:
      "Self-checkout unit not reachable on store VLAN. Attendant kiosk shows device down. Unit taken out of service pending recovery.",
  },
  {
    title: "Self-checkout frozen",
    category: "SCO",
    priority: "high",
    status: "IN_PROGRESS",
    subCategory: "SCO_FREEZE",
    description:
      "SCO UI frozen mid-transaction. Hard reset required on multiple units in the same bank. Queue forming at attendant station.",
  },
  {
    title: "SCO payment reader offline",
    category: "SCO",
    priority: "high",
    status: "OPEN",
    subCategory: "SCO_PINPAD",
    description:
      "PIN pad on SCO does not initialize after boot. Contactless and chip flows unavailable. Spare device swap scheduled.",
  },
  {
    title: "SCO scale calibration fault",
    category: "SCO",
    priority: "medium",
    status: "MONITORING",
    subCategory: "SCO_SCALE",
    description:
      "Weight verification fails on every scan. Attendant interventions increasing. Calibration routine scheduled after hours.",
  },
  {
    title: "SCO bagging area sensor fault",
    category: "SCO",
    priority: "medium",
    status: "OPEN",
    subCategory: "SCO_SENSOR",
    description:
      "Bagging area triggers false item-not-bagged alerts. Customer throughput degraded. Sensor cleaning did not clear fault.",
  },
  {
    title: "SCO attendant mode inaccessible",
    category: "SCO",
    priority: "high",
    status: "IN_PROGRESS",
    subCategory: "SCO_ATTENDANT",
    description:
      "Attendant cannot unlock SCO for age-restricted products. Compliance control blocked. Credentials verified locally.",
  },
  {
    title: "SCO receipt printer jam",
    category: "SCO",
    priority: "low",
    status: "OPEN",
    subCategory: "SCO_PRINT",
    description:
      "Receipt path blocked; customers cannot complete without attendant print. Paper path cleared once; fault returned.",
  },
  {
    title: "SCO security scale timeout",
    category: "SCO",
    priority: "medium",
    status: "MONITORING",
    subCategory: "SCO_SEC_SCALE",
    description:
      "Security scale does not stabilize during weight check. Repeated interventions required. Firmware check pending.",
  },
  {
    title: "SCO touchscreen unresponsive",
    category: "SCO",
    priority: "high",
    status: "OPEN",
    subCategory: "SCO_TOUCH",
    description:
      "Touch input not registered on customer panel. Audio prompts continue. Unit reboot does not restore touch layer.",
  },
  {
    title: "SCO network session dropped",
    category: "SCO",
    priority: "high",
    status: "ESCALATED",
    subCategory: "SCO_NET",
    description:
      "Intermittent disconnects from SCO middleware. Transactions abort at payment step. Correlated with switch port errors on closet B.",
  },
  {
    title: "SCO age-restricted product lock",
    category: "SCO",
    priority: "medium",
    status: "RESOLVED",
    subCategory: "SCO_AGE",
    description:
      "Age verification loop did not release after attendant approval. Policy engine patch applied. Unit returned to service.",
  },
  {
    title: "SCO coin dispenser error",
    category: "SCO",
    priority: "low",
    status: "IN_PROGRESS",
    subCategory: "SCO_COIN",
    description:
      "Change payout fails with hopper fault. Card payments unaffected. Cash recycler vendor notified.",
  },
  // Payment (10)
  {
    title: "Payment authorization failure",
    category: "PAYMENT",
    priority: "critical",
    status: "OPEN",
    subCategory: "AUTH_DECLINE",
    description:
      "High rate of authorization declines across lanes. Acquirer host reachable but responses code systemic. Store finance alerted.",
  },
  {
    title: "Payment gateway timeout",
    category: "PAYMENT",
    priority: "critical",
    status: "IN_PROGRESS",
    subCategory: "GW_TIMEOUT",
    description:
      "Gateway responses exceed SLA during peak authorization. Retries increase queue time at checkout. Bridge call opened with acquirer.",
  },
  {
    title: "EMV chip read intermittent",
    category: "PAYMENT",
    priority: "high",
    status: "MONITORING",
    subCategory: "EMV_CHIP",
    description:
      "Chip insert failures on multiple terminals in the store. Contactless still works on subset of devices. Terminal firmware under review.",
  },
  {
    title: "Contactless reader inactive",
    category: "PAYMENT",
    priority: "medium",
    status: "OPEN",
    subCategory: "CTLS_OFF",
    description:
      "NFC tap not detected on lane PIN pads. Chip and mag-stripe remain available. Configuration push scheduled tonight.",
  },
  {
    title: "Acquirer host unreachable",
    category: "PAYMENT",
    priority: "critical",
    status: "ESCALATED",
    subCategory: "ACQUIRER_DOWN",
    description:
      "No authorization responses from acquirer endpoint. All card sales at risk. Incident declared with payment operations center.",
  },
  {
    title: "Refund processing rejected",
    category: "PAYMENT",
    priority: "high",
    status: "OPEN",
    subCategory: "REFUND_FAIL",
    description:
      "Customer refunds fail with host rejection. Original transaction lookup succeeds. Finance manual process initiated.",
  },
  {
    title: "Gift card authorization declined",
    category: "PAYMENT",
    priority: "medium",
    status: "IN_PROGRESS",
    subCategory: "GIFT_CARD",
    description:
      "Stored-value cards decline despite valid balance check on issuer portal. Isolated to this store region gateway.",
  },
  {
    title: "Mobile wallet handshake timeout",
    category: "PAYMENT",
    priority: "high",
    status: "OPEN",
    subCategory: "WALLET_TIMEOUT",
    description:
      "Apple Pay and Google Pay sessions time out before approval. Card present flows unaffected. Token service latency elevated.",
  },
  {
    title: "Store-and-forward queue growing",
    category: "PAYMENT",
    priority: "high",
    status: "MONITORING",
    subCategory: "STORE_FORWARD",
    description:
      "Offline buffer filling after brief WAN outage. Connectivity restored; backlog draining monitored for duplicate capture risk.",
  },
  {
    title: "PIN pad encryption error",
    category: "PAYMENT",
    priority: "critical",
    status: "RESOLVED",
    subCategory: "PIN_ENCRYPT",
    description:
      "Encryption key mismatch prevented PIN entry. Keys reloaded from HSM. Terminals confirmed operational after test sale.",
  },
  // Network (9)
  {
    title: "Store network instability",
    category: "NETWORK",
    priority: "critical",
    status: "IN_PROGRESS",
    subCategory: "LAN_INSTABILITY",
    description:
      "Packet loss between checkout VLAN and store services. POS latency spikes observed. Network operations tracing uplink and closet switches.",
  },
  {
    title: "Store switch connectivity issue",
    category: "NETWORK",
    priority: "high",
    status: "OPEN",
    subCategory: "SWITCH_PORT",
    description:
      "Access switch port errors on checkout rack. Flapping link affects four lanes. Spare SFP installed; monitoring error counters.",
  },
  {
    title: "Store VPN unavailable",
    category: "NETWORK",
    priority: "critical",
    status: "ESCALATED",
    subCategory: "VPN_DOWN",
    description:
      "Store cannot reach enterprise VPN concentrator. Central pricing and loyalty lookups degraded. WAN provider ticket raised.",
  },
  {
    title: "DNS resolution failure at store",
    category: "NETWORK",
    priority: "high",
    status: "OPEN",
    subCategory: "DNS_FAIL",
    description:
      "Internal service names fail to resolve on lane subnet. IP fallback not configured for critical dependencies.",
  },
  {
    title: "Wireless AP association failures",
    category: "NETWORK",
    priority: "medium",
    status: "MONITORING",
    subCategory: "WIFI_ASSOC",
    description:
      "Handheld scanners lose association in warehouse-to-front zone. Coverage survey requested. Temporary SSID steer applied.",
  },
  {
    title: "VLAN routing issue — checkout zone",
    category: "NETWORK",
    priority: "high",
    status: "IN_PROGRESS",
    subCategory: "VLAN_ROUTE",
    description:
      "Checkout subnet cannot reach payment middleware after firewall change window. Rollback under change advisory review.",
  },
  {
    title: "Inter-store WAN degradation",
    category: "NETWORK",
    priority: "medium",
    status: "MONITORING",
    subCategory: "WAN_DEGRADE",
    description:
      "MPLS latency elevated versus baseline. Applications remain up with slower responses. Carrier performance case opened.",
  },
  {
    title: "DHCP scope exhausted — lane subnet",
    category: "NETWORK",
    priority: "high",
    status: "OPEN",
    subCategory: "DHCP_EXhaust",
    description:
      "New lane devices cannot obtain addresses. Existing leases renewed manually. Scope expansion pending approval.",
  },
  {
    title: "Latency spike on store WAN",
    category: "NETWORK",
    priority: "medium",
    status: "RESOLVED",
    subCategory: "WAN_LATENCY",
    description:
      "Brief latency spike during carrier maintenance. Cleared after window end. No further customer impact reported.",
  },
  // Hardware (8)
  {
    title: "Printer communication lost",
    category: "HARDWARE",
    priority: "medium",
    status: "OPEN",
    subCategory: "PRINT_COMM",
    description:
      "Receipt printer no longer visible to POS spooler. USB and Ethernet paths checked. Driver reinstall scheduled.",
  },
  {
    title: "Receipt printer offline",
    category: "HARDWARE",
    priority: "medium",
    status: "IN_PROGRESS",
    subCategory: "RECEIPT_OFF",
    description:
      "Printer power OK but status offline in POS. Parallel lanes printing normally. Swap unit from spare stock in progress.",
  },
  {
    title: "Cash drawer malfunction",
    category: "HARDWARE",
    priority: "high",
    status: "OPEN",
    subCategory: "DRAWER",
    description:
      "Drawer does not open on settlement command. Manual key override required. Solenoid driver suspected.",
  },
  {
    title: "Scanner not detected",
    category: "HARDWARE",
    priority: "medium",
    status: "OPEN",
    subCategory: "SCANNER",
    description:
      "Handheld scanner absent from device manager after dock reconnect. Cable and hub port replaced without fix.",
  },
  {
    title: "Scale communication error",
    category: "HARDWARE",
    priority: "high",
    status: "MONITORING",
    subCategory: "SCALE_COMM",
    description:
      "Integrated scale returns communication fault during weighed PLU sale. Non-weighed items scan normally.",
  },
  {
    title: "Handheld scanner battery drain",
    category: "HARDWARE",
    priority: "low",
    status: "IN_PROGRESS",
    subCategory: "HH_BATTERY",
    description:
      "Devices lose charge within a single shift. Charging cradle LEDs normal. Battery batch replacement requested.",
  },
  {
    title: "UPS power event on lane rack",
    category: "HARDWARE",
    priority: "medium",
    status: "RESOLVED",
    subCategory: "UPS_EVENT",
    description:
      "Brief outage triggered UPS alarm on checkout rack. Equipment restarted cleanly. Power quality acceptable after inspection.",
  },
  {
    title: "Lane hub port failure",
    category: "HARDWARE",
    priority: "high",
    status: "OPEN",
    subCategory: "HUB_PORT",
    description:
      "Peripheral hub port dead; scanner and printer share same connection. Hub module replacement approved.",
  },
  // Loyalty (4)
  {
    title: "Loyalty service unavailable",
    category: "LOYALTY",
    priority: "high",
    status: "OPEN",
    subCategory: "LOYALTY_SVC",
    description:
      "Member lookup returns service unavailable on all lanes. Offline accrual disabled. Marketing notified for customer communications.",
  },
  {
    title: "Entitlement balance sync delay",
    category: "LOYALTY",
    priority: "medium",
    status: "MONITORING",
    subCategory: "ENTITLEMENT",
    description:
      "Balances update slowly after earn events. Purchases still complete without real-time points display. Batch catch-up running.",
  },
  {
    title: "Coupon redemption service timeout",
    category: "LOYALTY",
    priority: "high",
    status: "IN_PROGRESS",
    subCategory: "COUPON",
    description:
      "Digital coupons time out at validation. Paper vouchers processed manually. Promotion engine team engaged.",
  },
  {
    title: "Member profile lookup failure",
    category: "LOYALTY",
    priority: "medium",
    status: "RESOLVED",
    subCategory: "PROFILE",
    description:
      "Profile API returned errors for phone lookup. Service restored after cache flush. No data loss identified.",
  },
  // Back office (8)
  {
    title: "Back-office synchronization failure",
    category: "BACK_OFFICE",
    priority: "high",
    status: "IN_PROGRESS",
    subCategory: "BO_SYNC",
    description:
      "Store back-office did not receive closing extract from lanes. Reconciliation on hold. Re-sync job started with audit trail.",
  },
  {
    title: "Price update replication issue",
    category: "BACK_OFFICE",
    priority: "high",
    status: "OPEN",
    subCategory: "PRICE_REPL",
    description:
      "Central price file not applied to store article master. Incorrect prices risk at scan. Manual hold on affected departments.",
  },
  {
    title: "Inventory synchronization delay",
    category: "BACK_OFFICE",
    priority: "medium",
    status: "MONITORING",
    subCategory: "INV_SYNC",
    description:
      "Stock on hand lags warehouse movements by more than two hours. Sales continue with last known quantity. Supply chain loop informed.",
  },
  {
    title: "Promotion file import stalled",
    category: "BACK_OFFICE",
    priority: "medium",
    status: "OPEN",
    subCategory: "PROMO_IMPORT",
    description:
      "Weekly promotion package stuck in import queue. Offer start window tomorrow morning. Priority rerun requested.",
  },
  {
    title: "Master data publish lag",
    category: "BACK_OFFICE",
    priority: "medium",
    status: "IN_PROGRESS",
    subCategory: "MDM_PUBLISH",
    description:
      "Article attributes not visible on lanes after corporate update. Cache refresh incomplete. MDM operations validating bundle.",
  },
  {
    title: "POS application crash",
    category: "BACK_OFFICE",
    priority: "critical",
    status: "ESCALATED",
    subCategory: "POS_CRASH",
    description:
      "POS executable terminates with memory fault on multiple lanes. Crash dumps collected. Vendor development bridge engaged.",
  },
  {
    title: "Active Directory replication warning",
    category: "BACK_OFFICE",
    priority: "high",
    status: "MONITORING",
    subCategory: "AD_REPL",
    description:
      "Store controller reports replication latency to hub DC. Authentication still succeeds. Monitoring until backlog clears.",
  },
  {
    title: "SQL maintenance window overrun",
    category: "BACK_OFFICE",
    priority: "medium",
    status: "RESOLVED",
    subCategory: "SQL_MAINT",
    description:
      "Database maintenance exceeded planned window. Services restored with extended index rebuild. Store opening not delayed.",
  },
  // Store infrastructure (5)
  {
    title: "Store server unreachable",
    category: "STORE_INFRA",
    priority: "critical",
    status: "OPEN",
    subCategory: "SRV_DOWN",
    description:
      "Primary in-store server not responding to ping or management agent. Lanes operating in degraded offline mode where permitted.",
  },
  {
    title: "Hypervisor heartbeat lost",
    category: "STORE_INFRA",
    priority: "critical",
    status: "IN_PROGRESS",
    subCategory: "HV_HEARTBEAT",
    description:
      "VM host heartbeat missing in monitoring. Guest POS services migrated to secondary node. Root cause analysis underway.",
  },
  {
    title: "Backup job failed — store systems",
    category: "STORE_INFRA",
    priority: "medium",
    status: "OPEN",
    subCategory: "BACKUP_FAIL",
    description:
      "Nightly backup did not complete; retention policy at risk. Disk space within threshold. Job rescheduled with verbose logging.",
  },
  {
    title: "Disk threshold on store database",
    category: "STORE_INFRA",
    priority: "high",
    status: "ESCALATED",
    subCategory: "DISK_ALERT",
    description:
      "Database volume above critical threshold. Autogrowth enabled but latency increasing. Capacity expansion approved for tonight.",
  },
  {
    title: "Store controller service stopped",
    category: "STORE_INFRA",
    priority: "high",
    status: "MONITORING",
    subCategory: "CTRL_SVC",
    description:
      "Local orchestration service stopped after patch reboot. Manually restarted. Watching dependency chain on next scheduled task.",
  },
]

export function catalogEntryCount(): number {
  return OPERATIONAL_TICKET_CATALOG.length
}
