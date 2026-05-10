import {
  boolean,
  integer,
  pgSchema,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

export const careSource = pgSchema("care_source")

export const stores = careSource.table("stores", {
  id: serial("id").primaryKey(),
  storeCode: text("store_code").notNull().unique(),
  storeName: text("store_name").notNull(),
  city: text("city").notNull(),
})

export const cashRegisters = careSource.table("cash_registers", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  registerCode: text("register_code").notNull(),
  status: text("status").notNull().default("ACTIVE"),
})

export const kmProcedures = careSource.table("km_procedures", {
  id: serial("id").primaryKey(),
  kmCode: text("km_code").notNull().unique(),
  title: text("title").notNull(),
  perimeter: text("perimeter").notNull(),
  category: text("category").notNull(),
  content: text("content").notNull(),
  steps: text("steps").notNull().default(""),
  prerequisites: text("prerequisites").notNull().default(""),
  tags: text("tags").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const careSourceTickets = careSource.table("tickets", {
  id: serial("id").primaryKey(),
  careTicketId: text("care_ticket_id").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  perimeter: text("perimeter").notNull(),
  status: text("status").notNull(),
  priority: text("priority").notNull(),
  channel: text("channel").notNull().default("PORTAL"),
  storeCode: text("store_code"),
  cashRegisterCode: text("cash_register_code"),
  category: text("category"),
  errorMessage: text("error_message"),
  finalAction: text("final_action"),
  finalReason: text("final_reason"),
  incidentCategory: text("incident_category"),
  escalationRequired: boolean("escalation_required"),
  transferRequired: boolean("transfer_required"),
  targetPerimeter: text("target_perimeter"),
  kmApplicable: text("km_applicable"),
  resolvedByKm: boolean("resolved_by_km"),
  missingInformationFlag: boolean("missing_information_flag"),
  appliedKmCode: text("applied_km_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  slaDueAt: timestamp("sla_due_at", { withTimezone: true }),
})

export const ticketComments = careSource.table("ticket_comments", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id")
    .notNull()
    .references(() => careSourceTickets.id, { onDelete: "cascade" }),
  authorRole: text("author_role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const ticketActions = careSource.table("ticket_actions", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id")
    .notNull()
    .references(() => careSourceTickets.id, { onDelete: "cascade" }),
  actionType: text("action_type").notNull(),
  description: text("description").notNull(),
  result: text("result"),
  performedBy: text("performed_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})
