-- ============================================================================
-- Commure Pulse - SQLite Database Schema
-- Version: 2.0 (v0 Prototype with State Tracking)
-- Database: SQLite 3
-- ============================================================================

-- ============================================================================
-- DIMENSION TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS providers (
  provider_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  specialty TEXT,
  max_daily_slots INTEGER CHECK (max_daily_slots > 0),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patients (
  patient_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER CHECK (age >= 0 AND age <= 120),
  distance_miles REAL CHECK (distance_miles >= 0),
  zip_code TEXT,
  phone TEXT,
  email TEXT,
  commute_type TEXT CHECK (commute_type IN ('car', 'bike', 'public_transport', 'cab')),
  preferred_virtual INTEGER DEFAULT 0,  -- SQLite uses INTEGER for BOOLEAN (0=false, 1=true)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- FACT TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS appointments (
  appointment_id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  scheduled_time DATETIME NOT NULL,
  booked_at DATETIME,  -- When the appointment was scheduled (for true lead time calculation)
  appointment_type TEXT,
  chief_complaint TEXT,
  status TEXT CHECK (status IN ('scheduled', 'completed', 'no_show', 'cancelled')) DEFAULT 'scheduled',
  duration_mins INTEGER DEFAULT 30 CHECK (duration_mins > 0),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
  FOREIGN KEY (provider_id) REFERENCES providers(provider_id)
);

CREATE INDEX IF NOT EXISTS idx_appointments_provider_date ON appointments(provider_id, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- ============================================================================
-- AI RESULTS TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_risk_assessments (
  assessment_id TEXT PRIMARY KEY,
  appointment_id TEXT UNIQUE NOT NULL,
  risk_score INTEGER CHECK (risk_score BETWEEN 0 AND 100),
  risk_badge TEXT CHECK (risk_badge IN ('Low', 'Medium', 'High')),
  primary_risk_factor TEXT,
  secondary_risk_factor TEXT,
  contributing_factors TEXT,  -- JSON array stored as TEXT
  predicted_show_probability REAL CHECK (predicted_show_probability BETWEEN 0 AND 1),

  -- Weather-related
  weather_condition TEXT,
  weather_impact_score INTEGER DEFAULT 0,

  -- Virtual eligibility
  virtual_eligible INTEGER DEFAULT 0,  -- 0=false, 1=true
  virtual_reason TEXT,
  virtual_confidence REAL,

  -- Metadata
  model_version TEXT DEFAULT 'gpt-5-2025-08-07',
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id)
);

CREATE INDEX IF NOT EXISTS idx_risk_badge ON ai_risk_assessments(risk_badge);
CREATE INDEX IF NOT EXISTS idx_risk_appointment ON ai_risk_assessments(appointment_id);


-- ============================================================================
-- OUTREACH CAMPAIGNS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS outreach_campaigns (
  campaign_id TEXT PRIMARY KEY,
  appointment_id TEXT UNIQUE NOT NULL,
  risk_assessment_id TEXT,
  sequence_json TEXT,  -- Full campaign JSON (3 touchpoints × 2 variants)
  num_touchpoints INTEGER,

  -- Touchpoint 1 tracking (Email)
  email_1_sent INTEGER DEFAULT 0,  -- 0=false, 1=true
  email_1_sent_at DATETIME,
  email_1_variant TEXT,  -- 'A' or 'B'

  -- Touchpoint 2 tracking (Email)
  email_2_sent INTEGER DEFAULT 0,
  email_2_sent_at DATETIME,
  email_2_variant TEXT,

  -- Touchpoint 3 tracking (SMS)
  sms_1_sent INTEGER DEFAULT 0,
  sms_1_sent_at DATETIME,
  sms_1_variant TEXT,

  -- Patient response tracking
  patient_responded INTEGER DEFAULT 0,
  response_type TEXT CHECK (response_type IN ('confirmed', 'rescheduled', 'cancelled') OR response_type IS NULL),
  response_at DATETIME,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id),
  FOREIGN KEY (risk_assessment_id) REFERENCES ai_risk_assessments(assessment_id)
);

CREATE INDEX IF NOT EXISTS idx_outreach_appointment ON outreach_campaigns(appointment_id);


-- ============================================================================
-- WAITLIST TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS waitlist_patients (
  waitlist_id TEXT PRIMARY KEY,
  patient_name TEXT NOT NULL,
  chief_complaint TEXT,
  reason TEXT, -- Detailed reason for visit (2-3 sentences)
  preferred_timeframe TEXT, -- e.g., "Within 1 week", "Within 2 weeks", "Within 1 month", "Flexible"
  status TEXT CHECK (status IN ('waiting', 'scheduled', 'cancelled', 'filled')) DEFAULT 'waiting',
  provider_preference TEXT,
  requested_provider_id TEXT, -- Specific provider ID requested
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  scheduled_appointment_id TEXT,
  filled_appointment_id TEXT, -- Appointment assigned to this waitlist patient
  filled_at DATETIME, -- When the slot was filled

  FOREIGN KEY (scheduled_appointment_id) REFERENCES appointments(appointment_id),
  FOREIGN KEY (filled_appointment_id) REFERENCES appointments(appointment_id),
  FOREIGN KEY (requested_provider_id) REFERENCES providers(provider_id)
);

CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist_patients(status);

-- ============================================================================
-- PATIENT HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS patient_history_summary (
  patient_id TEXT PRIMARY KEY,
  total_appointments INTEGER DEFAULT 0,
  completed INTEGER DEFAULT 0,
  no_shows INTEGER DEFAULT 0,
  no_show_rate REAL DEFAULT 0,
  recent_reschedules INTEGER DEFAULT 0,
  last_appointment_date DATE,

  FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

-- ============================================================================
-- WEATHER DATA TABLE (Mock data for the week)
-- ============================================================================

CREATE TABLE IF NOT EXISTS weather_data (
  weather_id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  zip_code TEXT NOT NULL,
  condition TEXT CHECK (condition IN ('Sunny', 'Cloudy', 'Rainy', 'Snowy', 'Foggy')),
  temperature_f INTEGER,
  precipitation_pct INTEGER CHECK (precipitation_pct BETWEEN 0 AND 100),

  UNIQUE(date, zip_code)
);

CREATE INDEX IF NOT EXISTS idx_weather_date ON weather_data(date);

-- ============================================================================
-- AGENT AUDIT LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_audit_logs (
  log_id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,  -- UUID for request tracing
  agent_type TEXT NOT NULL CHECK (agent_type IN (
    'risk_scorer',
    'virtual_eligibility',
    'outreach_sequencer',
    'waitlist_matcher',
    'daily_summary',
    'waitlist_analyzer'
  )),

  -- Timing and performance
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  latency_ms INTEGER,

  -- LLM details
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  estimated_cost_usd REAL,

  -- Status
  status TEXT CHECK (status IN ('success', 'error', 'partial')) DEFAULT 'success',
  error_message TEXT,

  -- Context (optional - what was being processed)
  appointment_id TEXT,
  patient_id TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_agent_type ON agent_audit_logs(agent_type);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON agent_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_status ON agent_audit_logs(status);

-- ============================================================================
-- VIEWS FOR ANALYTICS
-- ============================================================================

-- View: Patient table with risk scores
CREATE VIEW IF NOT EXISTS v_patients_with_risk AS
SELECT
  a.appointment_id,
  a.scheduled_time,
  a.appointment_type,
  a.chief_complaint,
  a.status,
  p.name as patient_name,
  p.commute_type,
  pr.name as provider_name,
  pr.specialty,
  r.risk_score,
  r.risk_badge,
  r.virtual_eligible,
  r.virtual_reason,
  r.weather_condition
FROM appointments a
JOIN patients p ON a.patient_id = p.patient_id
JOIN providers pr ON a.provider_id = pr.provider_id
LEFT JOIN ai_risk_assessments r ON a.appointment_id = r.appointment_id;

-- View: KPI summary
CREATE VIEW IF NOT EXISTS v_kpi_summary AS
SELECT
  DATE(scheduled_time) as date,
  provider_id,
  COUNT(*) as total_appointments,
  SUM(CASE WHEN r.risk_badge = 'High' THEN 1 ELSE 0 END) as high_risk_count,
  SUM(CASE WHEN r.virtual_eligible = 1 THEN 1 ELSE 0 END) as virtual_eligible_count
FROM appointments a
LEFT JOIN ai_risk_assessments r ON a.appointment_id = r.appointment_id
WHERE a.status = 'scheduled'
GROUP BY DATE(scheduled_time), provider_id;

-- ============================================================================
-- COMMENTS
-- ============================================================================

-- This schema supports:
-- 1. Persistent AI risk assessments with weather integration
-- 2. Virtual eligibility tracking (LLM-generated)
-- 3. Waitlist management with priority levels
-- 4. Patient history for risk scoring
-- 5. Weather data for risk calculation
-- 6. Analytics views for dashboard KPIs
