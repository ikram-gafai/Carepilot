-- Admin operational tables: queues, escalations, recommendation metrics, sync issues, source health

CREATE TABLE IF NOT EXISTS cp_admin.operational_queues (
  id SERIAL PRIMARY KEY,
  queue_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL,
  target_handling_hours INTEGER NOT NULL DEFAULT 12,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cp_admin_queues_category ON cp_admin.operational_queues (category);

CREATE TABLE IF NOT EXISTS cp_admin.escalation_records (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES cp_agent.tickets (id) ON DELETE CASCADE,
  care_id TEXT NOT NULL,
  escalation_route TEXT NOT NULL,
  escalation_reason TEXT NOT NULL,
  escalation_status TEXT NOT NULL,
  sla_exposure_label TEXT NOT NULL,
  escalated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS cp_admin_escalation_ticket ON cp_admin.escalation_records (ticket_id);
CREATE INDEX IF NOT EXISTS cp_admin_escalation_status ON cp_admin.escalation_records (escalation_status);

CREATE TABLE IF NOT EXISTS cp_admin.recommendation_metrics (
  id SERIAL PRIMARY KEY,
  metric_type TEXT NOT NULL,
  label TEXT NOT NULL,
  detail TEXT,
  category TEXT,
  acceptance_rate REAL,
  rejection_rate REAL,
  avg_confidence REAL,
  occurrence_count INTEGER NOT NULL DEFAULT 0,
  care_id TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cp_admin_rec_metrics_type ON cp_admin.recommendation_metrics (metric_type);

CREATE TABLE IF NOT EXISTS cp_admin.sync_issues (
  id SERIAL PRIMARY KEY,
  sync_log_id INTEGER REFERENCES cp_agent.sync_logs (id) ON DELETE SET NULL,
  summary TEXT NOT NULL,
  detail TEXT,
  severity TEXT NOT NULL DEFAULT 'warning',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cp_admin_sync_issues_occurred ON cp_admin.sync_issues (occurred_at DESC);

CREATE TABLE IF NOT EXISTS cp_admin.source_health (
  id SERIAL PRIMARY KEY,
  source_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'healthy',
  detail TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cp_admin.feedback_signals (
  id SERIAL PRIMARY KEY,
  care_id TEXT,
  summary TEXT NOT NULL,
  detail TEXT,
  severity TEXT NOT NULL DEFAULT 'info',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cp_admin_feedback_signals_detected ON cp_admin.feedback_signals (detected_at DESC);
