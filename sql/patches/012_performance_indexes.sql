-- Performance indexes for hot query paths (open queue, ticket detail, trends).

CREATE INDEX IF NOT EXISTS cp_agent_tickets_created_at
  ON cp_agent.tickets (created_at DESC);

CREATE INDEX IF NOT EXISTS cp_agent_tickets_updated_at
  ON cp_agent.tickets (updated_at DESC);

CREATE INDEX IF NOT EXISTS cp_agent_tickets_category
  ON cp_agent.tickets (category);

CREATE INDEX IF NOT EXISTS cp_agent_tickets_store_code
  ON cp_agent.tickets (store_code);

CREATE INDEX IF NOT EXISTS cp_agent_comments_ticket
  ON cp_agent.ticket_comments (ticket_id);

CREATE INDEX IF NOT EXISTS cp_agent_tickets_open_care_queue
  ON cp_agent.tickets (status, created_at DESC)
  WHERE source = 'CARE';

CREATE INDEX IF NOT EXISTS cp_agent_hist_ticket_event
  ON cp_agent.ticket_history (ticket_id, event_type, occurred_at DESC);
