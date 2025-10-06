// TypeScript types matching schema.sql structure
// These types ensure data consistency between JSON mocks and production database

// ============================================================================
// DIMENSION TYPES
// ============================================================================

export interface Provider {
  provider_id: string;
  name: string;
  specialty: string;
  max_daily_slots: number;
}

export interface Patient {
  patient_id: string;
  name: string;
  age: number;
  distance_miles: number;
  zip_code: string;
  phone: string;
  email: string;
  commute_type: 'car' | 'bike' | 'public_transport' | 'cab';
  preferred_virtual: number;
}

// ============================================================================
// FACT TABLE TYPES
// ============================================================================

export interface Appointment {
  appointment_id: string;
  patient_id: string;
  provider_id: string;
  scheduled_time: string; // ISO 8601 format
  booked_at?: string; // When appointment was scheduled (for true lead time calculation)
  appointment_type: string;
  chief_complaint: string;
  status: 'scheduled' | 'completed' | 'no_show' | 'cancelled';
  duration_mins?: number;
}

export interface RiskScore {
  score_id: string;
  appointment_id: string;
  risk_score: number; // 0-100
  risk_badge: 'Low' | 'Medium' | 'High';
  primary_risk_factor: string;
  secondary_risk_factor: string;
  generated_at: string; // ISO 8601 format
}

// ============================================================================
// AGENT OUTPUT TYPES
// ============================================================================

// Agent 1: No-Show Risk Scorer outputs
export interface RiskAssessment {
  risk_score: number;
  risk_badge: 'Low' | 'Medium' | 'High';
  primary_risk_factor: string;
  secondary_risk_factor?: string;
  contributing_factors?: string[];
  predicted_show_probability: number;
  recommendation?: string;
  weather_condition?: string;
  weather_impact_score?: number;
}

// Agent 2: Outreach Sequencer outputs
export interface MessageVariant {
  tone: string;
  subject?: string; // For email only
  message: string;
  char_count?: number;
}

export interface Touchpoint {
  timing: string; // e.g., "7 days before"
  send_date?: string; // ISO 8601
  channel: 'SMS' | 'Email';
  variants: MessageVariant[];
}

export interface OutreachSequence {
  touchpoints: Touchpoint[];
}

// New: Campaign category types
export type CampaignCategory = 'low' | 'medium' | 'virtual' | 'new_patient' | 'high_risk_virtual' | 'high_risk_non_virtual';

export interface CampaignMessage {
  sms: string;
  email: {
    subject: string;
    body: string;
  };
  ehr_notification: string;
}

export interface CampaignTouchpoint {
  timing: string; // e.g., "1 day before"
  messages: CampaignMessage;
}

export interface CategoryCampaign {
  category: CampaignCategory;
  touchpoints: CampaignTouchpoint[];
}

export interface BulkCampaignResult {
  campaigns: CategoryCampaign[];
}

// ============================================================================
// HELPER TYPES FOR UI
// ============================================================================

// Extended appointment with related data for UI display
export interface AppointmentWithDetails extends Appointment {
  patient?: Patient;
  provider?: Provider;
  risk_score?: RiskAssessment;
}

// Patient history for risk calculation
export interface PatientHistory {
  patient_id: string;
  patient_name: string;
  total_appointments: number;
  completed: number;
  no_shows: number;
  no_show_rate: number;
  last_appointment_date?: string;
  recent_reschedules: number;
}

// ============================================================================
// DAILY SUMMARY TYPES (AGENT 6)
// ============================================================================

// Brief summary of a patient for daily briefing
export interface PatientBrief {
  patient_name: string;
  scheduled_time: string;
  appointment_type: string;
  chief_complaint: string;
  risk_level: 'Low' | 'Medium' | 'High' | 'Unknown';
  is_new_patient: boolean;
  virtual_eligible: boolean;
}

// Break hours in schedule (gaps between appointments)
export interface BreakHour {
  start_time: string;
  end_time: string;
  duration_mins: number;
}

// Waitlist priority patient (imported for Daily Summary)
export interface WaitlistPriorityPatient {
  waitlist_id: string;
  patient_name: string;
  priority_score: number;
  ranking: number;
  urgency_level: 'Critical' | 'High' | 'Medium' | 'Low';
  wait_time_days: number;
  recommended_action: string;
  clinical_summary: string;
  chief_complaint: string;
  provider_preference: string;
}

// Complete daily summary for doctor briefing
export interface DailySummary {
  // Overview metrics
  total_appointments: number;
  new_patients: number;
  returning_patients: number;

  // Waitlist & opportunities
  waitlist_count: number;
  high_risk_patients: number; // New patient opportunities
  new_patient_opportunities: number; // Same as high_risk_patients

  // Utilization metrics
  total_scheduled_hours: number;
  total_available_hours: number;
  utilization_percentage: number;

  // Break hours
  break_hours: BreakHour[];

  // Risk breakdown
  low_risk_count: number;
  medium_risk_count: number;
  high_risk_count: number;

  // Virtual eligibility
  virtual_eligible_count: number;

  // Patient briefs
  patient_summaries: PatientBrief[];

  // Top waitlist matches (top 3 priority patients)
  top_waitlist_matches?: WaitlistPriorityPatient[];

  // Narrative summary
  executive_summary: string;
  key_insights: string[];
  recommendations: string[];
}
