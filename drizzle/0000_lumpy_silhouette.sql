CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "care_source";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "carepilot";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "cp_agent";
--> statement-breakpoint
CREATE TABLE "care_source"."tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"care_ticket_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"perimeter" text NOT NULL,
	"status" text NOT NULL,
	"priority" text NOT NULL,
	"channel" text DEFAULT 'PORTAL' NOT NULL,
	"store_code" text,
	"cash_register_code" text,
	"category" text,
	"error_message" text,
	"final_action" text,
	"final_reason" text,
	"incident_category" text,
	"escalation_required" boolean,
	"transfer_required" boolean,
	"target_perimeter" text,
	"km_applicable" text,
	"resolved_by_km" boolean,
	"missing_information_flag" boolean,
	"applied_km_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"sla_due_at" timestamp with time zone,
	CONSTRAINT "tickets_care_ticket_id_unique" UNIQUE("care_ticket_id")
);
--> statement-breakpoint
CREATE TABLE "care_source"."cash_registers" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"register_code" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "care_source"."km_procedures" (
	"id" serial PRIMARY KEY NOT NULL,
	"km_code" text NOT NULL,
	"title" text NOT NULL,
	"perimeter" text NOT NULL,
	"category" text NOT NULL,
	"content" text NOT NULL,
	"steps" text DEFAULT '' NOT NULL,
	"prerequisites" text DEFAULT '' NOT NULL,
	"tags" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "km_procedures_km_code_unique" UNIQUE("km_code")
);
--> statement-breakpoint
CREATE TABLE "care_source"."stores" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_code" text NOT NULL,
	"store_name" text NOT NULL,
	"city" text NOT NULL,
	CONSTRAINT "stores_store_code_unique" UNIQUE("store_code")
);
--> statement-breakpoint
CREATE TABLE "care_source"."ticket_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"action_type" text NOT NULL,
	"description" text NOT NULL,
	"result" text,
	"performed_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "care_source"."ticket_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"author_role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carepilot"."tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_ticket_id" integer NOT NULL,
	"raw_text" text NOT NULL,
	"summary" text,
	"perimeter" text NOT NULL,
	"status" text NOT NULL,
	"priority" text NOT NULL,
	"store_code" text,
	"cash_register_code" text,
	"category" text,
	"error_message" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"agent_final_decision" text,
	"agent_final_decision_at" timestamp with time zone,
	"agent_final_decision_notes" text,
	CONSTRAINT "tickets_source_ticket_id_unique" UNIQUE("source_ticket_id")
);
--> statement-breakpoint
CREATE TABLE "carepilot"."decision_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"suggested_action" text NOT NULL,
	"reason" text,
	"why_factors" jsonb DEFAULT '[]'::jsonb,
	"blocking_rules" jsonb DEFAULT '[]'::jsonb,
	"confidence_score" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carepilot"."embeddings" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"embedding" vector(384) NOT NULL,
	"model_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carepilot"."golden_test_cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"expected_entities" jsonb,
	"expected_missing_fields" jsonb,
	"expected_similar_group" text,
	"expected_km" text,
	"expected_decision" text
);
--> statement-breakpoint
CREATE TABLE "carepilot"."km_recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"km_id" integer NOT NULL,
	"score" real NOT NULL,
	"rank" integer NOT NULL,
	"explanation" text,
	"why_factors" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carepilot"."similar_ticket_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"similar_ticket_id" integer NOT NULL,
	"similarity_score" real NOT NULL,
	"rank" integer NOT NULL,
	"reference_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carepilot"."sync_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"sync_started_at" timestamp with time zone NOT NULL,
	"sync_finished_at" timestamp with time zone,
	"tickets_imported" integer DEFAULT 0 NOT NULL,
	"tickets_updated" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "carepilot"."ticket_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"extracted_entities" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"missing_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"operational_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"detected_problem_type" text,
	"detected_actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ai_summary" text,
	"confidence_score" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carepilot"."ticket_timeline_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"summary" text NOT NULL,
	"detail" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cp_agent"."ai_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"detected_issue" text NOT NULL,
	"suggested_action" text NOT NULL,
	"confidence" real NOT NULL,
	"escalation_risk" text DEFAULT 'low' NOT NULL,
	"missing_info" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reasoning" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cp_agent"."ai_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"helpful" boolean,
	"confidence_rating" integer,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cp_agent"."audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer,
	"action" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cp_agent"."km_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"km_code" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"steps" text DEFAULT '' NOT NULL,
	"relevance_score" real NOT NULL,
	"rank" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cp_agent"."sync_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"sync_started_at" timestamp with time zone NOT NULL,
	"sync_finished_at" timestamp with time zone,
	"status" text NOT NULL,
	"message" text,
	"records_processed" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cp_agent"."ticket_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"summary" text NOT NULL,
	"detail" text,
	"actor_label" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cp_agent"."tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"care_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"store_code" text,
	"category" text NOT NULL,
	"status" text NOT NULL,
	"priority" text NOT NULL,
	"sla_due_at" timestamp with time zone,
	"ttr_target_hours" integer,
	"assigned_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tickets_care_id_unique" UNIQUE("care_id")
);
--> statement-breakpoint
CREATE TABLE "cp_agent"."users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"role" text DEFAULT 'agent' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "care_source"."cash_registers" ADD CONSTRAINT "cash_registers_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "care_source"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_source"."ticket_actions" ADD CONSTRAINT "ticket_actions_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "care_source"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_source"."ticket_comments" ADD CONSTRAINT "ticket_comments_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "care_source"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carepilot"."tickets" ADD CONSTRAINT "tickets_source_ticket_id_tickets_id_fk" FOREIGN KEY ("source_ticket_id") REFERENCES "care_source"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carepilot"."decision_suggestions" ADD CONSTRAINT "decision_suggestions_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "carepilot"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carepilot"."golden_test_cases" ADD CONSTRAINT "golden_test_cases_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "carepilot"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carepilot"."km_recommendations" ADD CONSTRAINT "km_recommendations_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "carepilot"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carepilot"."similar_ticket_results" ADD CONSTRAINT "similar_ticket_results_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "carepilot"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carepilot"."similar_ticket_results" ADD CONSTRAINT "similar_ticket_results_similar_ticket_id_tickets_id_fk" FOREIGN KEY ("similar_ticket_id") REFERENCES "carepilot"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carepilot"."ticket_analysis" ADD CONSTRAINT "ticket_analysis_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "carepilot"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carepilot"."ticket_timeline_events" ADD CONSTRAINT "ticket_timeline_events_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "carepilot"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cp_agent"."ai_analyses" ADD CONSTRAINT "ai_analyses_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "cp_agent"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cp_agent"."ai_feedback" ADD CONSTRAINT "ai_feedback_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "cp_agent"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cp_agent"."audit_logs" ADD CONSTRAINT "audit_logs_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "cp_agent"."tickets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cp_agent"."km_suggestions" ADD CONSTRAINT "km_suggestions_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "cp_agent"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cp_agent"."ticket_history" ADD CONSTRAINT "ticket_history_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "cp_agent"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cp_agent"."tickets" ADD CONSTRAINT "tickets_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "cp_agent"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "embeddings_source_model_unique" ON "carepilot"."embeddings" USING btree ("source_type","source_id","model_name");--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_analysis_one_per_ticket" ON "carepilot"."ticket_analysis" USING btree ("ticket_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cp_agent_ai_one_active" ON "cp_agent"."ai_analyses" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "cp_agent_audit_ticket" ON "cp_agent"."audit_logs" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "cp_agent_km_ticket" ON "cp_agent"."km_suggestions" USING btree ("ticket_id","rank");--> statement-breakpoint
CREATE INDEX "cp_agent_hist_ticket_time" ON "cp_agent"."ticket_history" USING btree ("ticket_id","occurred_at");--> statement-breakpoint
CREATE INDEX "cp_agent_tickets_status" ON "cp_agent"."tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cp_agent_tickets_priority" ON "cp_agent"."tickets" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "cp_agent_tickets_sla" ON "cp_agent"."tickets" USING btree ("sla_due_at");