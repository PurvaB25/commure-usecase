#!/usr/bin/env node

/**
 * Test Enhanced Virtual Eligibility Agent
 *
 * This test demonstrates how the enhanced agent now considers:
 * - Clinical eligibility (45%)
 * - Patient preference (20%)
 * - Distance & access (15%)
 * - Commute & weather (20%)
 */

const scenarios = [
  {
    name: "Scenario 1: Perfect Virtual Candidate",
    description: "Stable condition + prefers virtual + far distance + bad weather",
    appointment: {
      appointment_type: "Follow-up",
      chief_complaint: "Hypertension follow-up - stable, medication review"
    },
    patient: {
      distance_miles: 35,
      commute_type: "public_transport",
      preferred_virtual: 1, // TRUE
      zip_code: "10001"
    },
    weather: {
      condition: "Rainy",
      temperature_f: 45,
      precipitation_pct: 80
    },
    expected: {
      virtual_eligible: true,
      reasoning: "All factors align: clinically eligible, patient prefers virtual, long distance (35mi), rainy weather with public transport"
    }
  },

  {
    name: "Scenario 2: Clinical Override",
    description: "Needs physical exam (clinical requirement overrides preference)",
    appointment: {
      appointment_type: "Annual Physical",
      chief_complaint: "Annual physical examination"
    },
    patient: {
      distance_miles: 40,
      commute_type: "bike",
      preferred_virtual: 1, // Prefers virtual
      zip_code: "10001"
    },
    weather: {
      condition: "Snowy",
      temperature_f: 28,
      precipitation_pct: 90
    },
    expected: {
      virtual_eligible: false,
      reasoning: "Clinical requirement: physical exam needed despite patient preference for virtual, distance, and bad weather"
    }
  },

  {
    name: "Scenario 3: Distance + Weather Factor",
    description: "Clinically eligible + far distance + bad weather (but patient prefers in-person)",
    appointment: {
      appointment_type: "Lab Review",
      chief_complaint: "Review recent blood work results"
    },
    patient: {
      distance_miles: 28,
      commute_type: "car",
      preferred_virtual: 0, // Prefers in-person
      zip_code: "10001"
    },
    weather: {
      condition: "Snowy",
      temperature_f: 25,
      precipitation_pct: 85
    },
    expected: {
      virtual_eligible: true,
      reasoning: "Clinically eligible (lab review), far distance (28mi) + snowy weather suggest virtual is safer/easier (patient preference weighted but not decisive)"
    }
  },

  {
    name: "Scenario 4: Close Distance + Clear Weather",
    description: "Routine follow-up, nearby, clear weather, prefers in-person",
    appointment: {
      appointment_type: "Medication Review",
      chief_complaint: "Diabetes medication adjustment discussion"
    },
    patient: {
      distance_miles: 5,
      commute_type: "car",
      preferred_virtual: 0, // Prefers in-person
      zip_code: "10001"
    },
    weather: {
      condition: "Sunny",
      temperature_f: 68,
      precipitation_pct: 0
    },
    expected: {
      virtual_eligible: false, // or could be true with low confidence
      reasoning: "Clinically eligible, but patient prefers in-person, close distance (5mi), clear weather - in-person is feasible"
    }
  },

  {
    name: "Scenario 5: High Virtual Preference Wins",
    description: "Patient strongly prefers virtual, clinically eligible",
    appointment: {
      appointment_type: "Mental Health Consultation",
      chief_complaint: "Anxiety follow-up - therapy session"
    },
    patient: {
      distance_miles: 15,
      commute_type: "car",
      preferred_virtual: 1, // Prefers virtual
      zip_code: "10001"
    },
    weather: {
      condition: "Cloudy",
      temperature_f: 55,
      precipitation_pct: 20
    },
    expected: {
      virtual_eligible: true,
      reasoning: "Mental health therapy ideal for virtual, patient prefers virtual (20% weight), moderate distance - strong virtual recommendation"
    }
  }
];

console.log('\n=================================================');
console.log('ENHANCED VIRTUAL ELIGIBILITY AGENT - TEST SCENARIOS');
console.log('=================================================\n');

scenarios.forEach((scenario, index) => {
  console.log(`\n📋 ${scenario.name}`);
  console.log(`   ${scenario.description}`);
  console.log('\n   INPUT PARAMETERS:');
  console.log(`   - Appointment: ${scenario.appointment.appointment_type}`);
  console.log(`   - Chief Complaint: ${scenario.appointment.chief_complaint}`);
  console.log(`   - Distance: ${scenario.patient.distance_miles} miles`);
  console.log(`   - Commute Type: ${scenario.patient.commute_type}`);
  console.log(`   - Virtual Preference: ${scenario.patient.preferred_virtual ? 'YES (prefers virtual)' : 'NO (prefers in-person)'}`);
  console.log(`   - Weather: ${scenario.weather.condition} (${scenario.weather.temperature_f}°F, ${scenario.weather.precipitation_pct}% precip)`);

  console.log('\n   EXPECTED OUTPUT:');
  console.log(`   - Virtual Eligible: ${scenario.expected.virtual_eligible ? '✅ YES' : '❌ NO'}`);
  console.log(`   - Reasoning: ${scenario.expected.reasoning}`);
  console.log('\n   ---');
});

console.log('\n\n=================================================');
console.log('WEIGHTED DECISION FACTORS (How LLM Decides)');
console.log('=================================================\n');

console.log('1. CLINICAL ELIGIBILITY (45% weight) - PRIMARY');
console.log('   - Must be clinically appropriate for virtual');
console.log('   - Overrides all other factors if not eligible\n');

console.log('2. PATIENT PREFERENCE (20% weight)');
console.log('   - Strong weight for patient satisfaction');
console.log('   - If patient prefers virtual → bias toward eligible\n');

console.log('3. DISTANCE & ACCESS (15% weight)');
console.log('   - >20 miles → Strong virtual recommendation');
console.log('   - >30 miles → Very strong virtual recommendation\n');

console.log('4. COMMUTE & WEATHER (20% weight)');
console.log('   - Bad weather + bike/transit → Very strong virtual');
console.log('   - Bad weather + car → Moderate virtual\n');

console.log('=================================================\n');

console.log('💡 TO RUN REAL TEST:');
console.log('   1. Start servers: npm run dev (in utilization-agent/)');
console.log('   2. Generate risk scores in UI');
console.log('   3. Check Virtual? column for enhanced reasoning\n');

console.log('🔍 EXAMPLE ENHANCED OUTPUT:');
console.log('   "Virtual eligible - 35mi distance + rainy weather + patient preference"');
console.log('   (Previously: "Stable HTN follow-up - no exam needed")\n');
