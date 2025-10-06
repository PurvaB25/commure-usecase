// Express API server for Commure Pulse
import express from 'express';
import cors from 'cors';
import {
  initializeSchema,
  getProviders,
  getAppointments,
  getKPIs,
  getRiskAssessment,
  saveRiskAssessment,
  getWaitlistPatients,
  getPatientWithHistory,
  getWeather,
  assignWaitlistToSlot,
  getAppointmentDetails,
  saveAuditLog,
  getAuditLogs
} from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Middleware - Configure CORS for Replit
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// Initialize database on startup
initializeSchema();

// ============================================================================
// PROVIDER ENDPOINTS
// ============================================================================

app.get('/api/providers', (req, res) => {
  try {
    const providers = getProviders();
    res.json(providers);
  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

// ============================================================================
// APPOINTMENT ENDPOINTS
// ============================================================================

app.get('/api/appointments', (req, res) => {
  try {
    const { date, provider_id, status } = req.query;
    const appointments = getAppointments({ date, provider_id, status });
    res.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

app.get('/api/appointments/:appointmentId/details', (req, res) => {
  try {
    const details = getAppointmentDetails(req.params.appointmentId);
    if (!details) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    res.json(details);
  } catch (error) {
    console.error('Error fetching appointment details:', error);
    res.status(500).json({ error: 'Failed to fetch appointment details' });
  }
});

// ============================================================================
// KPI ENDPOINTS
// ============================================================================

app.get('/api/kpis', (req, res) => {
  try {
    const { date, provider_id } = req.query;
    const kpis = getKPIs({ date, provider_id });
    res.json(kpis);
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    res.status(500).json({ error: 'Failed to fetch KPIs' });
  }
});

// ============================================================================
// RISK ASSESSMENT ENDPOINTS
// ============================================================================

app.get('/api/risk-assessments/:appointmentId', (req, res) => {
  try {
    const assessment = getRiskAssessment(req.params.appointmentId);
    res.json(assessment || null);
  } catch (error) {
    console.error('Error fetching risk assessment:', error);
    res.status(500).json({ error: 'Failed to fetch risk assessment' });
  }
});

app.post('/api/risk-assessments', (req, res) => {
  try {
    const result = saveRiskAssessment(req.body);
    res.json({ success: true, changes: result.changes });
  } catch (error) {
    console.error('Error saving risk assessment:', error);
    res.status(500).json({ error: 'Failed to save risk assessment' });
  }
});

// ============================================================================
// WAITLIST ENDPOINTS
// ============================================================================

app.get('/api/waitlist', (req, res) => {
  try {
    const { provider_id } = req.query;
    const waitlist = getWaitlistPatients({ provider_id });
    res.json(waitlist);
  } catch (error) {
    console.error('Error fetching waitlist:', error);
    res.status(500).json({ error: 'Failed to fetch waitlist' });
  }
});

// ============================================================================
// PATIENT ENDPOINTS
// ============================================================================

app.get('/api/patients/:patientId', (req, res) => {
  try {
    const patient = getPatientWithHistory(req.params.patientId);
    res.json(patient);
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

// ============================================================================
// WEATHER ENDPOINTS
// ============================================================================

app.get('/api/weather', (req, res) => {
  try {
    const { date, zip_code } = req.query;
    const weather = getWeather(date, zip_code);
    res.json(weather || null);
  } catch (error) {
    console.error('Error fetching weather:', error);
    res.status(500).json({ error: 'Failed to fetch weather' });
  }
});

// ============================================================================
// WAITLIST ASSIGNMENT ENDPOINTS
// ============================================================================

app.post('/api/waitlist/assign-slot', (req, res) => {
  try {
    const { waitlist_id, appointment_id } = req.body;

    if (!waitlist_id || !appointment_id) {
      return res.status(400).json({ error: 'Missing waitlist_id or appointment_id' });
    }

    const result = assignWaitlistToSlot(waitlist_id, appointment_id);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error assigning waitlist to slot:', error);
    res.status(500).json({ error: 'Failed to assign waitlist patient to slot' });
  }
});

// ============================================================================
// AUDIT LOG ENDPOINTS
// ============================================================================

app.post('/api/audit-logs', (req, res) => {
  try {
    const result = saveAuditLog(req.body);
    res.json({ success: true, changes: result.changes });
  } catch (error) {
    console.error('Error saving audit log:', error);
    res.status(500).json({ error: 'Failed to save audit log' });
  }
});

app.get('/api/audit-logs', (req, res) => {
  try {
    const { agent_type, status, limit } = req.query;
    const logs = getAuditLogs({ agent_type, status, limit: limit ? parseInt(limit) : undefined });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║              🏥 COMMURE PULSE API SERVER                ║
║                                                          ║
║  Status: Running                                         ║
║  Host: ${HOST}                                           ║
║  Port: ${PORT}                                            ║
║  URL: http://${HOST}:${PORT}                              ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
});
