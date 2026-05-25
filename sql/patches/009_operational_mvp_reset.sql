-- Operational MVP reset: keep care_source + cp_agent (core) + carepilot auth only.
-- Run: bun run db:reset:operational-mvp

-- cp_agent: drop legacy AI / KM / procedure tables (tickets + sync_logs + audit_logs + users remain)
DROP TABLE IF EXISTS cp_agent.km_suggestions CASCADE;
DROP TABLE IF EXISTS cp_agent.ai_feedback CASCADE;
DROP TABLE IF EXISTS cp_agent.ai_analyses CASCADE;
DROP TABLE IF EXISTS cp_agent.ticket_procedure_links CASCADE;
DROP TABLE IF EXISTS cp_agent.km_references CASCADE;
DROP TABLE IF EXISTS cp_agent.procedures CASCADE;
DROP TABLE IF EXISTS cp_agent.sync_settings CASCADE;

-- Optional sync children (re-sync later if needed)
DROP TABLE IF EXISTS cp_agent.ticket_comments CASCADE;
DROP TABLE IF EXISTS cp_agent.ticket_history CASCADE;

-- cp_admin: legacy operational signals (dashboard no longer uses)
DROP SCHEMA IF EXISTS cp_admin CASCADE;

-- carepilot: legacy ticket sync / AI pipeline (auth tables kept)
DROP TABLE IF EXISTS carepilot.km_recommendations CASCADE;
DROP TABLE IF EXISTS carepilot.decision_suggestions CASCADE;
DROP TABLE IF EXISTS carepilot.similar_ticket_results CASCADE;
DROP TABLE IF EXISTS carepilot.ticket_analysis CASCADE;
DROP TABLE IF EXISTS carepilot.ticket_timeline_events CASCADE;
DROP TABLE IF EXISTS carepilot.golden_test_cases CASCADE;
DROP TABLE IF EXISTS carepilot.sync_logs CASCADE;
DROP TABLE IF EXISTS carepilot.tickets CASCADE;
