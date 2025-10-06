// API client for backend communication
const API_BASE_URL = 'http://localhost:3001/api';

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

export interface PatientHistory {
  total_appointments: number;
  completed: number;
  no_shows: number;
  no_show_rate: number;
  recent_reschedules: number;
}

export interface Weather {
  date: string;
  zip_code: string;
  condition: 'Sunny' | 'Cloudy' | 'Rainy' | 'Snowy' | 'Foggy';
  temperature_f: number;
  precipitation_pct: number;
}

/**
 * Get patient details with history
 */
export async function getPatientWithHistory(patientId: string): Promise<Patient & { history: PatientHistory }> {
  const response = await fetch(`${API_BASE_URL}/patients/${patientId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch patient');
  }
  return response.json();
}

/**
 * Get weather for a specific date and zip code
 */
export async function getWeather(date: string, zipCode: string): Promise<Weather | null> {
  const response = await fetch(`${API_BASE_URL}/weather?date=${date}&zip_code=${zipCode}`);
  if (!response.ok) {
    throw new Error('Failed to fetch weather');
  }
  return response.json();
}

/**
 * Save risk assessment to database
 */
export async function saveRiskAssessment(assessment: {
  assessment_id: string;
  appointment_id: string;
  risk_score: number;
  risk_badge: 'Low' | 'Medium' | 'High';
  primary_risk_factor: string;
  secondary_risk_factor?: string;
  contributing_factors?: string[];
  predicted_show_probability: number;
  weather_condition?: string;
  weather_impact_score?: number;
  virtual_eligible: boolean;
  virtual_reason: string;
  virtual_confidence: number;
  model_version?: string;
}): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/risk-assessments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assessment)
  });

  if (!response.ok) {
    throw new Error('Failed to save risk assessment');
  }
}

