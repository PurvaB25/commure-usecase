-- ============================================================================
-- Commure Utilization Agent - Database Schema (Simplified Star Schema)
-- Version: 1.0 (v0 Prototype)
-- Database: PostgreSQL 14+
-- ============================================================================

-- DIMENSION TABLES (Simplified for v0)

-- ============================================================================
-- dim_providers: Provider directory
-- ============================================================================
CREATE TABLE dim_providers (
    provider_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    specialty TEXT,
    max_daily_slots INTEGER CHECK (max_daily_slots > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dim_providers IS 'Provider directory with capacity constraints';
COMMENT ON COLUMN dim_providers.max_daily_slots IS 'Maximum appointment slots per day for utilization calculations';

-- ============================================================================
-- dim_patients: Patient directory
-- ============================================================================
CREATE TABLE dim_patients (
    patient_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER CHECK (age >= 0 AND age <= 120),
    distance_miles DECIMAL(5,2) CHECK (distance_miles >= 0),
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dim_patients IS 'Patient directory with key demographics for risk scoring';
COMMENT ON COLUMN dim_patients.distance_miles IS 'Distance from clinic (used in no-show risk calculation)';


-- FACT TABLES

-- ============================================================================
-- fact_appointments: Core appointment transactions
-- ============================================================================
CREATE TABLE fact_appointments (
    appointment_id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES dim_patients(patient_id),
    provider_id TEXT NOT NULL REFERENCES dim_providers(provider_id),
    scheduled_time TIMESTAMP NOT NULL,
    appointment_type TEXT,  -- e.g., 'Annual Physical', 'Follow-up', 'New Patient'
    status TEXT NOT NULL CHECK (status IN ('scheduled', 'completed', 'no_show', 'cancelled')),
    duration_mins INTEGER DEFAULT 30 CHECK (duration_mins > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE fact_appointments IS 'Core fact table for all appointments';
COMMENT ON COLUMN fact_appointments.appointment_type IS 'Stored as text for v0 flexibility (could normalize to dim_appointment_types in production)';
COMMENT ON COLUMN fact_appointments.status IS 'Current appointment status';

-- ============================================================================
-- fact_no_show_risk_scores: Agent 2 outputs (risk predictions)
-- ============================================================================
CREATE TABLE fact_no_show_risk_scores (
    score_id TEXT PRIMARY KEY,
    appointment_id TEXT NOT NULL REFERENCES fact_appointments(appointment_id),
    risk_score INTEGER NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
    risk_badge TEXT NOT NULL CHECK (risk_badge IN ('Low', 'Medium', 'High')),
    primary_risk_factor TEXT,
    secondary_risk_factor TEXT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE fact_no_show_risk_scores IS 'AI-generated no-show risk assessments (Agent 2 outputs)';
COMMENT ON COLUMN fact_no_show_risk_scores.risk_score IS 'Risk score from 0 (will show) to 100 (will no-show)';
COMMENT ON COLUMN fact_no_show_risk_scores.risk_badge IS 'Categorical risk level for UI display';

-- ============================================================================
-- fact_outreach_sequences: Agent 3 outputs (outreach campaigns)
-- ============================================================================
CREATE TABLE fact_outreach_sequences (
    sequence_id TEXT PRIMARY KEY,
    appointment_id TEXT NOT NULL REFERENCES fact_appointments(appointment_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    num_touchpoints INTEGER CHECK (num_touchpoints >= 1),
    sequence_json JSONB NOT NULL  -- Stores full sequence: touchpoints, messages, timing, variants
);

COMMENT ON TABLE fact_outreach_sequences IS 'AI-generated outreach campaigns (Agent 3 outputs)';
COMMENT ON COLUMN fact_outreach_sequences.sequence_json IS 'Full sequence data stored as JSONB for v0 flexibility. Structure: {touchpoints: [{timing, channel, variants: [{tone, message}]}]}';

-- Example sequence_json structure:
-- {
--   "touchpoints": [
--     {
--       "timing": "7 days before",
--       "send_date": "2025-03-07T09:00:00",
--       "channel": "SMS",
--       "variants": [
--         {"tone": "friendly", "message": "Hi Sarah! Your appointment...", "char_count": 147},
--         {"tone": "urgent", "message": "Sarah - Your appointment...", "char_count": 134}
--       ]
--     }
--   ]
-- }

-- ============================================================================
-- fact_capacity_optimizations: Agent 1 outputs (capacity analysis)
-- ============================================================================
CREATE TABLE fact_capacity_optimizations (
    optimization_id TEXT PRIMARY KEY,
    analysis_date DATE NOT NULL,
    proposals_json JSONB NOT NULL,  -- Stores all proposals with details
    num_proposals INTEGER CHECK (num_proposals >= 0),
    num_applied INTEGER DEFAULT 0 CHECK (num_applied >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE fact_capacity_optimizations IS 'AI-generated capacity optimization proposals (Agent 1 outputs)';
COMMENT ON COLUMN fact_capacity_optimizations.proposals_json IS 'All reschedule proposals stored as JSONB for v0 flexibility. Structure: {bottlenecks: [...], proposals: [{patient_id, from_provider, to_provider, reason, ...}]}';

-- Example proposals_json structure:
-- {
--   "bottlenecks": [
--     {"provider_id": "DR_SMITH", "provider_name": "Dr. Smith", "issue": "94% utilization, 2+ hour wait"}
--   ],
--   "proposals": [
--     {
--       "proposal_id": "PROP_001",
--       "patient_id": "P4782",
--       "from_provider_id": "DR_SMITH",
--       "to_provider_id": "DR_JONES",
--       "from_time": "2025-03-14T15:00:00",
--       "to_time": "2025-03-14T15:00:00",
--       "reason": "Jones has 11 open slots, same specialty",
--       "expected_impact": "Reduces wait time by 15 minutes"
--     }
--   ]
-- }


-- INDEXES (Optimized for common query patterns)

-- Appointments by provider and date (for utilization queries)
CREATE INDEX idx_appointments_provider_date ON fact_appointments(provider_id, DATE(scheduled_time));

-- Appointments by patient (for history lookups)
CREATE INDEX idx_appointments_patient ON fact_appointments(patient_id, scheduled_time DESC);

-- Appointments by status and time (for operational queries)
CREATE INDEX idx_appointments_status_time ON fact_appointments(status, scheduled_time);

-- Risk scores by appointment (for joining with appointments)
CREATE INDEX idx_risk_scores_appointment ON fact_no_show_risk_scores(appointment_id);

-- Outreach sequences by appointment (for joining with appointments)
CREATE INDEX idx_outreach_appointment ON fact_outreach_sequences(appointment_id);

-- Capacity optimizations by date (for historical analysis)
CREATE INDEX idx_capacity_opt_date ON fact_capacity_optimizations(analysis_date DESC);

-- JSONB indexes for querying inside JSON columns (PostgreSQL GIN indexes)
CREATE INDEX idx_outreach_json ON fact_outreach_sequences USING GIN (sequence_json);
CREATE INDEX idx_capacity_json ON fact_capacity_optimizations USING GIN (proposals_json);


-- ============================================================================
-- SAMPLE DATA (For testing/demo purposes)
-- ============================================================================

-- Sample providers
INSERT INTO dim_providers (provider_id, name, specialty, max_daily_slots) VALUES
('DR_SMITH', 'Dr. Emily Smith', 'Internal Medicine', 20),
('DR_JONES', 'Dr. Michael Jones', 'Internal Medicine', 20),
('DR_PATEL', 'Dr. Priya Patel', 'Family Medicine', 18),
('DR_WILLIAMS', 'Dr. Sarah Williams', 'Cardiology', 15),
('DR_CHEN', 'Dr. David Chen', 'Pediatrics', 22);

-- Sample patients
INSERT INTO dim_patients (patient_id, name, age, distance_miles, phone, email) VALUES
('P4782', 'Sarah Johnson', 28, 15.3, '555-0101', 'sarah.j@email.com'),
('P5123', 'Marcus Lee', 45, 8.7, '555-0102', 'marcus.l@email.com'),
('P6234', 'Lisa Park', 52, 22.1, '555-0103', 'lisa.p@email.com'),
('P7345', 'James Wilson', 34, 5.2, '555-0104', 'james.w@email.com'),
('P8456', 'Maria Garcia', 61, 12.8, '555-0105', 'maria.g@email.com');

-- Sample appointments
INSERT INTO fact_appointments (appointment_id, patient_id, provider_id, scheduled_time, appointment_type, status, duration_mins) VALUES
('A001', 'P4782', 'DR_SMITH', '2025-03-14 15:00:00', 'Annual Physical', 'scheduled', 45),
('A002', 'P5123', 'DR_SMITH', '2025-03-14 16:00:00', 'Follow-up', 'scheduled', 30),
('A003', 'P6234', 'DR_JONES', '2025-03-14 15:00:00', 'New Patient', 'scheduled', 60),
('A004', 'P7345', 'DR_PATEL', '2025-03-14 10:00:00', 'Annual Physical', 'scheduled', 45),
('A005', 'P8456', 'DR_WILLIAMS', '2025-03-14 14:00:00', 'Cardiology Consult', 'scheduled', 30);


-- ============================================================================
-- PRODUCTION MIGRATION NOTES
-- ============================================================================

-- For production, consider:
--
-- 1. Normalize JSONB columns into separate tables:
--    - fact_outreach_touchpoints (one row per message sent)
--    - fact_capacity_proposals (one row per reschedule proposal)
--
-- 2. Add audit columns:
--    - created_by TEXT (user who triggered the action)
--    - updated_by TEXT
--    - version INTEGER (for optimistic locking)
--
-- 3. Add dimension tables if needed:
--    - dim_appointment_types (if type-specific logic becomes complex)
--    - dim_dates (if extensive date-based analytics required)
--
-- 4. Add constraints:
--    - Foreign key from fact_capacity_optimizations to dim_providers
--    - Check constraints on JSONB schemas (PostgreSQL 14+ supports JSON schema validation)
--
-- 5. Add partitioning:
--    - Partition fact_appointments by scheduled_time (monthly or quarterly)
--    - Improves query performance for large datasets
--
-- 6. Add materialized views:
--    - Daily provider utilization summary
--    - Monthly no-show rate by risk badge
--    - Outreach campaign effectiveness metrics
