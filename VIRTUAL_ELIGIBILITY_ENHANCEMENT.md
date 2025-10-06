# Virtual Eligibility Agent Enhancement

## Overview

Enhanced the Virtual Eligibility Assessor (Agent 2) to consider **real-world logistical factors** in addition to clinical eligibility when recommending virtual appointments.

## Problem Statement

**Before Enhancement:**
- Agent only considered appointment type and chief complaint (clinical factors only)
- Missed opportunities to recommend virtual for distant patients
- Ignored patient preferences and weather barriers
- Result: Lower virtual adoption, unnecessary travel burden

**After Enhancement:**
- Agent now considers 4 weighted decision factors
- Personalized recommendations based on patient context
- Weather-aware virtual suggestions
- Result: Higher patient satisfaction and virtual adoption

---

## Enhanced Decision Factors

### Weighted Decision Model

| Factor | Weight | Description |
|--------|--------|-------------|
| **Clinical Eligibility** | 45% | PRIMARY - Must be clinically appropriate (unchanged logic) |
| **Patient Preference** | 20% | If patient prefers virtual → strong bias toward eligible |
| **Distance & Access** | 15% | >20 miles = strong virtual rec, >30 miles = very strong |
| **Commute & Weather** | 20% | Bad weather + bike/transit = very strong virtual rec |

### Decision Logic

```
IF clinically_eligible (45%):
  THEN consider:
    - Patient preference (20%)
    - Distance from clinic (15%)
    - Weather + commute type (20%)

  OUTPUT: Enhanced reasoning like:
    "Virtual eligible - 35mi distance + rainy weather + patient preference"

ELSE:
  OUTPUT: "In-person required - [clinical reason]"
  (Other factors irrelevant if not clinically eligible)
```

---

## Code Changes

### 1. Function Signature Update
**File:** `/utilization-agent/src/lib/agents.ts:266-276`

**Before:**
```typescript
export async function assessVirtualEligibility(
  appointment: Appointment,
  chiefComplaint: string
): Promise<{ virtual_eligible: boolean; virtual_reason: string; confidence: number }>
```

**After:**
```typescript
export async function assessVirtualEligibility(
  appointment: Appointment,
  chiefComplaint: string,
  patient?: {
    distance_miles: number;
    commute_type: string;
    preferred_virtual: number;
    zip_code: string;
  },
  weather?: Weather | null
): Promise<{ virtual_eligible: boolean; virtual_reason: string; confidence: number }>
```

### 2. Enhanced System Prompt
**File:** `/utilization-agent/src/lib/agents.ts:277-322`

**Added weighted decision factors:**
- Clinical eligibility rules (45%)
- Patient preference logic (20%)
- Distance thresholds (15%)
- Weather + commute combinations (20%)

**Key additions:**
```
2. PATIENT PREFERENCE (20% weight)
   - If patient prefers virtual → Strong bias toward virtual eligible
   - Patient satisfaction and adherence are critical

3. DISTANCE & ACCESS (15% weight)
   - Distance >20 miles → Strong virtual recommendation
   - Distance >30 miles → Very strong virtual recommendation

4. COMMUTE & WEATHER (20% weight)
   - Rainy/Snowy + bike/public transport → Very strong virtual
   - Rainy/Snowy + car → Moderate virtual
```

### 3. Context-Aware User Prompt
**File:** `/utilization-agent/src/lib/agents.ts:324-344`

**Now includes patient and weather context:**
```typescript
let contextDetails = '';

if (patient) {
  contextDetails += `\nPatient Context:`;
  contextDetails += `\n- Distance from clinic: ${patient.distance_miles} miles`;
  contextDetails += `\n- Commute type: ${patient.commute_type}`;
  contextDetails += `\n- Virtual preference: ${patient.preferred_virtual ? 'Yes' : 'No'}`;
}

if (weather) {
  contextDetails += `\n\nWeather Forecast:`;
  contextDetails += `\n- Condition: ${weather.condition}`;
  contextDetails += `\n- Temperature: ${weather.temperature_f}°F`;
}
```

### 4. Frontend Integration
**File:** `/utilization-agent/src/pages/ResultsPage.tsx:377-408`

**Updated to pass patient and weather data:**
```typescript
// Fetch weather for virtual eligibility assessment
const appointmentDate = appointment.scheduled_time.split('T')[0];
let weatherData = null;
try {
  const weatherResponse = await fetch(
    `http://localhost:3001/api/weather?date=${appointmentDate}&zip_code=${patientData.zip_code}`
  );
  weatherData = await weatherResponse.json();
} catch (error) {
  console.warn('Failed to fetch weather for virtual eligibility:', error);
}

// Assess virtual eligibility with full context
const virtualEligibility = await assessVirtualEligibility(
  appointment,
  appointment.chief_complaint,
  {
    distance_miles: patientData.distance_miles,
    commute_type: patientData.commute_type,
    preferred_virtual: patientData.preferred_virtual,
    zip_code: patientData.zip_code
  },
  weatherData
);
```

---

## Example Scenarios

### Scenario 1: Perfect Virtual Candidate
**Input:**
- Appointment: Hypertension follow-up (stable)
- Distance: 35 miles
- Commute: Public transport
- Preference: Prefers virtual ✅
- Weather: Rainy (80% precipitation)

**Before:** `"Stable HTN follow-up - no exam needed"` (generic)

**After:** `"Virtual eligible - 35mi distance + rainy weather + patient preference"` (personalized)

**Confidence:** 95% (all factors align)

---

### Scenario 2: Clinical Override
**Input:**
- Appointment: Annual Physical
- Distance: 40 miles
- Preference: Prefers virtual ✅
- Weather: Snowy

**Before:** `"Physical exam required - in-person"`

**After:** `"In-person required - physical exam needed despite distance/weather"` (explains override)

**Confidence:** 90% (clinical requirement overrides all)

---

### Scenario 3: Distance + Weather Factor
**Input:**
- Appointment: Lab Review (virtual eligible)
- Distance: 28 miles
- Preference: Prefers in-person ❌
- Weather: Snowy

**Before:** `"Lab review - virtual eligible"` (ignores context)

**After:** `"Virtual recommended - 28mi + snowy weather (safer/easier)"` (considers safety)

**Confidence:** 78% (distance + weather outweigh preference)

---

## Impact & Benefits

### For Patients
- ✅ **Reduced travel burden** - Long-distance patients get virtual recommendation
- ✅ **Weather safety** - Automatic virtual suggestion during bad weather
- ✅ **Preference respect** - Patient choice weighted heavily (20%)
- ✅ **Time savings** - Virtual for eligible appointments with logistics barriers

### For Providers
- ✅ **Higher virtual adoption** - More patients accept virtual when it matches their needs
- ✅ **Better utilization** - No-shows reduced for distant/weather-affected appointments
- ✅ **Transparent AI** - Clear reasoning for virtual recommendations

### For Operations
- ✅ **Cost savings** - Reduced no-shows from travel barriers
- ✅ **Patient satisfaction** - Personalized recommendations increase acceptance
- ✅ **Compliance** - Explainable AI decisions meet healthcare requirements

---

## Testing

Run test scenarios:
```bash
node /Users/anuragmane/commure/test-enhanced-virtual-eligibility.js
```

**5 test scenarios cover:**
1. Perfect virtual candidate (all factors align)
2. Clinical override (exam required despite preference)
3. Distance + weather factor (safety wins over preference)
4. Close distance + clear weather (in-person feasible)
5. High virtual preference (patient choice wins)

---

## Future Enhancements

### Short Term
- [ ] Add provider specialty to virtual eligibility (some specialties better for virtual)
- [ ] Include appointment history (if patient has done virtual before → higher confidence)
- [ ] Real-time traffic data (commute time, not just distance)

### Long Term
- [ ] ML model for virtual acceptance prediction based on historical data
- [ ] Patient feedback loop (did they accept virtual recommendation?)
- [ ] Dynamic weight adjustment based on acceptance rates

---

## Migration Notes

### Backward Compatibility
- ✅ Function signature uses optional parameters (`patient?`, `weather?`)
- ✅ Agent works without new parameters (graceful degradation)
- ✅ Existing calls continue to work (no breaking changes)

### Deployment Steps
1. Deploy enhanced agent code
2. Update frontend to pass patient + weather data
3. Monitor virtual adoption rates
4. A/B test enhanced vs basic reasoning

---

## Summary

**What Changed:**
- Virtual eligibility agent now considers **4 weighted factors** instead of just clinical eligibility
- Patient preference, distance, weather, and commute type all influence recommendation
- Enhanced reasoning provides clear explanations (80 char limit for UI display)

**Why It Matters:**
- **Personalization:** Recommendations tailored to patient context
- **Safety:** Weather-aware suggestions reduce travel risk
- **Adoption:** Higher virtual acceptance when matched to patient needs
- **Transparency:** Clear explanations build trust in AI recommendations

**Key Metrics to Track:**
- Virtual acceptance rate (before/after enhancement)
- No-show rate for distant patients (should decrease)
- Patient satisfaction scores (should increase)
- Virtual appointment completion rate (should stay high)
