# LLM Evaluation Plan
## Commure Utilization Agent - AI Quality Assurance

**Version:** 1.0
**Date:** October 2025
**Author:** Anurag Mane

---

## Overview

This document defines a **simple, practical evaluation plan** for measuring the quality and reliability of the 4 AI agents in the Utilization Agent system:

1. **Risk Scorer** - No-show risk classification
2. **Virtual Eligibility** - Virtual appointment determination
3. **Outreach Sequencer** - Personalized message generation
4. **Waitlist Matcher** - Intelligent slot-to-patient matching

**Evaluation Philosophy:**
- ✅ **Fast** - Complete initial eval in 2-4 weeks
- ✅ **Rigorous** - Statistical validation with measurable targets
- ✅ **Practical** - Uses existing audit logs, minimal infrastructure
- ✅ **Production-ready** - Continuous monitoring after deployment

---

## Evaluation Framework

### Two-Phase Approach

```
┌─────────────────────────────────────────────────────────┐
│  PHASE 1: OFFLINE EVALUATION (Weeks 1-2)               │
│  • Shadow mode testing (no user exposure)              │
│  • Collect 100+ predictions vs. actual outcomes        │
│  • Manual quality reviews by staff                     │
│  • Calculate baseline metrics                          │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 2: ONLINE EVALUATION (Weeks 3-4)                │
│  • A/B testing in production                           │
│  • Real-time monitoring dashboards                     │
│  • Automated alerting for quality degradation          │
│  • Business impact measurement                         │
└─────────────────────────────────────────────────────────┘
```

---

## Agent 1: Risk Scorer Evaluation

### Metrics to Track

| Metric | Definition | Target | Measurement Method |
|--------|------------|--------|-------------------|
| **Calibration (AUC-ROC)** | Area under ROC curve for risk score vs. actual no-show | >0.65 | Collect 100 predictions + outcomes over 2 weeks |
| **High-Risk Precision** | % of "High" risk patients who actually no-show | >50% | Track outcomes for high-risk flagged patients |
| **Low-Risk Accuracy** | % of "Low" risk patients who actually show | >85% | Track outcomes for low-risk flagged patients |
| **Explanation Quality** | Staff rate explanations as helpful (1-5 scale) | >4.0 | Survey 10 staff members on 20 score samples |
| **Latency** | Time to generate risk score | <3 sec | API response time monitoring |

### Week 1: Shadow Mode Testing

**Objective:** Generate predictions without changing user behavior.

**Procedure:**
```
1. Generate risk scores for 100 upcoming appointments
2. DO NOT send outreach yet (observe natural outcomes)
3. Save predictions to eval_predictions table
4. After appointments occur, record actual outcomes
```

**Expected Results by Risk Badge:**
- **High risk (70-100):** >50% no-show rate
- **Medium risk (40-70):** 20-50% no-show rate
- **Low risk (0-40):** <20% no-show rate

**Example Test Case:**
```json
{
  "patient_id": "P0042",
  "historical_no_show_rate": 0.40,
  "lead_time_days": 3,
  "weather": "Rainy",
  "commute_type": "bike",
  "distance_miles": 15,

  "predicted_risk_badge": "High",
  "predicted_score": 78,
  "actual_outcome": "no_show",  // Tracked after appointment date
  "evaluation_result": "CORRECT"
}
```

### Week 2: Calculate Metrics

**Implementation:**

```typescript
// Generate test predictions (Week 1)
async function runRiskScorerEval() {
  const testAppointments = await getUpcomingAppointments(100);
  const predictions = [];

  for (const apt of testAppointments) {
    const riskScore = await generateRiskScore(apt);
    predictions.push({
      appointment_id: apt.id,
      predicted_risk: riskScore.risk_badge,
      predicted_score: riskScore.risk_score,
      timestamp: new Date()
    });
  }

  await savePredictions(predictions);
}

// Compare with actual outcomes (Week 2)
async function calculateAccuracy() {
  const predictions = await getPredictions();
  const outcomes = await getActualOutcomes();

  const metrics = {
    high_risk_precision: 0,
    low_risk_accuracy: 0,
    auc_roc: 0
  };

  // Calculate AUC-ROC
  const roc = calculateROC(predictions, outcomes);
  metrics.auc_roc = roc.auc;

  // High-risk precision
  const highRisk = predictions.filter(p => p.predicted_risk === 'High');
  const highRiskNoShows = highRisk.filter(p =>
    outcomes.find(o => o.id === p.appointment_id && o.status === 'no_show')
  );
  metrics.high_risk_precision = highRiskNoShows.length / highRisk.length;

  // Low-risk accuracy
  const lowRisk = predictions.filter(p => p.predicted_risk === 'Low');
  const lowRiskShows = lowRisk.filter(p =>
    outcomes.find(o => o.id === p.appointment_id && o.status === 'show')
  );
  metrics.low_risk_accuracy = lowRiskShows.length / lowRisk.length;

  console.log('Risk Scorer Evaluation Results:', metrics);
  return metrics;
}
```

**SQL Query for Analysis:**

```sql
-- Compare predicted risk vs. actual outcomes
SELECT
  r.risk_badge,
  COUNT(*) as total_predictions,
  SUM(CASE WHEN a.status = 'no_show' THEN 1 ELSE 0 END) as actual_no_shows,
  ROUND(100.0 * SUM(CASE WHEN a.status = 'no_show' THEN 1 ELSE 0 END) / COUNT(*), 1) as no_show_rate_pct
FROM ai_risk_assessments r
JOIN appointments a ON r.appointment_id = a.appointment_id
WHERE a.scheduled_time BETWEEN '2025-03-14' AND '2025-03-28'
GROUP BY r.risk_badge
ORDER BY r.risk_badge;
```

---

## Agent 2: Virtual Eligibility Evaluation

### Metrics

| Metric | Definition | Target | Measurement Method |
|--------|------------|--------|-------------------|
| **Clinical Accuracy** | % agreement with doctor reviews | >90% | Blind review of 50 assessments by 2 doctors |
| **False Positive Rate** | % of incorrectly marked virtual-eligible | <10% | Count wrong virtual recommendations |
| **Reasoning Quality** | Staff rate explanations as clear (1-5) | >4.0 | Survey on explanation clarity |
| **Latency** | Time to assess eligibility | <2 sec | API monitoring |

### Test Dataset (Week 1)

**Create 50 diverse test cases:**

**Category A (Should be Virtual): 20 appointments**
- Hypertension follow-ups
- Medication refills
- Lab result reviews
- Mental health consultations

**Category B (Should be In-Person): 20 appointments**
- Annual physicals
- New patient exams
- Acute injuries (back pain, chest pain)
- Procedures (vaccinations, injections)

**Category C (Edge Cases): 10 appointments**
- Post-op check-ins
- Chronic disease management (stable vs. acute)
- Preventive care consultations

### Evaluation Code

```typescript
async function evalVirtualEligibility() {
  const testCases = await loadTestCases();
  const results = [];

  for (const testCase of testCases) {
    const aiResult = await assessVirtualEligibility(testCase);
    const doctorReview = await getDoctorReview(testCase); // Expert label

    results.push({
      test_case_id: testCase.id,
      ai_eligible: aiResult.virtual_eligible,
      doctor_eligible: doctorReview.eligible,
      match: aiResult.virtual_eligible === doctorReview.eligible,
      reasoning: aiResult.virtual_reason,
      confidence: aiResult.confidence
    });
  }

  const accuracy = results.filter(r => r.match).length / results.length;
  const falsePositives = results.filter(r =>
    r.ai_eligible && !r.doctor_eligible
  ).length;

  console.log(`Virtual Eligibility Accuracy: ${accuracy * 100}%`);
  console.log(`False Positive Rate: ${(falsePositives / results.length) * 100}%`);

  return { accuracy, falsePositives, results };
}
```

---

## Agent 3: Outreach Sequencer Evaluation

### Metrics

| Metric | Definition | Target | Measurement Method |
|--------|------------|--------|-------------------|
| **Message Quality** | Staff rate messages as appropriate/professional (1-5) | >4.2 | Survey on 30 generated messages |
| **Engagement Lift** | Response rate vs. generic reminders | +30% | A/B test: AI vs. template |
| **No-Show Reduction** | No-show rate for outreach recipients vs. control | -40% | Compare treatment group to baseline |
| **Personalization Score** | Staff rate as "personalized" vs. "generic" (1-5) | >4.0 | Blind comparison of AI vs. template |
| **Latency** | Time to generate 3-touchpoint sequence | <5 sec | API monitoring |

### Week 1: Message Quality Evaluation

**Test Setup:**
```
1. Generate 30 outreach sequences for diverse scenarios:
   - 10 high-risk patients (weather impact, long distance)
   - 10 medium-risk patients (moderate history)
   - 10 low-risk patients (stable, reliable)
   - Mix of appointment types and demographics

2. Staff blind review (10 reviewers):
   Rate each message 1-5 on:
   • Professionalism
   • Personalization
   • Clarity
   • Likelihood to engage patient

3. Calculate average scores (target: >4.0)
```

**Example Test Case:**
```json
{
  "patient": {
    "name": "Sarah Johnson",
    "risk_score": 72,
    "risk_badge": "High",
    "virtual_eligible": true,
    "weather": "Rainy",
    "commute_type": "bike"
  },

  "ai_generated_message": "Hi Sarah! Your annual physical with Dr. Jones is Thu 3/14 at 3pm. Since weather looks rainy and you bike to appointments, you can switch to virtual if easier. Reply YES to confirm in-person or VIRTUAL to switch. - Metro Health",

  "template_message": "Reminder: Your appointment is tomorrow at 3pm. Reply YES to confirm.",

  "staff_ratings": {
    "personalization": 4.8,
    "professionalism": 4.5,
    "clarity": 4.7,
    "engagement": 4.6
  }
}
```

### Week 2: A/B Test

**Setup:**
```
Group A (50 patients): AI-generated outreach sequences
Group B (50 patients): Generic template reminders

Measure:
- Response rate (replies, confirmations, clicks)
- No-show rate
- Patient satisfaction (optional survey)

Expected Results:
- AI group: +30% response rate vs. control
- AI group: -40% no-show rate vs. control
```

**Implementation:**

```typescript
async function runOutreachABTest() {
  const patients = await getHighRiskPatients(100);

  // Randomly assign to groups
  const groupA = patients.slice(0, 50); // AI outreach
  const groupB = patients.slice(50);    // Template

  // Send campaigns
  for (const patient of groupA) {
    const campaign = await generateAICampaign(patient);
    await sendCampaign(patient, campaign, 'AI');
  }

  for (const patient of groupB) {
    await sendCampaign(patient, TEMPLATE_MESSAGE, 'template');
  }

  // Track outcomes over 2 weeks
  await trackOutcomes(groupA, groupB);

  // Calculate metrics after appointments occur
  const metrics = {
    ai_response_rate: calculateResponseRate(groupA),
    template_response_rate: calculateResponseRate(groupB),
    ai_no_show_rate: calculateNoShowRate(groupA),
    template_no_show_rate: calculateNoShowRate(groupB),
    engagement_lift: (ai_response_rate - template_response_rate) / template_response_rate
  };

  console.log('A/B Test Results:', metrics);
  return metrics;
}
```

---

## Agent 4: Waitlist Matcher Evaluation

### Metrics

| Metric | Definition | Target | Measurement Method |
|--------|------------|--------|-------------------|
| **Match Acceptance Rate** | % of AI proposals accepted by staff | >85% | Track "Assign Slot" button clicks |
| **Match Quality Score** | Avg match score for accepted proposals | >80/100 | LLM-generated scores |
| **Provider Preference Accuracy** | % of exact provider ID matches in top 3 | 100% | Validate `requested_provider_id === slot.provider_id` |
| **Latency** | Time to rank 20 waitlist candidates | <3 sec | API monitoring |

### Week 1: Staff Acceptance Testing

**Test Setup:**
```
1. Identify 20 high-risk appointment slots
2. For each slot, generate waitlist match recommendations
3. Staff reviews top 3 candidates and marks:
   - "Would Accept" (good match, would assign)
   - "Would Reject" (poor match, wouldn't assign)
4. Calculate acceptance rate (target: >85%)
```

**Evaluation Code:**

```typescript
async function evalWaitlistMatcher() {
  const highRiskSlots = await getHighRiskSlots(20);
  const results = [];

  for (const slot of highRiskSlots) {
    const matches = await matchWaitlistToSlot(slot);
    const topMatch = matches.ranked_candidates[0];

    // Staff reviews (simulated or manual)
    const staffDecision = await getStaffReview(slot, topMatch);

    results.push({
      slot_id: slot.appointment_id,
      match_score: topMatch.match_score,
      staff_accepted: staffDecision.accepted,
      match_quality: topMatch.match_score >= 80 ? 'excellent' : 'fair',
      provider_match: topMatch.preference_match === 'Perfect'
    });
  }

  const acceptanceRate = results.filter(r => r.staff_accepted).length / results.length;
  const avgMatchScore = results.reduce((sum, r) => sum + r.match_score, 0) / results.length;
  const perfectProviderMatches = results.filter(r => r.provider_match).length;

  console.log(`Waitlist Matcher Results:`);
  console.log(`  Acceptance Rate: ${acceptanceRate * 100}%`);
  console.log(`  Avg Match Score: ${avgMatchScore}/100`);
  console.log(`  Perfect Provider Matches: ${perfectProviderMatches}/20`);

  return { acceptanceRate, avgMatchScore, perfectProviderMatches };
}
```

---

## Production Monitoring (Ongoing)

### Real-Time Metrics Dashboard

```typescript
interface ProductionMetrics {
  // Performance
  avg_latency_p50: number;
  avg_latency_p95: number;
  error_rate: number; // % of requests that fail

  // Quality (updated weekly)
  risk_calibration_auc: number;
  outreach_response_rate: number;
  waitlist_acceptance_rate: number;

  // Business Impact
  total_no_shows_prevented: number;
  revenue_saved_usd: number;
  wait_time_reduced_mins: number;

  // Cost
  total_api_calls: number;
  total_tokens_used: number;
  total_cost_usd: number;
  cost_per_successful_outcome: number;
}
```

### SQL Queries for Monitoring

**Weekly Performance Report:**

```sql
SELECT
  agent_type,
  COUNT(*) as total_requests,
  AVG(latency_ms) as avg_latency_ms,
  ROUND(100.0 * SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate_pct,
  SUM(estimated_cost_usd) as weekly_cost_usd,
  AVG(input_tokens) as avg_input_tokens,
  AVG(output_tokens) as avg_output_tokens
FROM agent_audit_logs
WHERE timestamp >= datetime('now', '-7 days')
GROUP BY agent_type
ORDER BY total_requests DESC;
```

**Identify Model Drift (Risk Calibration):**

```sql
-- Compare predicted risk vs. actual no-show rate over time
SELECT
  DATE(a.scheduled_time) as date,
  r.risk_badge,
  AVG(r.risk_score) as avg_predicted_score,
  COUNT(*) as total_appointments,
  SUM(CASE WHEN a.status = 'no_show' THEN 1 ELSE 0 END) as actual_no_shows,
  ROUND(100.0 * SUM(CASE WHEN a.status = 'no_show' THEN 1 ELSE 0 END) / COUNT(*), 1) as actual_no_show_rate_pct
FROM appointments a
JOIN ai_risk_assessments r ON a.appointment_id = r.appointment_id
WHERE a.scheduled_time >= datetime('now', '-30 days')
  AND a.scheduled_time < datetime('now')
GROUP BY DATE(a.scheduled_time), r.risk_badge
ORDER BY date DESC, r.risk_badge;
```

**Find Slow or Failed Requests:**

```sql
-- Identify requests exceeding latency threshold (>5 sec)
SELECT
  request_id,
  agent_type,
  latency_ms,
  timestamp,
  appointment_id,
  status,
  error_message
FROM agent_audit_logs
WHERE latency_ms > 5000
   OR status = 'error'
ORDER BY timestamp DESC
LIMIT 50;
```

### Alerting Rules

```typescript
const ALERT_THRESHOLDS = {
  // Performance degradation
  latency_p95_ms: 10000,          // 10 seconds
  error_rate_pct: 5,              // 5%

  // Quality degradation
  acceptance_rate_drop_pct: 20,   // 20% drop from baseline
  auc_roc_min: 0.60,              // AUC below 0.60

  // Cost overrun
  daily_cost_usd: 50.00,          // $50/day
  single_request_cost_usd: 0.10,  // $0.10 per request
};

async function checkAlerts() {
  const metrics = await getProductionMetrics();

  // Latency alert
  if (metrics.avg_latency_p95 > ALERT_THRESHOLDS.latency_p95_ms) {
    await notify({
      severity: 'warning',
      message: `Latency degraded: P95 = ${metrics.avg_latency_p95}ms (threshold: ${ALERT_THRESHOLDS.latency_p95_ms}ms)`,
      action: 'Investigate model performance or API issues'
    });
  }

  // Error rate alert
  if (metrics.error_rate > ALERT_THRESHOLDS.error_rate_pct) {
    await page({
      severity: 'critical',
      message: `Error rate: ${metrics.error_rate}% (threshold: ${ALERT_THRESHOLDS.error_rate_pct}%)`,
      action: 'Potential outage - check logs immediately'
    });
  }

  // Quality degradation alert
  if (metrics.risk_calibration_auc < ALERT_THRESHOLDS.auc_roc_min) {
    await notify({
      severity: 'warning',
      message: `Risk model drift detected: AUC = ${metrics.risk_calibration_auc} (threshold: ${ALERT_THRESHOLDS.auc_roc_min})`,
      action: 'Model may need retraining or prompt adjustment'
    });
  }

  // Cost overrun alert
  if (metrics.total_cost_usd > ALERT_THRESHOLDS.daily_cost_usd) {
    await notify({
      severity: 'info',
      message: `Daily cost exceeded budget: $${metrics.total_cost_usd} (threshold: $${ALERT_THRESHOLDS.daily_cost_usd})`,
      action: 'Review usage patterns and optimize prompts'
    });
  }
}
```

---

## Evaluation Timeline

### Week-by-Week Schedule

| Week | Phase | Activities | Deliverables |
|------|-------|------------|--------------|
| **Week 1** | Offline Eval | • Shadow mode testing<br>• Generate 100 risk predictions<br>• Create 50 virtual eligibility test cases<br>• Generate 30 outreach messages | • Test predictions logged<br>• Test case database |
| **Week 2** | Offline Eval | • Collect actual outcomes<br>• Calculate AUC-ROC, precision, accuracy<br>• Staff quality reviews<br>• Manual acceptance testing | • Baseline metrics report<br>• Quality scores<br>• Gap analysis |
| **Week 3** | Online Eval | • Deploy A/B test (outreach)<br>• Enable production monitoring<br>• Track live acceptance rates | • A/B test results<br>• Real-time dashboard |
| **Week 4** | Production | • Analyze business impact<br>• Calculate ROI<br>• Set up automated alerts<br>• Document findings | • Final evaluation report<br>• Production readiness checklist |

---

## Success Criteria

### Go/No-Go Decision (End of Week 2)

✅ **Ready for Production if ALL criteria met:**

| Agent | Metric | Threshold | Status |
|-------|--------|-----------|--------|
| **Risk Scorer** | AUC-ROC | >0.65 | ⏳ TBD |
| **Risk Scorer** | High-Risk Precision | >50% | ⏳ TBD |
| **Risk Scorer** | Explanation Quality | >4.0/5 | ⏳ TBD |
| **Virtual Eligibility** | Clinical Accuracy | >90% | ⏳ TBD |
| **Virtual Eligibility** | False Positive Rate | <10% | ⏳ TBD |
| **Outreach Sequencer** | Message Quality | >4.2/5 | ⏳ TBD |
| **Outreach Sequencer** | Engagement Lift | >+30% | ⏳ TBD |
| **Waitlist Matcher** | Acceptance Rate | >85% | ⏳ TBD |
| **All Agents** | Latency P95 | <5 sec | ⏳ TBD |
| **All Agents** | Error Rate | <5% | ⏳ TBD |

❌ **Hold Production Deployment if:**
- Any metric falls below threshold
- High variance in predictions (model unstable)
- Staff reports low confidence in AI recommendations
- Cost exceeds $50/day for 100 patients

---

## Expected Results (Based on Similar Systems)

### Baseline Predictions

**From literature on healthcare no-show prediction models:**

| Metric | Conservative Estimate | Optimistic Estimate |
|--------|----------------------|---------------------|
| **Risk Scorer AUC-ROC** | 0.65 - 0.70 | 0.75 - 0.80 |
| **High-Risk Precision** | 50% - 55% | 60% - 70% |
| **Outreach Engagement Lift** | +20% - +30% | +40% - +50% |
| **No-Show Reduction** | -30% - -40% | -50% - -60% |
| **Waitlist Acceptance Rate** | 80% - 85% | 90% - 95% |

**Our targets are set at the conservative estimate + 5% margin.**

---

## Cost of Evaluation

### Resource Requirements

**Staff Time:**
- 10 clinical staff × 2 hours (reviews) = 20 hours
- 1 ops manager × 10 hours (coordination) = 10 hours
- 1 engineer × 40 hours (implementation) = 40 hours
- **Total:** 70 staff hours (~$7,000 at $100/hr blended rate)

**Infrastructure:**
- OpenAI API calls: ~500 test predictions × $0.005 = $2.50
- Monitoring tools: $0 (use existing audit logs)
- Database storage: $0 (SQLite)
- **Total:** <$10

**Grand Total:** ~$7,010 for complete 4-week evaluation

---

## References

**External Resources:**
- EvidentlyAI LLM Evaluation Guide: https://www.evidentlyai.com/llm-guide/llm-evaluation
- OpenAI Function Calling Best Practices: https://platform.openai.com/docs/guides/function-calling
- Healthcare AI Evaluation Standards (FDA): https://www.fda.gov/medical-devices/software-medical-device-samd/artificial-intelligence-and-machine-learning-aiml-enabled-medical-devices

**Internal Documentation:**
- `AI_DESIGN.md` - Section 3.4 (Quality Assurance - Simple Eval Plan)
- `GUARDRAILS.md` - Guardrails implementation details
- `schema.sqlite.sql` - Database schema for audit logging
- `utilization-agent/src/lib/agents.ts` - AI agent implementations

**Code Locations:**
- Audit logging: `utilization-agent/src/lib/audit.ts`
- Agent implementations: `utilization-agent/src/lib/agents.ts`
- Database queries: `utilization-agent/server/db.js`

---

## Appendix: Sample Evaluation Report Template

```markdown
# AI Agent Evaluation Report
**Date:** [Insert Date]
**Evaluator:** [Your Name]
**Phase:** Week 1 Shadow Mode Testing

## Summary
- Total predictions: 100
- Agents tested: Risk Scorer, Virtual Eligibility
- Duration: 7 days (MM/DD - MM/DD)

## Results

### Risk Scorer
- AUC-ROC: 0.72 ✅ (target: >0.65)
- High-Risk Precision: 58% ✅ (target: >50%)
- Low-Risk Accuracy: 89% ✅ (target: >85%)
- Explanation Quality: 4.3/5 ✅ (target: >4.0)

### Virtual Eligibility
- Clinical Accuracy: 92% ✅ (target: >90%)
- False Positive Rate: 6% ✅ (target: <10%)

## Recommendations
- ✅ PROCEED to Week 2 A/B testing
- Monitor: High-risk precision trending toward 60%
- Action: None required

## Next Steps
1. Deploy A/B test for outreach sequencer
2. Enable production monitoring dashboard
3. Schedule Week 4 final review
```

---

**This evaluation plan provides a structured, measurable approach to validating AI quality while maintaining speed and practicality for a v0 prototype.**
