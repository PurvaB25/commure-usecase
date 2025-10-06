// Database utilities using better-sqlite3
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize database
const dbPath = join(__dirname, '..', 'data.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

/**
 * Initialize database schema from SQL file
 */
export function initializeSchema() {
  const schemaPath = join(__dirname, '..', 'schema.sqlite.sql');
  const schema = readFileSync(schemaPath, 'utf8');

  // Execute schema (split by statement separator)
  db.exec(schema);

  console.log('✓ Database schema initialized');
}

/**
 * Get all providers
 */
export function getProviders() {
  const stmt = db.prepare('SELECT * FROM providers ORDER BY name');
  return stmt.all();
}

/**
 * Get appointments by date and/or provider
 */
export function getAppointments(params = {}) {
  let query = `
    SELECT
      a.*,
      a.booked_at,
      p.name as patient_name,
      p.commute_type,
      pr.name as provider_name,
      r.risk_score,
      r.risk_badge,
      r.primary_risk_factor,
      r.secondary_risk_factor,
      r.contributing_factors,
      r.predicted_show_probability,
      r.weather_condition,
      r.weather_impact_score,
      r.virtual_eligible,
      r.virtual_reason
    FROM appointments a
    JOIN patients p ON a.patient_id = p.patient_id
    JOIN providers pr ON a.provider_id = pr.provider_id
    LEFT JOIN ai_risk_assessments r ON a.appointment_id = r.appointment_id
    WHERE 1=1
  `;

  const queryParams = [];

  if (params.date) {
    query += ' AND DATE(a.scheduled_time) = ?';
    queryParams.push(params.date);
  }

  if (params.provider_id) {
    query += ' AND a.provider_id = ?';
    queryParams.push(params.provider_id);
  }

  if (params.status) {
    query += ' AND a.status = ?';
    queryParams.push(params.status);
  }

  query += ' ORDER BY a.scheduled_time';

  const stmt = db.prepare(query);
  return stmt.all(...queryParams);
}

/**
 * Get KPI metrics for a given date/provider
 */
export function getKPIs(params = {}) {
  const { date, provider_id } = params;

  // Total appointments
  let totalQuery = "SELECT COUNT(*) as count FROM appointments WHERE status = 'scheduled'";
  const totalParams = [];

  if (date) {
    totalQuery += ' AND DATE(scheduled_time) = ?';
    totalParams.push(date);
  }
  if (provider_id) {
    totalQuery += ' AND provider_id = ?';
    totalParams.push(provider_id);
  }

  const totalStmt = db.prepare(totalQuery);
  const total = totalStmt.get(...totalParams);

  // High risk count
  let highRiskQuery = `
    SELECT COUNT(*) as count FROM ai_risk_assessments r
    JOIN appointments a ON r.appointment_id = a.appointment_id
    WHERE r.risk_badge = 'High' AND a.status = 'scheduled'
  `;
  const highRiskParams = [];

  if (date) {
    highRiskQuery += ' AND DATE(a.scheduled_time) = ?';
    highRiskParams.push(date);
  }
  if (provider_id) {
    highRiskQuery += ' AND a.provider_id = ?';
    highRiskParams.push(provider_id);
  }

  const highRiskStmt = db.prepare(highRiskQuery);
  const highRisk = highRiskStmt.get(...highRiskParams);

  // Waitlist count
  let waitlistQuery = `SELECT COUNT(*) as count FROM waitlist_patients WHERE status = 'waiting'`;
  const waitlistParams = [];

  if (provider_id) {
    waitlistQuery += ' AND requested_provider_id = ?';
    waitlistParams.push(provider_id);
  }

  const waitlistStmt = db.prepare(waitlistQuery);
  const waitlist = waitlistStmt.get(...waitlistParams);

  return {
    total_appointments: total.count,
    high_risk_patients: highRisk.count,
    waitlist_count: waitlist.count
  };
}

/**
 * Get risk assessment for an appointment
 */
export function getRiskAssessment(appointmentId) {
  const stmt = db.prepare(`
    SELECT * FROM ai_risk_assessments WHERE appointment_id = ?
  `);
  return stmt.get(appointmentId);
}

/**
 * Save risk assessment
 */
export function saveRiskAssessment(data) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO ai_risk_assessments (
      assessment_id, appointment_id, risk_score, risk_badge,
      primary_risk_factor, secondary_risk_factor, contributing_factors,
      predicted_show_probability, weather_condition, weather_impact_score,
      virtual_eligible, virtual_reason, virtual_confidence, model_version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  return stmt.run(
    data.assessment_id,
    data.appointment_id,
    data.risk_score,
    data.risk_badge,
    data.primary_risk_factor,
    data.secondary_risk_factor,
    JSON.stringify(data.contributing_factors || []),
    data.predicted_show_probability,
    data.weather_condition,
    data.weather_impact_score || 0,
    data.virtual_eligible ? 1 : 0,
    data.virtual_reason,
    data.virtual_confidence,
    data.model_version || 'gpt-5-2025-08-07'
  );
}


/**
 * Get waitlist patients
 */
export function getWaitlistPatients(params = {}) {
  const { provider_id } = params;

  let query = `
    SELECT * FROM waitlist_patients
    WHERE status = 'waiting'
  `;
  const queryParams = [];

  if (provider_id) {
    query += ' AND requested_provider_id = ?';
    queryParams.push(provider_id);
  }

  query += ' ORDER BY added_at ASC';

  const stmt = db.prepare(query);
  return stmt.all(...queryParams);
}

/**
 * Get patient details with history
 */
export function getPatientWithHistory(patientId) {
  const patientStmt = db.prepare('SELECT * FROM patients WHERE patient_id = ?');
  const patient = patientStmt.get(patientId);

  const historyStmt = db.prepare('SELECT * FROM patient_history_summary WHERE patient_id = ?');
  const history = historyStmt.get(patientId);

  return { ...patient, history };
}

/**
 * Get weather for a date and zip code
 */
export function getWeather(date, zipCode) {
  const stmt = db.prepare(`
    SELECT * FROM weather_data WHERE date = ? AND zip_code = ?
  `);
  return stmt.get(date, zipCode);
}

/**
 * Get detailed appointment information including patient and risk assessment
 */
export function getAppointmentDetails(appointmentId) {
  const stmt = db.prepare(`
    SELECT
      a.*,
      a.booked_at,
      p.name as patient_name,
      p.age,
      p.distance_miles,
      p.zip_code,
      p.phone,
      p.email,
      p.commute_type,
      p.preferred_virtual,
      pr.name as provider_name,
      pr.specialty as provider_specialty,
      r.assessment_id,
      r.risk_score,
      r.risk_badge,
      r.primary_risk_factor,
      r.secondary_risk_factor,
      r.contributing_factors,
      r.predicted_show_probability,
      r.weather_condition,
      r.weather_impact_score,
      r.virtual_eligible,
      r.virtual_reason,
      r.virtual_confidence,
      h.total_appointments,
      h.completed,
      h.no_shows,
      h.no_show_rate,
      h.last_appointment_date,
      h.recent_reschedules
    FROM appointments a
    JOIN patients p ON a.patient_id = p.patient_id
    JOIN providers pr ON a.provider_id = pr.provider_id
    LEFT JOIN ai_risk_assessments r ON a.appointment_id = r.appointment_id
    LEFT JOIN patient_history_summary h ON a.patient_id = h.patient_id
    WHERE a.appointment_id = ?
  `);
  return stmt.get(appointmentId);
}

/**
 * Assign waitlist patient to appointment slot
 * - Updates appointment with waitlist patient's info
 * - Marks waitlist patient as filled
 */
export function assignWaitlistToSlot(waitlistId, appointmentId) {
  // Get waitlist patient details
  const waitlistStmt = db.prepare(`
    SELECT * FROM waitlist_patients WHERE waitlist_id = ?
  `);
  const waitlistPatient = waitlistStmt.get(waitlistId);

  if (!waitlistPatient) {
    throw new Error(`Waitlist patient ${waitlistId} not found`);
  }

  // Get appointment details
  const appointmentStmt = db.prepare(`
    SELECT * FROM appointments WHERE appointment_id = ?
  `);
  const appointment = appointmentStmt.get(appointmentId);

  if (!appointment) {
    throw new Error(`Appointment ${appointmentId} not found`);
  }

  // Update appointment with waitlist patient
  // Note: In a real system, we'd create a new patient record if needed
  // For v0, we'll use the waitlist patient's name directly
  const updateAppointmentStmt = db.prepare(`
    UPDATE appointments
    SET status = 'confirmed',
        chief_complaint = ?
    WHERE appointment_id = ?
  `);

  updateAppointmentStmt.run(
    waitlistPatient.chief_complaint,
    appointmentId
  );

  // Mark waitlist patient as filled
  const updateWaitlistStmt = db.prepare(`
    UPDATE waitlist_patients
    SET status = 'filled',
        filled_appointment_id = ?,
        filled_at = ?
    WHERE waitlist_id = ?
  `);

  updateWaitlistStmt.run(
    appointmentId,
    new Date().toISOString(),
    waitlistId
  );

  return {
    appointment_id: appointmentId,
    waitlist_id: waitlistId,
    patient_name: waitlistPatient.patient_name,
    scheduled_time: appointment.scheduled_time,
    message: `Successfully assigned ${waitlistPatient.patient_name} to appointment slot`
  };
}

/**
 * Save agent audit log
 */
export function saveAuditLog(data) {
  const stmt = db.prepare(`
    INSERT INTO agent_audit_logs (
      log_id, request_id, agent_type, timestamp, latency_ms,
      model, input_tokens, output_tokens, total_tokens, estimated_cost_usd,
      status, error_message, appointment_id, patient_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  return stmt.run(
    data.log_id,
    data.request_id,
    data.agent_type,
    data.timestamp,
    data.latency_ms,
    data.model,
    data.input_tokens,
    data.output_tokens,
    data.total_tokens,
    data.estimated_cost_usd,
    data.status,
    data.error_message || null,
    data.appointment_id || null,
    data.patient_id || null
  );
}

/**
 * Get audit logs with optional filters
 */
export function getAuditLogs(params = {}) {
  let query = 'SELECT * FROM agent_audit_logs WHERE 1=1';
  const queryParams = [];

  if (params.agent_type) {
    query += ' AND agent_type = ?';
    queryParams.push(params.agent_type);
  }

  if (params.status) {
    query += ' AND status = ?';
    queryParams.push(params.status);
  }

  if (params.limit) {
    query += ' ORDER BY timestamp DESC LIMIT ?';
    queryParams.push(params.limit);
  } else {
    query += ' ORDER BY timestamp DESC LIMIT 100';
  }

  const stmt = db.prepare(query);
  return stmt.all(...queryParams);
}

export default db;
