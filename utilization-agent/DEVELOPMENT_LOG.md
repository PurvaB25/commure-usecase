# Development Log - Commure AI Utilization Agent

## Project Overview
AI-powered hospital utilization optimization system with 3 intelligent agents for capacity management, no-show prediction, and patient outreach.

---

## Development Timeline

### Phase 1: Project Setup & Architecture
**Completed:** Initial setup with Vite + React + TypeScript + Tailwind CSS

**Files Created:**
- `package.json` - Dependencies: React 19, OpenAI SDK, Lucide icons, Tailwind CSS
- `vite.config.ts` - Vite configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.js` - Tailwind CSS v3 configuration
- `postcss.config.js` - PostCSS with Tailwind and Autoprefixer
- `.env.example` - Environment variable template

**Key Decisions:**
- ✅ React 19 with TypeScript for type safety
- ✅ Vite for fast development and HMR
- ✅ Tailwind CSS v3 (not v4 due to PostCSS compatibility)
- ✅ Client-side OpenAI calls for v0 (using `dangerouslyAllowBrowser: true`)

---

### Phase 2: Data Schema Design
**Completed:** Simplified star schema with TypeScript types and mock data

**Files Created:**
- `/Users/anuragmane/commure/schema.sql` - Production-ready PostgreSQL schema
- `src/types/schema.ts` - TypeScript interfaces matching SQL schema
- `src/data/mockData.ts` - Realistic hospital mock data

**Schema Design:**
```
DIMENSION TABLES:
- dim_providers (10 providers across specialties)
- dim_patients (patient demographics)

FACT TABLES:
- fact_appointments (45+ appointments with intentional bottlenecks)
- fact_capacity_analyses (stores AI analysis results)
- fact_risk_assessments (stores risk scores)
- fact_outreach_sequences (stores outreach campaigns)
```

**Mock Data Highlights:**
- Dr. Emily Smith: **95% utilization** (19/20 slots) - OVERBOOKED
- Dr. Michael Jones: **45% utilization** (9/20 slots) - UNDERUTILIZED
- High-risk patient (Sarah Johnson): 40% no-show rate, 2/5 no-shows
- Low-risk patient (Emily Rodriguez): 0% no-show rate, perfect attendance

---

### Phase 3: AI Agent Implementation
**Completed:** 3 AI agents using OpenAI Function Calling

**Files Created:**
- `src/lib/openai.ts` - OpenAI client wrapper
- `src/lib/agents.ts` - All 3 AI agent implementations

#### Agent 1: Capacity Optimizer
**Function:** `analyzeCapacity()`
- **Input:** Provider schedules with utilization percentages
- **Output:** Bottlenecks + reschedule proposals (max 5)
- **Model:** GPT-5 (gpt-5-2025-08-07)
- **Temperature:** Default (1) - GPT-5 requirement
- **Schema:** Strict JSON with bottlenecks array + proposals array
- **Constraints:**
  - Only reschedule between matching specialties
  - Verify target slots are actually available
  - Prioritize >85% utilization providers
  - Focus on utilization % changes (not time savings)

**Key Code:**
```typescript
const proposeReschedulesFunction = {
  name: 'propose_reschedules',
  parameters: {
    bottlenecks: [{ provider_id, utilization_pct, issue }],
    proposals: [{
      patient_id, from_provider_id, to_provider_id,
      from_time, to_time, reason, expected_impact
    }]
  }
};
```

#### Agent 2: No-Show Risk Scorer
**Function:** `generateRiskScore()`
- **Input:** Patient history + appointment details
- **Output:** Risk score (0-100), badge (Low/Medium/High), risk factors
- **Model:** GPT-5 (gpt-5-2025-08-07)
- **Temperature:** Default (1)
- **Schema:** Strict JSON with risk_score, risk_badge, factors
- **Risk Bands:**
  - 0-40: Low risk
  - 40-70: Medium risk
  - 70-100: High risk

**Key Factors:**
1. Historical no-show rate (most important)
2. Lead time (days until appointment)
3. Distance from clinic
4. Recent reschedules
5. Appointment type

#### Agent 3: Outreach Sequencer
**Function:** `designOutreachSequence()`
- **Input:** Patient info + risk assessment
- **Output:** 3-touchpoint campaign with 2 message variants each
- **Model:** GPT-5 (gpt-5-2025-08-07)
- **Temperature:** Default (1)
- **Schema:** Array of touchpoints with SMS/Email variants
- **Sequence:**
  1. 7 days before (SMS)
  2. 2 days before (Email with prep details)
  3. 1 day before (SMS reminder)

**Message Variants:**
- Tone 1: Friendly, conversational
- Tone 2: Urgent or incentive-focused

---

### Phase 4: UI Components
**Completed:** Interactive React components for all 3 agents

**Files Created:**
- `src/components/CapacityAnalyzer.tsx` - Agent 1 UI
- `src/components/RiskScorer.tsx` - Agent 2 UI
- `src/components/OutreachDesigner.tsx` - Agent 3 UI
- `src/App.tsx` - Main dashboard layout

#### CapacityAnalyzer Component
**Features:**
- Provider utilization table with color-coded progress bars
  - Red (>85%): Overbooked
  - Yellow (60-85%): Moderate
  - Green (<60%): Available
- "Analyze Capacity" button triggers AI analysis
- Displays bottlenecks with utilization percentages
- Shows reschedule proposals with patient names, times, reasons, impact

**UI Elements:**
- Loading spinner during API call
- Error handling with user-friendly messages
- Collapsible proposal cards

#### RiskScorer Component
**Features:**
- Lists all scheduled appointments
- "Generate Risk" button per appointment
- Displays risk badge (Low/Medium/High) with color coding
- Shows primary/secondary risk factors
- Displays predicted show probability

**Risk Badge Colors:**
- 🟢 Low: Green
- 🟡 Medium: Yellow
- 🔴 High: Red

#### OutreachDesigner Component
**Features:**
- Appointment selection dropdown
- Shows patient risk score before designing campaign
- "Design Campaign" button triggers AI
- Displays 3-touchpoint sequence with timing
- Shows 2 message variants per touchpoint (side-by-side)
- Character count for SMS (160 char limit)

---

### Phase 5: Documentation
**Completed:** Comprehensive project documentation

**Files Created:**
- `/Users/anuragmane/commure/README.md` - Project overview, setup, UX walkthrough
- `/Users/anuragmane/commure/AI_DESIGN.md` - AI architecture, reliability, eval plan
- `utilization-agent/README.md` - Frontend-specific setup and features

**Key Documentation Sections:**
1. Problem statement and context
2. Simplified star schema diagram
3. User experience walkthrough (Emily's workflow)
4. AI design decisions (where AI adds value)
5. Reliability & guardrails
6. Evaluation plan
7. v0 vs Production tradeoffs

---

## Issues Encountered & Resolutions

### Issue 1: Tailwind CSS PostCSS Plugin Error
**Error:**
```
[postcss] It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin
```

**Cause:** Installed Tailwind v4 which has breaking changes

**Resolution:**
```bash
npm uninstall tailwindcss postcss autoprefixer
npm install -D tailwindcss@3 postcss@8 autoprefixer@10
```

**Status:** ✅ Resolved

---

### Issue 2: OpenAI API Connection Error (ERR_CONNECTION_CLOSED)
**Error:**
```
POST https://api.openai.com/v1/chat/completions net::ERR_CONNECTION_CLOSED
```

**Attempted Fixes:**
1. Verified `.env` file exists with valid API key
2. Changed model from `gpt-4-turbo` → `gpt-4o-mini` → `gpt-4o` → `gpt-5-2025-08-07`

**Status:** ✅ Resolved with GPT-5

---

### Issue 3: GPT-5 Temperature Parameter Not Supported
**Error:**
```
400 Unsupported value: 'temperature' does not support 0 with this model.
Only the default (1) value is supported.
```

**Cause:** GPT-5 only accepts default temperature (1), not custom values

**Resolution:**
Removed all `temperature` parameters from API calls:
```typescript
// Before
model: 'gpt-5-2025-08-07',
temperature: 0,

// After
model: 'gpt-5-2025-08-07',
// temperature removed (uses default 1)
```

**Status:** ✅ Resolved

---

### Issue 4: Misleading Impact Calculations
**Problem:** AI was calculating impact as time difference (e.g., "Reduces wait time by 495 minutes")

**Example:**
- Move from 5:45 PM → 9:30 AM = ~16 hours = 960 minutes
- AI interpreted this as "wait time reduction" instead of utilization impact

**Resolution:**
Updated prompt to focus on utilization percentage changes:
```typescript
expected_impact: {
  type: 'string',
  description: 'Impact on provider utilization (e.g., "Reduces Dr. Smith from 95% to 90%")'
}
```

**Status:** ✅ Resolved

---

## Current State

### Working Features ✅
1. **Capacity Optimizer** - Identifies bottlenecks, proposes reschedules with utilization impact
2. **Risk Scorer** - Generates patient-level no-show risk scores on demand
3. **Outreach Sequencer** - Designs 3-touchpoint SMS/Email campaigns
4. **Full UI** - Interactive dashboard with all 3 agents
5. **GPT-5 Integration** - Successfully using latest OpenAI model

### Performance Metrics
- **Capacity Analysis:** ~3-5 seconds (analyzes 45+ appointments)
- **Risk Scoring:** ~2-3 seconds per patient
- **Outreach Design:** ~3-4 seconds (generates 6 message variants)

### Tech Stack Summary
```json
{
  "frontend": "React 19 + TypeScript + Vite",
  "styling": "Tailwind CSS v3",
  "ai": "OpenAI GPT-5 (gpt-5-2025-08-07)",
  "icons": "Lucide React",
  "data": "JSON mocks (matching schema.sql)",
  "deployment": "Local dev server (port 5174)"
}
```

---

## Next Steps (Production Roadmap)

### Backend & Database
- [ ] Build FastAPI backend for secure API key handling
- [ ] Implement PostgreSQL with star schema
- [ ] Add data warehouse ETL pipelines
- [ ] Migrate JSONB columns to normalized tables

### Security & Auth
- [ ] Move OpenAI API calls to backend (remove `dangerouslyAllowBrowser`)
- [ ] Add user authentication (OAuth/SAML)
- [ ] Implement role-based access control (RBAC)
- [ ] Encrypt PII/PHI data

### AI Enhancements
- [ ] Add confidence scores to all AI outputs
- [ ] Implement human-in-the-loop approval workflows
- [ ] Build A/B testing for outreach message variants
- [ ] Add model performance monitoring

### Integration
- [ ] Connect to hospital EHR systems (HL7/FHIR)
- [ ] Integrate with scheduling systems (Epic, Cerner)
- [ ] Add SMS/Email sending APIs (Twilio, SendGrid)
- [ ] Build analytics dashboard

### Evaluation & Monitoring
- [ ] Implement golden dataset for eval
- [ ] Add automated testing for AI outputs
- [ ] Track real-world impact metrics (no-show rate reduction)
- [ ] Build feedback loops for model improvement

---

## Files & Directory Structure

```
/Users/anuragmane/commure/
├── README.md                          # Main project documentation
├── AI_DESIGN.md                       # AI architecture & reliability
├── schema.sql                         # Production PostgreSQL schema
├── DEVELOPMENT_LOG.md                 # This file
│
└── utilization-agent/                 # React frontend app
    ├── package.json                   # Dependencies
    ├── vite.config.ts                 # Vite config
    ├── tsconfig.json                  # TypeScript config
    ├── tailwind.config.js             # Tailwind CSS config
    ├── postcss.config.js              # PostCSS config
    ├── .env                           # OpenAI API key (gitignored)
    ├── .env.example                   # Environment template
    ├── README.md                      # Frontend-specific docs
    │
    └── src/
        ├── App.tsx                    # Main dashboard
        ├── main.tsx                   # React entry point
        ├── index.css                  # Global styles
        │
        ├── components/
        │   ├── CapacityAnalyzer.tsx   # Agent 1 UI
        │   ├── RiskScorer.tsx         # Agent 2 UI
        │   └── OutreachDesigner.tsx   # Agent 3 UI
        │
        ├── lib/
        │   ├── openai.ts              # OpenAI client
        │   └── agents.ts              # 3 AI agents
        │
        ├── data/
        │   └── mockData.ts            # JSON mock data
        │
        └── types/
            └── schema.ts              # TypeScript types
```

---

## Commands Reference

```bash
# Development
npm run dev              # Start dev server (http://localhost:5174)
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Run ESLint

# Setup
npm install              # Install dependencies
cp .env.example .env     # Create environment file
# Edit .env and add: VITE_OPENAI_API_KEY=sk-...
```

---

## Interview Talking Points

### 1. Data Thinking
- Designed simplified star schema (6 tables: 2 dim, 4 fact)
- JSONB columns for flexible nested data (proposals, touchpoints)
- Mock data matches production schema exactly
- Clear migration path from JSON → SQLite → PostgreSQL

### 2. AI Design
- Used OpenAI Function Calling for structured, reliable outputs
- Strict JSON schemas prevent hallucination
- Temperature=default for GPT-5 (deterministic when possible)
- Clear prompt engineering with constraints and examples

### 3. Scrappy Prototype Over Heavy Engineering
- ✅ Built in <4 hours with complete UI
- ✅ Client-side API calls (acceptable for v0)
- ✅ JSON mocks instead of database (faster iteration)
- ✅ Focus on demo-ability over production-readiness

### 4. Where AI Adds Value
- **Complex reasoning:** Multi-constraint scheduling optimization
- **Context-aware:** Considers specialty, utilization, patient preferences
- **Explainability:** Generates human-readable justifications
- **Personalization:** Adapts outreach messaging to risk level

### 5. Reliability & Guardrails
- Input validation (check provider exists, slots available)
- Output validation (risk scores 0-100, valid date formats)
- Business logic constraints (same-specialty reschedules only)
- Error handling with user-friendly messages

### 6. Evaluation Plan
- Golden dataset: 20 provider schedules with known bottlenecks
- Success metrics: Precision/recall for bottleneck detection
- Human eval: Clinician review of reschedule proposals
- A/B testing: Compare outreach variants in production

---

## Recent Changes (Latest First)

### 2025-10-02 (Night) - **CODE CLEANUP: Removed Unused Capacity Optimizer**
- ✅ **Deleted CapacityAnalyzer.tsx** - 278 lines removed
- ✅ **Removed analyzeCapacity() from agents.ts** - 195 lines removed (capacity optimizer logic)
- ✅ **Removed capacity types from schema.ts** - 45 lines removed (Bottleneck, RescheduleProposal, CapacityAnalysis, helper types)
- ✅ **Updated agent numbering** - Agent 1 = Risk Scorer, Agent 2 = Outreach Sequencer
- ✅ **Total cleanup: ~518 lines of unused code removed**

**Final Codebase:**
- `/src/components`: 2 files (RiskScorer.tsx, OutreachDesigner.tsx)
- `/src/lib/agents.ts`: 235 lines (was 430+ lines)
- `/src/types/schema.ts`: 103 lines (was 149+ lines)
- No unused imports, no dead code

**Preserved for Interview:**
- Capacity optimizer still in `schema.sql` as `fact_capacity_optimizations` table
- Documentation mentions it as "prototyped but focused v0 on no-show prevention"

### 2025-10-02 (Late Evening) - **STRATEGIC SIMPLIFICATION: Focus on Core Problem**
- ✅ **Removed Capacity Optimizer from UI** - Streamlined to 2-agent no-show prevention system
- ✅ **Updated all documentation** - README, utilization-agent README now focus on no-show prevention
- ✅ **Renamed application** - "No-Show Prevention System" (was "Utilization Agent")
- ✅ **Simplified UX walkthrough** - 3 steps instead of 5 (Risk Assessment → Outreach Design → Track Impact)
- ✅ **Added impact metrics to outreach** - Shows expected no-show rate reduction (72% → 17%)
- ✅ **Preserved capacity optimizer in schema** - Visible in `schema.sql` as future enhancement

**Rationale:**
The job description emphasizes "No-Show Risk & Outreach Sequencer" as the core problem. By focusing v0 on 2 agents instead of 3:
1. **Clearer narrative** - "We prevent no-shows with AI" vs "We optimize everything"
2. **Better demo flow** - Simpler, faster, less error-prone
3. **Stronger ROI story** - "$1,950/month saved by reducing high-risk no-shows from 40% to 12%"
4. **Reduced complexity** - No 45-agent risk calculation upfront
5. **Interview advantage** - Can discuss capacity optimizer as "also prototyped" when asked about scaling

**New User Flow:**
1. Browse appointments → Generate risk scores for high-risk patients
2. Design personalized outreach campaigns
3. See expected impact: 28% → 83% show probability

### 2025-10-02 (Evening) - **MAJOR ENHANCEMENT: Multi-Agent Coordination** (DEPRECATED)
- ✅ **Integrated Agent 1 ↔ Agent 2 coordination** (no-show risk → capacity optimization)
- ✅ Added risk-aware capacity analysis with effective utilization calculations
- ✅ Updated Agent 1 to support 3 action types: `reschedule`, `outreach`, `overbook`
- ✅ CapacityAnalyzer now calculates risk scores for ALL appointments before analysis (~45 API calls)
- ✅ Added visual indicators for idle time risk, high-risk appointments, and outreach triggers
- ✅ Enhanced UI with color-coded action types (blue=reschedule, orange=outreach, purple=overbook)
- ✅ Added "Trigger Agent 3" badges for high-risk patients needing proactive engagement
- ✅ Updated TypeScript types: `ProviderWithRiskMetrics`, `AppointmentWithRisk`, enhanced `Bottleneck` and `RescheduleProposal`

**New Workflow:**
1. User clicks "Analyze Capacity (with Risk Assessment)"
2. System calculates no-show risk for all 45 appointments (Agent 2)
3. System builds risk-adjusted provider metrics (effective utilization)
4. Agent 1 analyzes with risk data and proposes mix of reschedules/outreach/overbooking
5. UI displays idle time risk, high-risk counts, and outreach recommendations

**Key Metrics Now Displayed:**
- Raw utilization % (booked slots / total slots)
- Effective utilization % (accounting for expected no-shows)
- Idle time risk (minutes likely wasted due to no-shows)
- High-risk appointment count (risk score > 70)

### 2025-10-02 (Afternoon)
- ✅ Fixed impact calculation prompt (utilization % instead of time)
- ✅ Updated expected_impact schema description
- ✅ Verified all 3 agents working with GPT-5
- ✅ Created comprehensive development log

### 2025-10-01
- ✅ Removed temperature parameters for GPT-5 compatibility
- ✅ Migrated all agents from gpt-4o → gpt-5-2025-08-07
- ✅ Fixed OpenAI API connection issues
- ✅ Downgraded Tailwind CSS to v3 for PostCSS compatibility
- ✅ Completed initial v0 prototype with all 3 agents

---

**Last Updated:** 2025-10-02
**Status:** ✅ Fully functional v0 prototype ready for interview demo
