// Waitlist-specific AI agents for intelligent waitlist analysis and optimization
// Uses OpenAI Function Calling with structured outputs

import { openai } from './openai';

// ============================================================================
// TYPES
// ============================================================================

export interface WaitlistPatient {
  waitlist_id: string;
  patient_name: string;
  chief_complaint: string;
  reason: string; // Detailed reason for visit (2-3 sentences)
  preferred_timeframe: string; // e.g., "Within 1 week", "Within 2 weeks", "Within 1 month", "Flexible"
  provider_preference: string;
  requested_provider_id: string; // Specific provider ID requested
  added_at: string;
}

export interface WaitlistPriorityPatient {
  waitlist_id: string;
  patient_name: string;
  priority_score: number; // 0-100
  ranking: number;
  urgency_level: 'Critical' | 'High' | 'Medium' | 'Low';
  wait_time_days: number;
  recommended_action: string;
  clinical_summary: string;
  chief_complaint: string;
  provider_preference: string;
}

export interface GeneralWaitlistAnalysis {
  total_patients: number;
  priority_patients: WaitlistPriorityPatient[];
  summary: string;
  recommendations: string[];
}

// ============================================================================
// AGENT: GENERAL WAITLIST ANALYZER
// ============================================================================

const analyzeGeneralWaitlistFunction = {
  name: 'analyze_general_waitlist',
  description: 'Analyze entire waitlist and prioritize patients by urgency, wait time, and clinical need',
  parameters: {
    type: 'object',
    properties: {
      priority_patients: {
        type: 'array',
        description: 'Patients ranked by priority (highest to lowest)',
        items: {
          type: 'object',
          properties: {
            waitlist_id: { type: 'string' },
            patient_name: { type: 'string' },
            priority_score: {
              type: 'number',
              description: 'Priority score 0-100 (100 = most urgent)',
              minimum: 0,
              maximum: 100,
            },
            urgency_level: {
              type: 'string',
              enum: ['Critical', 'High', 'Medium', 'Low'],
              description: 'Urgency classification',
            },
            wait_time_days: { type: 'number' },
            recommended_action: {
              type: 'string',
              description: 'Specific action to take for this patient',
            },
            clinical_summary: {
              type: 'string',
              description: 'Brief summary of clinical need and why this patient is prioritized',
            },
            chief_complaint: { type: 'string' },
            provider_preference: { type: 'string' },
          },
          required: [
            'waitlist_id',
            'patient_name',
            'priority_score',
            'urgency_level',
            'wait_time_days',
            'recommended_action',
            'clinical_summary',
            'chief_complaint',
            'provider_preference',
          ],
        },
      },
      summary: {
        type: 'string',
        description: 'Overall summary of waitlist status (2-3 sentences)',
      },
      recommendations: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of actionable recommendations for waitlist management',
      },
    },
    required: ['priority_patients', 'summary', 'recommendations'],
  },
};

export async function analyzeGeneralWaitlist(
  waitlistPatients: WaitlistPatient[],
  providerName: string,
  providerSpecialty: string,
  model: 'gpt-5-nano' | 'gpt-4.1' = 'gpt-5-nano'
): Promise<GeneralWaitlistAnalysis> {
  const systemPrompt = `You are an expert healthcare operations specialist analyzing a new patient waitlist.

TASK:
Analyze all waitlist patients and prioritize them based on urgency, wait time, and clinical need. Provide actionable insights for the scheduling team.

PRIORITIZATION FACTORS:
1. **Clinical Urgency (50% weight)**:
   - Critical: Severe symptoms requiring immediate attention (chest pain, severe depression, acute injuries)
   - High: Chronic conditions needing timely management (uncontrolled diabetes, hypertension)
   - Medium: Important but not urgent (follow-ups, medication reviews, routine chronic care)
   - Low: Preventive care, annual physicals, routine wellness visits

2. **Wait Time (30% weight)**:
   - Critical: >60 days waiting
   - High: 30-60 days waiting
   - Medium: 15-30 days waiting
   - Low: <15 days waiting

3. **Preferred Timeframe (20% weight)**:
   - Critical: "Within 1 week"
   - High: "Within 2 weeks"
   - Medium: "Within 1 month"
   - Low: "Flexible"

PRIORITY SCORE CALCULATION:
- 90-100: Critical - Schedule immediately, highest priority
- 75-89: High - Schedule within 1 week
- 60-74: Medium - Schedule within 2-3 weeks
- 0-59: Low - Can wait, routine scheduling

IMPORTANT: You MUST assign a numeric priority_score (0-100) for EVERY patient. Do not use 0 unless the patient has no urgency.

OUTPUT:
- Rank ALL patients by priority score (highest to lowest)
- Each patient MUST have a priority_score between 0-100
- Provide clinical summary explaining why each patient is prioritized (2-3 sentences)
- Give overall waitlist summary
- Provide 3-5 actionable recommendations for the scheduling team`;

  const userPrompt = `Analyze this waitlist for ${providerName} (${providerSpecialty}):

WAITLIST PATIENTS (${waitlistPatients.length} total):
${JSON.stringify(
    waitlistPatients.map((p) => ({
      waitlist_id: p.waitlist_id,
      patient_name: p.patient_name,
      chief_complaint: p.chief_complaint,
      reason: p.reason,
      preferred_timeframe: p.preferred_timeframe,
      provider_preference: p.provider_preference,
      requested_provider_id: p.requested_provider_id,
      added_at: p.added_at,
      wait_time_days: Math.floor(
        (new Date().getTime() - new Date(p.added_at).getTime()) / (1000 * 60 * 60 * 24)
      ),
    })),
    null,
    2
  )}

Analyze and prioritize all patients. Provide actionable recommendations for the scheduling team.`;

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
      tools: [
        {
          type: 'function',
          function: analyzeGeneralWaitlistFunction,
        },
      ],
      tool_choice: {
        type: 'function',
        function: { name: 'analyze_general_waitlist' },
      },
    });

    const toolCall = response.choices[0].message.tool_calls?.[0];
    if (!toolCall || toolCall.type !== 'function' || toolCall.function.name !== 'analyze_general_waitlist') {
      throw new Error('Invalid response from LLM');
    }

    const result = JSON.parse(toolCall.function.arguments);

    // Add ranking numbers
    const rankedPatients: WaitlistPriorityPatient[] = result.priority_patients.map(
      (patient: any, index: number) => ({
        ...patient,
        ranking: index + 1,
      })
    );

    return {
      total_patients: waitlistPatients.length,
      priority_patients: rankedPatients,
      summary: result.summary,
      recommendations: result.recommendations,
    };
  } catch (error) {
    console.error('Error analyzing general waitlist:', error);
    throw error;
  }
}
