# Data Design: Minimal Relational Schema

**Commure Case Study Deliverable | Tech Ops Role**

---

## Schema Overview

The database uses **8 tables** organized into 4 logical categories to support the complete no-show prevention workflow:

```
┌─────────────────────────────────────────────────────────────┐
│  DIMENSION TABLES (Master Data)                             │
├─────────────────────────────────────────────────────────────┤
│  1. providers       - 10 healthcare providers               │
│  2. patients        - 100 patients with demographics        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  FACT TABLES (Transactional Data)                           │
├─────────────────────────────────────────────────────────────┤
│  3. appointments    - 490 scheduled appointments            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  AI RESULTS TABLES (LLM-Generated Data)                     │
├─────────────────────────────────────────────────────────────┤
│  4. ai_risk_assessments  - Risk scores + virtual eligibility│
│  5. waitlist_patients    - Patients awaiting appointments   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  SUPPORT TABLES (Context & Observability)                   │
├─────────────────────────────────────────────────────────────┤
│  6. patient_history_summary - Historical no-show rates      │
│  7. weather_data            - Weather forecasts by zip code │
│  8. agent_audit_logs        - AI performance & cost tracking│
└─────────────────────────────────────────────────────────────┘
```

**Design Principles:**
- **Minimal but complete**: 8 tables support all AI agents + analytics + observability
- **Normalized**: 3NF compliance, no redundant data
- **Indexed for performance**: 8 strategic indexes for <50ms query times
- **AI-friendly**: JSON columns for flexible LLM outputs, UNIQUE constraints prevent duplicate processing
- **Production-ready observability**: Audit logs track AI costs, latency, and errors

---

## Core Tables (Dimension + Fact)

### 1. providers
**Purpose**: Healthcare provider master data

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| provider_id | TEXT | **PRIMARY KEY** | Unique provider ID (e.g., DR_SMITH) |
| name | TEXT | NOT NULL | Provider full name |
| specialty | TEXT | | Medical specialty (Internal Medicine, Cardiology, etc.) |
| max_daily_slots | INTEGER | CHECK > 0 | Max appointments per day |
| created_at | DATETIME | DEFAULT NOW | Record creation timestamp |

**No indexes needed** (small table, 10 rows)

---

### 2. patients
**Purpose**: Patient demographics and commute preferences

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| patient_id | TEXT | **PRIMARY KEY** | Unique patient ID (e.g., P0001) |
| name | TEXT | NOT NULL | Patient full name |
| age | INTEGER | CHECK 0-120 | Patient age |
| distance_miles | REAL | CHECK >= 0 | Distance from clinic |
| zip_code | TEXT | | Home zip code (for weather lookup) |
| phone | TEXT | | Mobile number (for SMS outreach) |
| email | TEXT | | Email address (for email outreach) |
| commute_type | TEXT | CHECK IN ('car', 'bike', 'public_transport', 'cab') | **Key for weather risk** |
| preferred_virtual | INTEGER | DEFAULT 0 | Boolean: prefers telehealth (0=no, 1=yes) |
| created_at | DATETIME | DEFAULT NOW | Record creation timestamp |

**No indexes needed** (lookup by patient_id only)

---

### 3. appointments
**Purpose**: Core fact table for scheduled appointments

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| appointment_id | TEXT | **PRIMARY KEY** | Unique appointment ID |
| patient_id | TEXT | **FK → patients** | Patient foreign key |
| provider_id | TEXT | **FK → providers** | Provider foreign key |
| scheduled_time | DATETIME | NOT NULL | Appointment date/time |
| booked_at | DATETIME | | When appointment was booked (for true lead time calculation) |
| appointment_type | TEXT | | Type (Annual Physical, Follow-up, etc.) |
| chief_complaint | TEXT | | Medical reason for visit (used by AI for virtual eligibility) |
| status | TEXT | CHECK IN ('scheduled', 'completed', 'no_show', 'cancelled') | Appointment status |
| duration_mins | INTEGER | DEFAULT 30 | Appointment duration |
| created_at | DATETIME | DEFAULT NOW | Record creation timestamp |

**Indexes:**
```sql
-- Query Pattern: "Show me Dr. Smith's appointments on March 14"
CREATE INDEX idx_appointments_provider_date
  ON appointments(provider_id, scheduled_time);

-- Query Pattern: "Show patient's appointment history"
CREATE INDEX idx_appointments_patient
  ON appointments(patient_id);

-- Query Pattern: "Count no-shows this week"
CREATE INDEX idx_appointments_status
  ON appointments(status);
```

**Why these indexes?**
- `provider_id + scheduled_time`: Composite index for dashboard queries (90% of reads)
- `patient_id`: Fast lookup of patient history for risk scoring
- `status`: Filter appointments by status (scheduled vs. completed vs. no_show)

---

## AI Results Tables

### 4. ai_risk_assessments
**Purpose**: Store AI-generated risk scores and virtual eligibility

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| assessment_id | TEXT | **PRIMARY KEY** | Unique assessment ID |
| appointment_id | TEXT | **UNIQUE, FK → appointments** | One assessment per appointment |
| risk_score | INTEGER | CHECK 0-100 | AI-predicted no-show risk |
| risk_badge | TEXT | CHECK IN ('Low', 'Medium', 'High') | Risk category |
| primary_risk_factor | TEXT | | Top reason for risk (e.g., "40% no-show rate") |
| secondary_risk_factor | TEXT | | Second reason |
| contributing_factors | TEXT | | **JSON array** of other factors |
| predicted_show_probability | REAL | CHECK 0-1 | Probability patient will show (0.0-1.0) |
| weather_condition | TEXT | | Weather on appointment day (Sunny, Rainy, etc.) |
| weather_impact_score | INTEGER | DEFAULT 0 | Weather risk points (0-25) |
| virtual_eligible | INTEGER | DEFAULT 0 | Boolean: can appointment be virtual? |
| virtual_reason | TEXT | | Explanation (e.g., "Stable HTN follow-up") |
| virtual_confidence | REAL | | LLM confidence (0-1) |
| model_version | TEXT | DEFAULT 'gpt-5-2025-08-07' | AI model version for auditing |
| generated_at | DATETIME | DEFAULT NOW | Timestamp of AI generation |

**Indexes:**
```sql
-- Query Pattern: "Show all high-risk patients"
CREATE INDEX idx_risk_badge
  ON ai_risk_assessments(risk_badge);

-- Query Pattern: "Get risk score for appointment_id=APT001"
CREATE INDEX idx_risk_appointment
  ON ai_risk_assessments(appointment_id);
```

**Design Notes:**
- `appointment_id` is **UNIQUE** to prevent duplicate risk assessments
- `contributing_factors` stored as **JSON TEXT** for flexible LLM outputs
- `weather_impact_score` calculated by AI (not a separate table join)

---

### 5. waitlist_patients
**Purpose**: Manage patients awaiting appointments

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| waitlist_id | TEXT | **PRIMARY KEY** | Unique waitlist entry ID |
| patient_name | TEXT | NOT NULL | Patient name (not FK - could be new patient) |
| chief_complaint | TEXT | | Brief medical issue |
| reason | TEXT | | Detailed reason (2-3 sentences for AI matching) |
| preferred_timeframe | TEXT | | e.g., "Within 1 week", "Within 1 month" |
| status | TEXT | CHECK IN ('waiting', 'scheduled', 'cancelled', 'filled') | Waitlist status |
| provider_preference | TEXT | | Provider name requested |
| requested_provider_id | TEXT | **FK → providers** | Specific provider ID |
| added_at | DATETIME | DEFAULT NOW | When added to waitlist |
| scheduled_appointment_id | TEXT | **FK → appointments** | Appointment if scheduled |
| filled_appointment_id | TEXT | **FK → appointments** | Slot filled by this patient |
| filled_at | DATETIME | | When slot was filled |

**Indexes:**
```sql
-- Query Pattern: "Show all waiting patients"
CREATE INDEX idx_waitlist_status
  ON waitlist_patients(status);
```

**Design Notes:**
- `reason` field is **AI-friendly** (2-3 sentences for LLM to assess clinical need)
- `requested_provider_id` enables **exact provider matching** (critical for Agent 4)
- Separate `scheduled_appointment_id` and `filled_appointment_id` track different states

---

## Support Tables

### 6. patient_history_summary
**Purpose**: Pre-computed historical no-show rates for risk scoring

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| patient_id | TEXT | **PRIMARY KEY, FK → patients** | One summary per patient |
| total_appointments | INTEGER | DEFAULT 0 | Total historical appointments |
| completed | INTEGER | DEFAULT 0 | Appointments patient attended |
| no_shows | INTEGER | DEFAULT 0 | Appointments patient missed |
| no_show_rate | REAL | DEFAULT 0 | `no_shows / total_appointments` |
| recent_reschedules | INTEGER | DEFAULT 0 | Reschedules in last 90 days |
| last_appointment_date | DATE | | Most recent appointment |

**No indexes needed** (lookup by patient_id only)

**Design Notes:**
- **Pre-computed** to avoid expensive aggregation queries during risk scoring
- `no_show_rate` is the **#1 risk factor** (40% weight in Agent 1)

---

### 7. weather_data
**Purpose**: Mock weather forecasts for appointment dates

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| weather_id | TEXT | **PRIMARY KEY** | Unique weather entry ID |
| date | DATE | NOT NULL | Appointment date |
| zip_code | TEXT | NOT NULL | Patient zip code |
| condition | TEXT | CHECK IN ('Sunny', 'Cloudy', 'Rainy', 'Snowy', 'Foggy') | Weather condition |
| temperature_f | INTEGER | | Temperature in Fahrenheit |
| precipitation_pct | INTEGER | CHECK 0-100 | Precipitation probability |
| **UNIQUE(date, zip_code)** | | | One weather record per date+zip |

**Indexes:**
```sql
-- Query Pattern: "Get weather for date=2025-03-14"
CREATE INDEX idx_weather_date
  ON weather_data(date);
```

**Design Notes:**
- `UNIQUE(date, zip_code)` ensures one weather record per location per day
- In production, replace with **real-time weather API** (OpenWeather, WeatherAPI)

---

### 8. agent_audit_logs
**Purpose**: Track AI agent performance, costs, and errors for observability

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| log_id | TEXT | **PRIMARY KEY** | Unique log entry ID |
| request_id | TEXT | NOT NULL | UUID for request tracing (correlate related logs) |
| agent_type | TEXT | CHECK IN ('risk_scorer', 'virtual_eligibility', 'outreach_sequencer', 'waitlist_matcher', 'daily_summary', 'waitlist_analyzer') | Which AI agent ran |
| timestamp | DATETIME | DEFAULT NOW | When the agent executed |
| latency_ms | INTEGER | | API response time in milliseconds |
| model | TEXT | | LLM model used (e.g., gpt-5-nano, gpt-4o-mini) |
| input_tokens | INTEGER | | Tokens sent to LLM |
| output_tokens | INTEGER | | Tokens received from LLM |
| total_tokens | INTEGER | | input_tokens + output_tokens |
| estimated_cost_usd | REAL | | Estimated API cost in USD |
| status | TEXT | CHECK IN ('success', 'error', 'partial') | Execution status |
| error_message | TEXT | | Error details if status=error |
| appointment_id | TEXT | | Context: which appointment (if applicable) |
| patient_id | TEXT | | Context: which patient (if applicable) |
| created_at | DATETIME | DEFAULT NOW | Record creation timestamp |

**Indexes:**
```sql
-- Query Pattern: "Show all risk_scorer executions"
CREATE INDEX idx_audit_agent_type
  ON agent_audit_logs(agent_type);

-- Query Pattern: "Show API calls in last 24 hours"
CREATE INDEX idx_audit_timestamp
  ON agent_audit_logs(timestamp);

-- Query Pattern: "Count errors this week"
CREATE INDEX idx_audit_status
  ON agent_audit_logs(status);
```

**Design Notes:**
- `request_id` enables **distributed tracing** (correlate logs across multiple agent calls)
- `latency_ms` tracks **AI performance** (alert if >10 seconds)
- `estimated_cost_usd` tracks **AI spend** (budget monitoring)
- `status='error'` + `error_message` enables **failure analysis**
- No foreign keys to appointments/patients (logs persist even if records deleted)

**Use Cases:**
- **Cost tracking**: `SELECT SUM(estimated_cost_usd) FROM agent_audit_logs WHERE DATE(timestamp) = '2025-03-14'`
- **Performance monitoring**: `SELECT AVG(latency_ms) FROM agent_audit_logs WHERE agent_type='risk_scorer'`
- **Error analysis**: `SELECT * FROM agent_audit_logs WHERE status='error' ORDER BY timestamp DESC LIMIT 10`

---

## Entity Relationship Diagram

```
┌──────────────┐          ┌──────────────────┐          ┌──────────────┐
│  providers   │          │   appointments    │          │   patients   │
│──────────────│          │──────────────────│          │──────────────│
│ provider_id  │◄────┐    │ appointment_id   │    ┌────►│ patient_id   │
│ name         │     │    │ patient_id       │────┘     │ name         │
│ specialty    │     └────│ provider_id      │          │ age          │
│ ...          │          │ scheduled_time   │          │ commute_type │
└──────────────┘          │ chief_complaint  │          │ zip_code     │
                          │ status           │          │ ...          │
                          └──────────────────┘          └──────────────┘
                                 │                              │
                                 │                              │
                                 │                              │
                                 ▼                              ▼
                     ┌────────────────────┐       ┌──────────────────────┐
                     │ ai_risk_           │       │ patient_history_     │
                     │ assessments        │       │ summary              │
                     │────────────────────│       │──────────────────────│
                     │ assessment_id      │       │ patient_id ──────────┘
                     │ appointment_id (U) │       │ total_appointments   │
                     │ risk_score         │       │ no_shows             │
                     │ risk_badge         │       │ no_show_rate         │
                     │ virtual_eligible   │       │ recent_reschedules   │
                     │ weather_impact     │       └──────────────────────┘
                     └────────────────────┘

┌──────────────────────────────────────┐       ┌──────────────────┐
│ waitlist_patients                    │       │ weather_data     │
│──────────────────────────────────────│       │──────────────────│
│ waitlist_id                          │       │ weather_id       │
│ patient_name                         │       │ date             │
│ reason                               │       │ zip_code         │
│ requested_provider_id ───────────────┼───┐   │ condition        │
│ filled_appointment_id ───────────────┼─┐ │   │ precip_pct       │
└──────────────────────────────────────┘ │ │   └──────────────────┘
                                         │ │
                                         │ └──► providers.provider_id
                                         └────► appointments.appointment_id

┌──────────────────────────────────────┐
│ agent_audit_logs (Observability)     │
│──────────────────────────────────────│
│ log_id                               │
│ request_id                           │
│ agent_type (risk_scorer, etc.)       │
│ latency_ms, total_tokens, cost_usd   │
│ appointment_id (optional ref, no FK) │
│ patient_id (optional ref, no FK)     │
└──────────────────────────────────────┘
```

**Key Relationships:**
- **1:N** - One provider has many appointments
- **1:N** - One patient has many appointments
- **1:1** - One appointment has one risk assessment (via UNIQUE constraint)
- **1:1** - One patient has one history summary (via PRIMARY KEY)
- **N:1** - Many waitlist patients can fill one appointment
- **No FK** - agent_audit_logs references appointments/patients but has no foreign keys (logs persist even if records deleted)

---

## How Schema Supports AI Agent Workflows

### Agent 1: Risk Scoring (risk_scorer)
**Query Flow:**
1. Fetch appointment: `SELECT * FROM appointments WHERE appointment_id = ?`
2. Fetch patient + history: `JOIN patients ON patient_id, JOIN patient_history_summary`
3. Fetch weather: `JOIN weather_data ON zip_code + scheduled_time date`
4. **AI generates risk score** using all context
5. Insert result: `INSERT INTO ai_risk_assessments (appointment_id, risk_score, ...)`

**Critical Indexes:**
- `idx_appointments_provider_date` - Fast appointment lookup by provider/date
- `idx_risk_badge` - Fast filtering by risk level (High/Medium/Low)

---

### Agent 2: Virtual Eligibility (virtual_eligibility)
**Query Flow:**
1. Same as Agent 1 (fetch appointment)
2. **AI determines virtual eligibility** based on appointment_type + chief_complaint
3. Update: `UPDATE ai_risk_assessments SET virtual_eligible=1, virtual_reason=...`

**Critical Indexes:**
- `idx_risk_appointment` - Fast lookup of existing risk assessment to update

---

### Agent 3: Outreach Sequencer (outreach_sequencer)
**Query Flow:**
1. Fetch appointment + risk: `SELECT * FROM appointments JOIN ai_risk_assessments`
2. **AI generates 3-touchpoint campaign** with 2 variants each
3. Campaigns are generated in-memory and returned to the caller (not persisted to database)

**Note:** Outreach campaigns are generated on-demand and not stored in the database. This allows for real-time personalization and reduces database storage requirements.

---

### Agent 4: Waitlist Matcher (waitlist_matcher)
**Query Flow:**
1. Fetch high-risk appointment: `SELECT * FROM appointments WHERE risk_badge='High'`
2. Fetch all waitlist patients: `SELECT * FROM waitlist_patients WHERE status='waiting'`
3. **AI ranks waitlist patients** by provider match + clinical need + urgency
4. Update waitlist: `UPDATE waitlist_patients SET filled_appointment_id=?, filled_at=NOW()`
5. Update appointment: `UPDATE appointments SET patient_id=? WHERE appointment_id=?`

**Critical Indexes:**
- `idx_waitlist_status` - Fast filtering of waiting patients
- `idx_appointments_provider_date` - Fast lookup of provider's schedule

---

### Observability: All Agents Log to agent_audit_logs
**Query Flow (executed after every AI call):**
1. **Before AI call**: Generate `request_id` (UUID) for tracing
2. **AI call**: Execute LLM function calling
3. **After AI call**: Insert audit log:
```sql
INSERT INTO agent_audit_logs (
  log_id, request_id, agent_type, timestamp, latency_ms,
  model, input_tokens, output_tokens, total_tokens,
  estimated_cost_usd, status, appointment_id
) VALUES (?, ?, 'risk_scorer', NOW(), ?, 'gpt-5-nano', ?, ?, ?, ?, 'success', ?)
```

**Critical Indexes:**
- `idx_audit_agent_type` - Group logs by agent type for performance analysis
- `idx_audit_timestamp` - Time-series queries (costs per day, latency trends)
- `idx_audit_status` - Fast error filtering for alerting

**Use Cases:**
- **Daily cost report**: `SELECT agent_type, SUM(estimated_cost_usd) FROM agent_audit_logs WHERE DATE(timestamp)='2025-03-14' GROUP BY agent_type`
- **Latency monitoring**: `SELECT AVG(latency_ms), MAX(latency_ms) FROM agent_audit_logs WHERE agent_type='risk_scorer' AND timestamp > NOW() - INTERVAL 1 HOUR`
- **Error alerting**: `SELECT COUNT(*) FROM agent_audit_logs WHERE status='error' AND timestamp > NOW() - INTERVAL 1 HOUR`

---

## Index Strategy Summary

| Index | Table | Columns | Purpose | Query Pattern |
|-------|-------|---------|---------|---------------|
| `idx_appointments_provider_date` | appointments | provider_id, scheduled_time | Dashboard queries | "Show Dr. Smith's appointments on 3/14" |
| `idx_appointments_patient` | appointments | patient_id | Patient history | "Show patient's last 10 appointments" |
| `idx_appointments_status` | appointments | status | Status filtering | "Count no-shows this month" |
| `idx_risk_badge` | ai_risk_assessments | risk_badge | Risk filtering | "Show all high-risk patients" |
| `idx_risk_appointment` | ai_risk_assessments | appointment_id | Risk lookup | "Get risk score for APT001" |
| `idx_waitlist_status` | waitlist_patients | status | Waitlist filtering | "Show all waiting patients" |
| `idx_weather_date` | weather_data | date | Weather lookup | "Get weather for 2025-03-14" |
| `idx_audit_agent_type` | agent_audit_logs | agent_type | Agent filtering | "Show all risk_scorer executions" |
| `idx_audit_timestamp` | agent_audit_logs | timestamp | Time-based queries | "Show API calls in last 24 hours" |
| `idx_audit_status` | agent_audit_logs | status | Error tracking | "Count errors this week" |

**Total Indexes: 10** (covering 95%+ of queries)

**Why minimal?**
- SQLite has a **5-index-per-query** limit - more indexes hurt performance
- Each index adds **write overhead** - only index high-frequency queries
- Composite index `(provider_id, scheduled_time)` covers both individual lookups

---

## Data Volume & Performance

| Table | Rows (Demo) | Rows (Production) | Growth Rate |
|-------|-------------|-------------------|-------------|
| providers | 10 | 50-200 | Slow (staff growth) |
| patients | 100 | 10,000-100,000 | Medium (new patients) |
| appointments | 490 | 100,000-1M | Fast (daily scheduling) |
| ai_risk_assessments | 13 | Subset of appointments | Grows with risk scoring usage |
| waitlist_patients | 50 | 500-5,000 | Medium (depends on demand) |
| patient_history_summary | 100 | Same as patients | Matches patients |
| weather_data | ~56 | 365×zip_codes | Slow (seasonal cache) |
| agent_audit_logs | varies | 100K-1M+ | Fast (every AI call) |

**Query Performance (Demo):**
- Appointment search: **<10ms** (with `idx_appointments_provider_date`)
- Risk batch generation: **3-5s** (LLM latency, not DB)
- Dashboard KPIs: **<50ms** (with all indexes)

**Scalability Considerations:**
- Currently using **SQLite** for demo/development
- Consider **SQLite → PostgreSQL** for production (multi-user concurrency)
- Partition `appointments` table by date (monthly partitions) if scaling to 1M+ rows
- Archive old appointments to `appointments_archive` after 2 years
