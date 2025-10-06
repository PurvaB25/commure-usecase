// AI Agent implementations using OpenAI Function Calling
// Each agent uses structured outputs with strict JSON schemas for reliability

import { openai } from './openai';
import { getWeather, type Weather } from './api';
import { generateRequestId, calculateCost, logAgentExecution } from './audit';
import type {
  Appointment,
  Patient,
  RiskAssessment,
  BulkCampaignResult,
  DailySummary,
} from '../types/schema';

// ============================================================================
// AGENT 1: NO-SHOW RISK SCORER
// ============================================================================

const generateRiskAssessmentFunction = {
  name: 'generate_risk_assessment',
  description: 'Generate a no-show risk assessment for a patient appointment',
  parameters: {
    type: 'object',
    properties: {
      risk_score: {
        type: 'number',
        description: 'Risk score from 0 (will show) to 100 (will no-show)',
        minimum: 0,
        maximum: 100,
      },
      risk_badge: {
        type: 'string',
        enum: ['Low', 'Medium', 'High'],
        description: 'Risk category for UI display',
      },
      primary_risk_factor: { type: 'string' },
      secondary_risk_factor: { type: 'string' },
      contributing_factors: {
        type: 'array',
        items: { type: 'string' },
        description: 'Additional risk factors',
      },
      predicted_show_probability: {
        type: 'number',
        description: 'Probability patient will show (0-1)',
        minimum: 0,
        maximum: 1,
      },
      recommendation: { type: 'string' },
    },
    required: ['risk_score', 'risk_badge', 'primary_risk_factor', 'predicted_show_probability'],
  },
};

// Calculate weather impact on risk score
function calculateWeatherRisk(weather: Weather | null, commuteType: string): number {
  if (!weather) return 0;

  if (weather.condition === 'Snowy') {
    if (commuteType === 'bike' || commuteType === 'public_transport') {
      return 25; // +25 risk points
    }
    return 10;
  }
  if (weather.condition === 'Rainy') {
    if (commuteType === 'bike' || commuteType === 'public_transport') {
      return 15; // +15 risk points
    }
    return 5;
  }
  return 0; // Sunny/Cloudy = no impact
}

export async function generateRiskScore(
  patient: Patient,
  appointment: Appointment,
  patientHistory: {
    total_appointments: number;
    completed: number;
    no_shows: number;
    no_show_rate: number;
    recent_reschedules: number;
  },
  model: 'gpt-5-nano' | 'gpt-4.1' = 'gpt-5-nano'
): Promise<RiskAssessment> {
  const appointmentDate = new Date(appointment.scheduled_time);
  const bookedDate = appointment.booked_at ? new Date(appointment.booked_at) : new Date();
  const leadTimeDays = Math.ceil((appointmentDate.getTime() - bookedDate.getTime()) / (1000 * 60 * 60 * 24));

  // Fetch weather for appointment date
  const dateStr = appointment.scheduled_time.split('T')[0];
  const weather = await getWeather(dateStr, patient.zip_code);
  const weatherRisk = calculateWeatherRisk(weather, patient.commute_type);

  const systemPrompt = `You are a no-show risk assessment expert with 15 years of experience.

SCORING GUIDELINES:
- 0-40 = Low risk (patient very likely to show)
- 40-70 = Medium risk (patient may no-show)
- 70-100 = High risk (patient likely to no-show)

KEY RISK FACTORS (weighted):
1. Historical no-show rate (weight 40%) - MOST IMPORTANT
   - Primary predictor of future behavior
   - 30%+ no-show rate = strong risk signal

2. Weather + commute type combination (weight 20%)
   - Rainy/Snowy + bike/public transport = HIGH RISK
   - Rainy + car/cab = LOW RISK
   - Weather risk values: Snow+bike/public (+25), Rain+bike/public (+15), Snow+car (+10), Rain+car (+5)

3. Booking lead time (weight 15%) - U-SHAPED RISK CURVE
   - VERY SHORT (1-2 days): HIGH RISK (+10-12 points)
     * Last-minute booking = poor planning, low commitment
     * Insufficient time to arrange transportation/childcare
   - OPTIMAL (3-14 days): LOW RISK (+2-4 points)
     * Sweet spot for commitment and planning
     * Recent enough to maintain commitment, enough time to prepare
   - LONG (15-45 days): MEDIUM RISK (+5-8 points)
     * Commitment weakens over time
     * Life circumstances may change
   - VERY LONG (60+ days): HIGHER RISK (+10-15 points)
     * Very low psychological commitment to distant dates
     * High probability circumstances change, patient forgets or books elsewhere

4. Distance from clinic (weight 10%)
   - Greater distance = transportation barriers = higher risk

5. Recent reschedules (weight 10%)
   - 3+ reschedules = pattern of indecision/unreliability

6. Appointment type (weight 5%)
   - Routine follow-ups have higher no-show rates than urgent/new patient visits

WEATHER IMPACT RULES:
- Snow + bike/public = +25 risk points
- Rain + bike/public = +15 risk points
- Snow + car = +10 risk points
- Rain + car = +5 risk points
- Sunny/Clear = 0 risk points

OUTPUT:
Generate risk score (0-100), risk badge, and explain how booking lead time + weather + commute type affect the assessment.`;

  const weatherDesc = weather
    ? `${weather.condition} (${weather.temperature_f}°F, ${weather.precipitation_pct}% precipitation)`
    : 'Unknown';

  const userPrompt = `Patient: ${patient.name}

History:
- Total appointments: ${patientHistory.total_appointments}
- Completed: ${patientHistory.completed}
- No-shows: ${patientHistory.no_shows}
- No-show rate: ${(patientHistory.no_show_rate * 100).toFixed(0)}%
- Recent reschedules: ${patientHistory.recent_reschedules}

Upcoming Appointment:
- Type: ${appointment.appointment_type}
- Booking lead time: ${leadTimeDays} days (patient booked ${leadTimeDays} days before appointment)
- Distance: ${patient.distance_miles} miles
- Patient age: ${patient.age}
- Commute type: ${patient.commute_type}

Weather Forecast:
- Conditions: ${weatherDesc}
- Weather risk adjustment: +${weatherRisk} points

Generate a risk score (0-100) that includes weather impact and identify top 2-3 risk factors.`;

  // Track audit metrics
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const modelConfig = model === 'gpt-4.1'
      ? {
          model: 'gpt-4.1' as const,
          temperature: 0.1,
          max_completion_tokens: 8192,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
        }
      : { model: 'gpt-5-nano' as const };

    const response = await openai.chat.completions.create({
      ...modelConfig,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      tools: [{ type: 'function', function: generateRiskAssessmentFunction }],
      tool_choice: { type: 'function', function: { name: 'generate_risk_assessment' } },
    });

    const toolCall = response.choices[0].message.tool_calls?.[0];
    if (!toolCall || toolCall.type !== 'function' || toolCall.function.name !== 'generate_risk_assessment') {
      throw new Error('Invalid response from LLM');
    }

    const result = JSON.parse(toolCall.function.arguments);

    // Log successful execution
    const latency = Date.now() - startTime;
    const usage = response.usage!;
    await logAgentExecution({
      request_id: requestId,
      agent_type: 'risk_scorer',
      latency_ms: latency,
      model: model,
      input_tokens: usage.prompt_tokens,
      output_tokens: usage.completion_tokens,
      total_tokens: usage.total_tokens,
      estimated_cost_usd: calculateCost(usage.prompt_tokens, usage.completion_tokens, model),
      status: 'success',
      appointment_id: appointment.appointment_id,
      patient_id: patient.patient_id
    });

    // Add weather context to result
    return {
      ...result,
      weather_condition: weather?.condition,
      weather_impact_score: weatherRisk,
    } as RiskAssessment;
  } catch (error) {
    // Log error
    const latency = Date.now() - startTime;
    await logAgentExecution({
      request_id: requestId,
      agent_type: 'risk_scorer',
      latency_ms: latency,
      model: model,
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      estimated_cost_usd: 0,
      status: 'error',
      error_message: error instanceof Error ? error.message : String(error),
      appointment_id: appointment.appointment_id,
      patient_id: patient.patient_id
    });

    throw error;
  }
}

// ============================================================================
// AGENT 2: VIRTUAL ELIGIBILITY ASSESSOR
// ============================================================================

const assessVirtualEligibilityFunction = {
  name: 'assess_virtual_eligibility',
  description: 'Determine if an appointment can be conducted virtually',
  parameters: {
    type: 'object',
    properties: {
      virtual_eligible: {
        type: 'boolean',
        description: 'Can this appointment be virtual?'
      },
      virtual_reason: {
        type: 'string',
        description: 'Clear clinical explanation with supporting factors. Format: "Clinical rationale based on appointment type/complaint. Supporting contextual factors." (max 250 chars)'
      },
      confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: 'Confidence in assessment'
      }
    },
    required: ['virtual_eligible', 'virtual_reason', 'confidence']
  }
};

export async function assessVirtualEligibility(
  appointment: Appointment,
  chiefComplaint: string,
  patient?: {
    distance_miles: number;
    commute_type: string;
    preferred_virtual: number;
    zip_code: string;
  },
  weather?: Weather | null,
  model: 'gpt-5-nano' | 'gpt-4.1' = 'gpt-5-nano'
): Promise<{ virtual_eligible: boolean; virtual_reason: string; confidence: number }> {
  const systemPrompt = `You are a telehealth eligibility expert. Determine if appointments can be conducted virtually.

WEIGHTED DECISION FACTORS:

1. **CLINICAL ELIGIBILITY (45% weight)** - PRIMARY FACTOR
   ELIGIBLE FOR VIRTUAL:
   ✅ Routine follow-ups for stable chronic conditions (HTN, diabetes)
   ✅ Medication refills and dosage adjustments
   ✅ Mental health consultations (anxiety, depression)
   ✅ Lab result reviews
   ✅ Post-op check-ins (non-physical assessment)
   ✅ Prescription renewals
   ✅ Wellness consultations

   REQUIRES IN-PERSON:
   ❌ Physical examinations (annual physicals, new patient exams)
   ❌ Procedures (vaccinations, injections, minor surgeries)
   ❌ Acute conditions requiring examination (chest pain, injuries)
   ❌ New diagnoses requiring physical assessment
   ❌ Any complaint with "pain" requiring palpation
   ❌ Conditions requiring vitals measurement (BP, temp, etc.)

2. **PATIENT PREFERENCE (20% weight)**
   - If patient prefers virtual → Strong bias toward virtual eligible
   - Patient satisfaction and adherence are critical
   - Respect patient choice when clinically appropriate

3. **DISTANCE & ACCESS (15% weight)**
   - Distance >20 miles → Strong virtual recommendation (reduce travel burden)
   - Distance >30 miles → Very strong virtual recommendation
   - Distance <10 miles → Neutral (in-person is feasible)

4. **COMMUTE & WEATHER (20% weight)**
   - Rainy/Snowy weather + bike/public transport → Very strong virtual recommendation
   - Rainy/Snowy weather + car → Moderate virtual recommendation
   - Clear weather → Neutral
   - Goal: Remove weather barriers and travel safety concerns

DECISION LOGIC:
- Clinical eligibility MUST be met first (45% weight)
- If clinically eligible, consider preference (20%), distance (15%), and weather/commute (20%)
- If clinically ineligible, virtual is NOT recommended regardless of other factors
- Confidence score should reflect alignment across all factors

OUTPUT FORMAT REQUIREMENTS:
Your virtual_reason MUST:
1. START with the clinical rationale based on the appointment type and chief complaint
2. Explain WHY this specific visit type is/isn't suitable for virtual care
3. Then mention supporting contextual factors (distance, weather, preference) if relevant
4. Use clear, professional language (max 250 chars)
5. Format: "Clinical reason why suitable/unsuitable for virtual. Supporting factors if applicable."

EXAMPLES:
✅ GOOD: "Routine HTN follow-up appropriate for virtual - stable chronic condition requiring only medication review and BP discussion. Patient lives 25 miles away with rainy weather, strongly favors virtual visit."
✅ GOOD: "Annual physical requires in-person - comprehensive exam needs vital signs, physical assessment, and preventive screenings that cannot be done remotely."
❌ BAD: "HTN follow-up; virtual favored due to distance, rainy bike, pref."
❌ BAD: "Clinically eligible. rain + public transit strongly favor virtual."`;

  // Build context-aware user prompt
  let contextDetails = '';

  if (patient) {
    contextDetails += `\nPatient Context:`;
    contextDetails += `\n- Distance from clinic: ${patient.distance_miles} miles`;
    contextDetails += `\n- Commute type: ${patient.commute_type}`;
    contextDetails += `\n- Virtual preference: ${patient.preferred_virtual ? 'Yes (prefers virtual)' : 'No (prefers in-person)'}`;
  }

  if (weather) {
    contextDetails += `\n\nWeather Forecast:`;
    contextDetails += `\n- Condition: ${weather.condition}`;
    contextDetails += `\n- Temperature: ${weather.temperature_f}°F`;
    contextDetails += `\n- Precipitation: ${weather.precipitation_pct}%`;
  }

  const userPrompt = `Appointment Type: ${appointment.appointment_type}
Chief Complaint: ${chiefComplaint}${contextDetails}

Assess virtual eligibility for this specific appointment. Your reason MUST start with a clear clinical explanation of why this appointment type and chief complaint are suitable or unsuitable for virtual care, then mention supporting contextual factors. Focus on clinical rationale first.`;

  const modelConfig = model === 'gpt-4.1'
    ? {
        model: 'gpt-4.1' as const,
        temperature: 0.1,
        max_completion_tokens: 8192,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      }
    : { model: 'gpt-5-nano' as const };

  const response = await openai.chat.completions.create({
    ...modelConfig,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    tools: [{ type: 'function', function: assessVirtualEligibilityFunction }],
    tool_choice: { type: 'function', function: { name: 'assess_virtual_eligibility' } },
  });

  const toolCall = response.choices[0].message.tool_calls?.[0];
  if (!toolCall || toolCall.type !== 'function' || toolCall.function.name !== 'assess_virtual_eligibility') {
    throw new Error('Invalid response from LLM');
  }

  const result = JSON.parse(toolCall.function.arguments);
  return result;
}

// ============================================================================
// AGENT 3: BULK CAMPAIGN GENERATOR
// ============================================================================

const generateBulkCampaignsFunction = {
  name: 'generate_bulk_campaigns',
  description: 'Generate outreach campaigns for all risk categories',
  parameters: {
    type: 'object',
    properties: {
      campaigns: {
        type: 'array',
        description: 'List of campaigns by category',
        items: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: ['low', 'medium', 'virtual', 'new_patient', 'high_risk_virtual', 'high_risk_non_virtual'],
              description: 'Risk category'
            },
            touchpoints: {
              type: 'array',
              description: 'List of touchpoints for this category',
              items: {
                type: 'object',
                properties: {
                  timing: { type: 'string', description: 'e.g., "1 day before"' },
                  messages: {
                    type: 'object',
                    properties: {
                      sms: { type: 'string', description: 'SMS message (max 160 chars)' },
                      email: {
                        type: 'object',
                        properties: {
                          subject: { type: 'string' },
                          body: { type: 'string' }
                        },
                        required: ['subject', 'body']
                      },
                      ehr_notification: { type: 'string', description: 'EHR/Patient portal notification (max 200 chars)' }
                    },
                    required: ['sms', 'email', 'ehr_notification']
                  }
                },
                required: ['timing', 'messages']
              }
            }
          },
          required: ['category', 'touchpoints']
        }
      }
    },
    required: ['campaigns']
  }
};

export async function generateBulkCampaigns(
  date: string,
  providerName: string,
  weatherCondition?: string,
  weatherTemp?: number,
  model: 'gpt-5-nano' | 'gpt-4.1' = 'gpt-5-nano'
): Promise<BulkCampaignResult> {
  const systemPrompt = `You are a healthcare outreach specialist with expertise in behavioral psychology and patient engagement.

PRIMARY OBJECTIVE: Increase appointment confirmations and reduce no-show rates through strategic, personalized messaging.

BEHAVIORAL STRATEGIES BY RISK CATEGORY:

1. LOW RISK - 1 touchpoint (Goal: Reinforce commitment, maintain show rate):
   - Timing: 1 day before appointment
   - Strategy: Simple, friendly reminder that reinforces their reliable behavior
   - Tone: Warm, appreciative, straightforward
   - CTA: "Reply CONFIRM or call if changes needed"
   - Psychology: Positive reinforcement for good behavior

2. MEDIUM RISK - 2 touchpoints (Goal: Build accountability, secure explicit confirmation):
   - Timing: 3 days before, then 1 day before
   - Strategy: Create multiple touchpoints to build commitment
   - First touch: Friendly confirmation request with easy reply option
   - Second touch: Reminder with emphasis on provider expecting them
   - Tone: Professional, confirmation-seeking, relationship-building
   - CTA: "Reply YES to confirm" or "Call to reschedule"
   - Psychology: Commitment device + social accountability

3. VIRTUAL CANDIDATE - 1 touchpoint (Goal: Convert to virtual to overcome barriers):
   - Timing: 2 days before appointment
   - Strategy: Highlight convenience and eliminate travel barriers
   - Benefits to emphasize: Save time, no travel, same quality care, convenience regardless of conditions
   - Subtle weather mention: Instead of "weather-proof," use phrases like:
     * "No matter what the day brings..."
     * "Stay comfortable at home..."
     * "Avoid the commute, especially with [weather condition] expected..."
   - Tone: Helpful, modern, convenience-focused
   - CTA: "Reply VIRTUAL to switch" + phone number
   - Psychology: Make the easier option more appealing

4. NEW PATIENT - 1 touchpoint (Goal: Fill open slots quickly with urgency):
   - Timing: Immediate notification (same day slot opens)
   - Strategy: Create urgency around limited availability
   - Elements: Specific date/time, provider name, sense of opportunity
   - Tone: Urgent but friendly, exclusive opportunity
   - CTA: "Reply YES to claim" + phone number for immediate booking
   - Psychology: Scarcity + urgency + low-friction response

5. HIGH RISK + VIRTUAL - 3 touchpoints (Goal: Remove barriers, convert to virtual, maximize attendance):
   - Timing: 7 days before, 3 days before, 1 day before
   - Strategy: High-risk engagement + strong virtual conversion emphasis
   - First touch: Warm reminder with virtual option highlighted + weather mention + easy reschedule
   - Second touch: Virtual benefits emphasized (no commute, weather-proof) + confirmation request
   - Third touch: Final reminder heavily emphasizing virtual convenience + weather considerations + support
   - Tone: Supportive, flexible, virtual-first, patient-centered
   - CTA: "Switch to VIRTUAL" (primary), "Confirm in-person," or "Reschedule easily"
   - Weather requirement: MUST weave weather into ALL THREE email touchpoints subtly and naturally
   - Virtual emphasis: Strong focus on virtual as the preferred/easier option in all touchpoints
   - Psychology: Remove all friction by making virtual the path of least resistance

6. HIGH RISK + NON VIRTUAL - 3 touchpoints (Goal: Build commitment, ensure attendance for in-person visits):
   - Timing: 7 days before, 3 days before, 1 day before
   - Strategy: High-risk engagement for patients requiring in-person visits
   - First touch: Warm reminder emphasizing appointment importance + weather mention + flexible rescheduling available
   - Second touch: Confirmation request + weather mention + emphasize we're here to help if needed
   - Third touch: Final reminder with weather considerations + emphasize provider expecting them
   - Tone: Supportive, understanding, relationship-focused, empathetic
   - CTA: "Reply CONFIRM" or "Reschedule if needed"
   - Weather requirement: MUST weave weather into ALL THREE email touchpoints subtly and naturally
   - Focus: Build commitment through relationship and flexibility (do NOT mention specific services like transportation)
   - Psychology: Show we care and understand challenges, emphasize provider relationship and importance of visit

MESSAGE BEST PRACTICES:
- SMS: Max 160 characters, always include clear action (Reply YES, CONFIRM, etc.)
- Email: Compelling subject + well-formatted body with proper structure
  * Use professional greeting (Dear [Patient Name],)
  * Break content into clear paragraphs with proper spacing
  * Include appointment details in a clear format (date, time, provider)
  * Use a warm, professional closing (Warm regards, [Practice Name] Team)
  * Add clear call-to-action buttons/instructions
  * Include contact information (phone number)
  * Use line breaks between sections for readability
- EHR Notification: Brief portal message (max 200 chars)
  * Professional but concise
  * Include key info: appointment date/time, action needed
  * Format: "Reminder: Appointment with Dr. [Name] on [Date] at [Time]. Click to confirm or reschedule."
  * Include clickable action when possible
  * More detailed than SMS but shorter than email
- Personalization: Use provider name, show relationship
- Action-oriented: Every message needs clear next step
- Reduce friction: Make confirmation/reschedule extremely easy
- Value emphasis: Remind why appointment matters
- Human touch: Write like a caring staff member, not a robot
- Avoid: Medical jargon, guilt-tripping, barriers to action

CRITICAL - APPOINTMENT DATE RULE:
- Touchpoint timing (e.g., "1 day before", "3 days before") refers to when the MESSAGE IS SENT
- The APPOINTMENT DATE itself never changes - it's always the same date provided
- Example: For Oct 31 appointment with "1 day before" touchpoint:
  ✓ CORRECT: "Your appointment is tomorrow, Oct 31" (message sent Oct 30)
  ✗ INCORRECT: "Your appointment is on Oct 30"
- Always reference the ACTUAL APPOINTMENT DATE in all message content, not the send date

EMAIL FORMATTING EXAMPLE:
Subject: Your appointment with Dr. Smith tomorrow at 2:00 PM

Dear [Patient Name],

This is a friendly reminder about your upcoming appointment:

📅 Date: [Day, Month Date]
🕐 Time: [Time]
👨‍⚕️ Provider: Dr. [Provider Name]
📍 Location: [Practice Name]

We're looking forward to seeing you and providing you with excellent care.

To confirm your appointment, simply reply CONFIRM to this email or call us at (555) 555-0100.

If you need to reschedule, we're happy to help you find a time that works better.

Warm regards,
The [Practice Name] Team
(555) 555-0100

OUTPUT:
Generate all 5 campaign categories with SMS, Email, and EHR Notification for each touchpoint, optimized for maximum confirmation rates. Use proper email formatting with greetings, spacing, and closings.`;

  const weatherInfo = weatherCondition
    ? `Weather Forecast: ${weatherCondition}, ${weatherTemp}°F - may impact travel`
    : 'Weather: Clear conditions expected';

  // Parse date string manually to avoid timezone conversion issues
  // "2025-10-31" should stay as October 31, not shift to October 30 due to UTC conversion
  const [year, month, day] = date.split('-').map(Number);
  const appointmentDateObj = new Date(year, month - 1, day);

  const appointmentDateLong = appointmentDateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  const appointmentDateShort = appointmentDateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });

  const userPrompt = `=== APPOINTMENT INFORMATION ===
APPOINTMENT DATE: ${appointmentDateLong}
PROVIDER: ${providerName}
${weatherInfo}

🚨 CRITICAL INSTRUCTION - READ CAREFULLY 🚨
The patient's appointment is on: ${appointmentDateLong}

DO NOT CHANGE THIS DATE IN YOUR MESSAGES!
- "7 days before" = message is SENT 7 days before, but appointment is still ${appointmentDateLong}
- "3 days before" = message is SENT 3 days before, but appointment is still ${appointmentDateLong}
- "1 day before" = message is SENT 1 day before, but appointment is still ${appointmentDateLong}

In ALL messages, use one of these formats for the appointment date:
✓ "${appointmentDateLong}"
✓ "${appointmentDateShort}"
✓ DO NOT calculate or change the date based on touchpoint timing

=== CAMPAIGNS TO GENERATE ===
Create campaigns for:
1. Low risk (1 touch - 1 day before)
   → Appointment date in message: ${appointmentDateLong}

2. Medium risk (2 touches - 3 days before, 1 day before)
   → Appointment date in ALL messages: ${appointmentDateLong}

3. Virtual candidate (1 touch - 2 days before)
   → Appointment date in message: ${appointmentDateLong}
   → Subtle weather mention

4. New patient slot available (1 touch - immediate notification)
   → Appointment date in message: ${appointmentDateLong}

5. High risk + Virtual (3 touches - 7 days before, 3 days before, 1 day before)
   → Appointment date in ALL messages: ${appointmentDateLong}
   → IMPORTANT: Weave weather SUBTLY into all three email touchpoints
   → PRIMARY FOCUS: Convert to virtual - emphasize convenience, weather-proof, no commute
   → CTA hierarchy: Virtual (primary) > Confirm in-person > Reschedule

6. High risk + Non Virtual (3 touches - 7 days before, 3 days before, 1 day before)
   → Appointment date in ALL messages: ${appointmentDateLong}
   → IMPORTANT: Weave weather SUBTLY into all three email touchpoints
   → Focus on barrier removal: transportation help, weather preparation, support available
   → Emphasize importance of in-person visit and provider relationship

For HIGH RISK categories (5, 6): Integrate weather naturally into sentence flow in all three emails. DO NOT use labels like "Weather update:" - instead weave it in like "With rain expected tomorrow..." or "As you prepare for your appointment in rainy conditions...".

Include SMS, Email, AND EHR Notification for each touchpoint.`;

  // Track audit metrics
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const modelConfig = model === 'gpt-4.1'
      ? {
          model: 'gpt-4.1' as const,
          temperature: 0.1,
          max_completion_tokens: 8192,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
        }
      : { model: 'gpt-5-nano' as const };

    const response = await openai.chat.completions.create({
      ...modelConfig,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      tools: [{ type: 'function', function: generateBulkCampaignsFunction }],
      tool_choice: { type: 'function', function: { name: 'generate_bulk_campaigns' } },
    });

    const toolCall = response.choices[0].message.tool_calls?.[0];
    if (!toolCall || toolCall.type !== 'function' || toolCall.function.name !== 'generate_bulk_campaigns') {
      throw new Error('Invalid response from LLM');
    }

    const result = JSON.parse(toolCall.function.arguments);

    // Log successful execution
    const latency = Date.now() - startTime;
    const usage = response.usage!;
    await logAgentExecution({
      request_id: requestId,
      agent_type: 'outreach_sequencer',
      latency_ms: latency,
      model: model,
      input_tokens: usage.prompt_tokens,
      output_tokens: usage.completion_tokens,
      total_tokens: usage.total_tokens,
      estimated_cost_usd: calculateCost(usage.prompt_tokens, usage.completion_tokens, model),
      status: 'success'
    });

    return result as BulkCampaignResult;
  } catch (error) {
    // Log error
    const latency = Date.now() - startTime;
    await logAgentExecution({
      request_id: requestId,
      agent_type: 'outreach_sequencer',
      latency_ms: latency,
      model: model,
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      estimated_cost_usd: 0,
      status: 'error',
      error_message: error instanceof Error ? error.message : String(error)
    });

    throw error;
  }
}

// ============================================================================
// AGENT 6: DAILY SUMMARY GENERATOR
// ============================================================================

const generateDailySummaryFunction = {
  name: 'generate_daily_summary',
  description: 'Generate a comprehensive daily briefing for a doctor one day before their appointments',
  parameters: {
    type: 'object',
    properties: {
      executive_summary: {
        type: 'string',
        description: 'High-level overview of the day (3-4 sentences)'
      },
      key_insights: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of 3-5 key insights or notable items for the day',
        minItems: 3,
        maxItems: 5
      },
      recommendations: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of 2-4 actionable recommendations for the doctor or staff',
        minItems: 2,
        maxItems: 4
      }
    },
    required: ['executive_summary', 'key_insights', 'recommendations']
  }
};

interface AppointmentWithRisk {
  appointment_id: string;
  patient_name: string;
  scheduled_time: string;
  appointment_type: string;
  chief_complaint: string;
  risk_badge: string | null;
  virtual_eligible: number | null;
}

export async function generateDailySummary(
  appointments: AppointmentWithRisk[],
  waitlistCount: number,
  providerName: string,
  date: string,
  providerId?: string,
  providerSpecialty?: string,
  weatherCondition?: string,
  weatherTemp?: number,
  model: 'gpt-5-nano' | 'gpt-4.1' = 'gpt-5-nano'
): Promise<DailySummary> {
  // Calculate metrics from appointment data
  const totalAppointments = appointments.length;
  const newPatients = 0; // No "New Patient" appointment type in seed data
  const returningPatients = totalAppointments;

  const highRiskPatients = appointments.filter(apt => apt.risk_badge === 'High').length;
  const mediumRiskPatients = appointments.filter(apt => apt.risk_badge === 'Medium').length;
  const lowRiskPatients = appointments.filter(apt => apt.risk_badge === 'Low').length;

  const virtualEligibleCount = appointments.filter(apt => apt.virtual_eligible === 1).length;

  // Calculate schedule gaps (break hours)
  const sortedAppointments = [...appointments].sort((a, b) =>
    new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
  );

  const breakHours = [];
  for (let i = 0; i < sortedAppointments.length - 1; i++) {
    const currentEnd = new Date(sortedAppointments[i].scheduled_time);
    currentEnd.setMinutes(currentEnd.getMinutes() + 30); // Assume 30 min appointments

    const nextStart = new Date(sortedAppointments[i + 1].scheduled_time);
    const gapMinutes = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60);

    if (gapMinutes >= 30) {
      breakHours.push({
        start_time: currentEnd.toISOString(),
        end_time: nextStart.toISOString(),
        duration_mins: gapMinutes
      });
    }
  }

  // Calculate utilization
  const totalScheduledMinutes = totalAppointments * 30;
  const totalScheduledHours = totalScheduledMinutes / 60;

  // Calculate available hours (assume 8-hour workday from first to last appointment)
  let totalAvailableHours = 8;
  if (sortedAppointments.length > 0) {
    const firstAppt = new Date(sortedAppointments[0].scheduled_time);
    const lastAppt = new Date(sortedAppointments[sortedAppointments.length - 1].scheduled_time);
    const workdayMinutes = (lastAppt.getTime() - firstAppt.getTime()) / (1000 * 60) + 30;
    totalAvailableHours = workdayMinutes / 60;
  }

  const utilizationPercentage = totalAvailableHours > 0
    ? (totalScheduledHours / totalAvailableHours) * 100
    : 0;

  // Create patient summaries
  const patientSummaries = appointments.map(apt => ({
    patient_name: apt.patient_name,
    scheduled_time: apt.scheduled_time,
    appointment_type: apt.appointment_type,
    chief_complaint: apt.chief_complaint,
    risk_level: (apt.risk_badge || 'Unknown') as 'Low' | 'Medium' | 'High' | 'Unknown',
    is_new_patient: false, // No "New Patient" appointment type in seed data
    virtual_eligible: apt.virtual_eligible === 1
  }));

  // Fetch and analyze waitlist if provider info is available
  let topWaitlistMatches: any[] | undefined;
  if (providerId && providerSpecialty) {
    try {
      const { analyzeGeneralWaitlist } = await import('./waitlist-agents');

      // Fetch waitlist patients for this provider
      const waitlistResponse = await fetch(`http://localhost:3001/api/waitlist?provider_id=${providerId}`);
      const waitlistPatients = await waitlistResponse.json();

      if (waitlistPatients.length > 0) {
        // Analyze waitlist to get priority ranking
        const analysis = await analyzeGeneralWaitlist(
          waitlistPatients,
          providerName,
          providerSpecialty
        );

        // Get top 3 priority patients
        topWaitlistMatches = analysis.priority_patients.slice(0, 3);
      }
    } catch (error) {
      console.error('Failed to fetch/analyze waitlist for daily summary:', error);
      // Continue without waitlist data
    }
  }

  // Use LLM to generate narrative summary
  const systemPrompt = `You are an AI medical operations assistant that creates daily briefings for physicians.

TASK:
Generate an executive summary, key insights, and recommendations for a doctor's upcoming day.

GUIDELINES:
1. **Executive Summary** (3-4 sentences):
   - High-level overview of the day
   - Mention total appointments, any notable patterns
   - Highlight critical items (high-risk patients, new patients)
   - Reference weather if relevant to patient attendance

2. **Key Insights** (3-5 bullet points):
   - Notable patterns in appointments (e.g., "3 new patients scheduled")
   - Risk distribution insights (e.g., "5 high-risk appointments may need proactive outreach")
   - Waitlist opportunities (e.g., "4 patients on waitlist could fill potential gaps")
   - Virtual care opportunities (e.g., "6 appointments eligible for virtual conversion")
   - Schedule efficiency (e.g., "2-hour gap between 2 PM and 4 PM")

3. **Recommendations** (2-4 actionable items):
   - Proactive actions for high-risk patients
   - Waitlist outreach suggestions
   - Virtual conversion opportunities
   - Schedule optimization suggestions
   - Weather-related contingencies if applicable

TONE:
- Professional, concise, actionable
- Focus on operational efficiency and patient care
- Highlight opportunities, not just problems`;

  const weatherInfo = weatherCondition
    ? `Weather: ${weatherCondition}, ${weatherTemp}°F`
    : 'Weather: Clear conditions';

  const userPrompt = `Generate a daily briefing for ${providerName} on ${date}:

METRICS:
- Total Appointments: ${totalAppointments}
- New Patients: ${newPatients}
- Returning Patients: ${returningPatients}
- Waitlist Count: ${waitlistCount}

RISK BREAKDOWN:
- High Risk: ${highRiskPatients} (potential no-shows, may need outreach)
- Medium Risk: ${mediumRiskPatients}
- Low Risk: ${lowRiskPatients}

OPPORTUNITIES:
- Virtual Eligible: ${virtualEligibleCount} appointments
- New Patient Opportunities: ${highRiskPatients} (high-risk slots that could be filled from waitlist)

SCHEDULE:
- Total Scheduled Hours: ${totalScheduledHours.toFixed(1)} hours
- Utilization: ${utilizationPercentage.toFixed(0)}%
- Break Hours: ${breakHours.length} gaps in schedule

WEATHER:
${weatherInfo}

PATIENT SUMMARIES:
${patientSummaries.map((p, idx) => `${idx + 1}. ${p.scheduled_time.split('T')[1].substring(0, 5)} - ${p.patient_name} (${p.appointment_type}) - ${p.chief_complaint} [Risk: ${p.risk_level}]`).join('\n')}

Generate an executive summary, key insights, and actionable recommendations for this day.`;

  const modelConfig = model === 'gpt-4.1'
    ? {
        model: 'gpt-4.1' as const,
        temperature: 0.1,
        max_completion_tokens: 8192,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      }
    : { model: 'gpt-5-nano' as const };

  const response = await openai.chat.completions.create({
    ...modelConfig,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    tools: [{ type: 'function', function: generateDailySummaryFunction }],
    tool_choice: { type: 'function', function: { name: 'generate_daily_summary' } }
  });

  const toolCall = response.choices[0].message.tool_calls?.[0];
  if (!toolCall || toolCall.type !== 'function' || toolCall.function.name !== 'generate_daily_summary') {
    throw new Error('Invalid response from LLM');
  }

  const llmResult = JSON.parse(toolCall.function.arguments);

  return {
    total_appointments: totalAppointments,
    new_patients: newPatients,
    returning_patients: returningPatients,
    waitlist_count: waitlistCount,
    high_risk_patients: highRiskPatients,
    new_patient_opportunities: highRiskPatients,
    total_scheduled_hours: totalScheduledHours,
    total_available_hours: totalAvailableHours,
    utilization_percentage: utilizationPercentage,
    break_hours: breakHours,
    low_risk_count: lowRiskPatients,
    medium_risk_count: mediumRiskPatients,
    high_risk_count: highRiskPatients,
    virtual_eligible_count: virtualEligibleCount,
    patient_summaries: patientSummaries,
    top_waitlist_matches: topWaitlistMatches,
    executive_summary: llmResult.executive_summary,
    key_insights: llmResult.key_insights,
    recommendations: llmResult.recommendations
  };
}
