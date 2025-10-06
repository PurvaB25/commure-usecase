// Seed script for Commure Pulse database
import db, { initializeSchema } from './db.js';

console.log('🌱 Seeding database...\n');

// Initialize schema first
initializeSchema();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${randomInt(1000, 9999)}`;
}

// ============================================================================
// SEED DATA CONSTANTS
// ============================================================================

const SPECIALTIES = [
  'Internal Medicine',
  'Family Medicine',
  'Cardiology',
  'Pediatrics',
  'Orthopedics',
  'Dermatology',
  'Psychiatry',
  'Neurology'
];

const FIRST_NAMES = [
  'Sarah', 'James', 'Maria', 'Michael', 'Jennifer', 'David', 'Lisa', 'Robert',
  'Emily', 'William', 'Amanda', 'Daniel', 'Jessica', 'Christopher', 'Ashley',
  'Matthew', 'Michelle', 'Joshua', 'Melissa', 'Andrew', 'Stephanie', 'Joseph',
  'Nicole', 'Ryan', 'Elizabeth', 'Brandon', 'Rebecca', 'Kevin', 'Laura', 'Tyler',
  'Anna', 'Mark', 'Rachel', 'Eric', 'Samantha', 'Brian', 'Katherine', 'Jason',
  'Heather', 'Justin', 'Amy', 'Scott', 'Angela', 'Jonathan', 'Brittany', 'Nathan',
  'Christine', 'Adam', 'Megan', 'Zachary', 'Victoria', 'Anthony', 'Lauren',
  'Steven', 'Hannah', 'Charles', 'Kayla', 'Benjamin', 'Alexis', 'Thomas'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White',
  'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
  'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green'
];

const ZIP_CODES = ['10001', '10002', '10003', '10016', '10019', '10022', '10023', '10025'];

const COMMUTE_TYPES = ['car', 'bike', 'public_transport', 'cab'];

const CHIEF_COMPLAINTS = [
  'Hypertension follow-up',
  'Diabetes management',
  'Back pain',
  'Annual wellness check',
  'Anxiety/Depression',
  'Skin rash',
  'Stomach issues',
  'Joint pain',
  'Headaches',
  'Chest pain',
  'Shortness of breath',
  'Medication review',
  'Lab results review',
  'Vaccination',
  'Physical exam',
  'Chronic pain management',
  'Allergies',
  'Cold/Flu symptoms',
  'Thyroid management',
  'Cholesterol check'
];

const APPOINTMENT_TYPES = [
  'Annual Physical',
  'Follow-up',
  'Consultation',
  'Preventive Care',
  'Chronic Disease Management',
  'Medication Review',
  'Lab Review',
  'Wellness Visit'
];

// ============================================================================
// SEED PROVIDERS (10 providers)
// ============================================================================

const providers = [
  { provider_id: 'DR_SMITH', name: 'Dr. Emily Smith', specialty: 'Internal Medicine', max_daily_slots: 20 },
  { provider_id: 'DR_JONES', name: 'Dr. Michael Jones', specialty: 'Internal Medicine', max_daily_slots: 20 },
  { provider_id: 'DR_PATEL', name: 'Dr. Priya Patel', specialty: 'Family Medicine', max_daily_slots: 18 },
  { provider_id: 'DR_WILLIAMS', name: 'Dr. Sarah Williams', specialty: 'Cardiology', max_daily_slots: 15 },
  { provider_id: 'DR_CHEN', name: 'Dr. David Chen', specialty: 'Pediatrics', max_daily_slots: 22 },
  { provider_id: 'DR_GARCIA', name: 'Dr. Maria Garcia', specialty: 'Internal Medicine', max_daily_slots: 18 },
  { provider_id: 'DR_LEE', name: 'Dr. James Lee', specialty: 'Orthopedics', max_daily_slots: 16 },
  { provider_id: 'DR_BROWN', name: 'Dr. Lisa Brown', specialty: 'Family Medicine', max_daily_slots: 20 },
  { provider_id: 'DR_MILLER', name: 'Dr. Robert Miller', specialty: 'Cardiology', max_daily_slots: 14 },
  { provider_id: 'DR_DAVIS', name: 'Dr. Jennifer Davis', specialty: 'Pediatrics', max_daily_slots: 20 }
];

console.log('📝 Seeding providers...');
const providerStmt = db.prepare(`
  INSERT INTO providers (provider_id, name, specialty, max_daily_slots)
  VALUES (?, ?, ?, ?)
`);

for (const provider of providers) {
  providerStmt.run(provider.provider_id, provider.name, provider.specialty, provider.max_daily_slots);
}
console.log(`✓ Seeded ${providers.length} providers\n`);

// ============================================================================
// SEED PATIENTS (100 patients)
// ============================================================================

console.log('📝 Seeding patients...');
const patients = [];
const patientStmt = db.prepare(`
  INSERT INTO patients (patient_id, name, age, distance_miles, zip_code, phone, email, commute_type, preferred_virtual)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (let i = 1; i <= 100; i++) {
  const firstName = randomChoice(FIRST_NAMES);
  const lastName = randomChoice(LAST_NAMES);
  const patientId = `P${String(i).padStart(4, '0')}`;

  // 60% of patients have weather-sensitive commute types (bike/public_transport) for demo
  const isWeatherSensitive = Math.random() < 0.6;
  const commuteType = isWeatherSensitive
    ? randomChoice(['bike', 'public_transport']) // Weather-sensitive commute
    : randomChoice(COMMUTE_TYPES);
  const distanceMiles = isWeatherSensitive
    ? (Math.random() * 20 + 15).toFixed(1) // 15-35 miles for weather-sensitive patients
    : (Math.random() * 15 + 2).toFixed(1); // 2-17 miles for car/cab patients

  const patient = {
    patient_id: patientId,
    name: `${firstName} ${lastName}`,
    age: randomInt(18, 85),
    distance_miles: distanceMiles,
    zip_code: randomChoice(ZIP_CODES),
    phone: `555-${String(randomInt(100, 999)).padStart(3, '0')}-${String(randomInt(1000, 9999)).padStart(4, '0')}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
    commute_type: commuteType,
    preferred_virtual: Math.random() > 0.7 ? 1 : 0
  };

  patients.push(patient);
  patientStmt.run(
    patient.patient_id,
    patient.name,
    patient.age,
    patient.distance_miles,
    patient.zip_code,
    patient.phone,
    patient.email,
    patient.commute_type,
    patient.preferred_virtual
  );
}
console.log(`✓ Seeded ${patients.length} patients\n`);

// ============================================================================
// SEED PATIENT HISTORY (for risk scoring)
// ============================================================================

console.log('📝 Seeding patient history...');
const historyStmt = db.prepare(`
  INSERT INTO patient_history_summary (
    patient_id, total_appointments, completed, no_shows, no_show_rate, recent_reschedules
  ) VALUES (?, ?, ?, ?, ?, ?)
`);

for (const patient of patients) {
  const totalAppts = randomInt(5, 25); // Increased history range for more data

  // Increase no-shows across the board (LLM will calculate risk from this)
  // 50% of patients have moderate no-show history, 30% high, 20% low
  const historyType = Math.random();
  let noShowCount;
  let recentReschedules;

  if (historyType < 0.3) {
    // 30% - High no-show history
    noShowCount = randomInt(Math.floor(totalAppts * 0.4), Math.floor(totalAppts * 0.7));
    recentReschedules = randomInt(3, 7);
  } else if (historyType < 0.8) {
    // 50% - Moderate no-show history
    noShowCount = randomInt(Math.floor(totalAppts * 0.2), Math.floor(totalAppts * 0.4));
    recentReschedules = randomInt(1, 4);
  } else {
    // 20% - Low no-show history
    noShowCount = randomInt(0, Math.floor(totalAppts * 0.2));
    recentReschedules = randomInt(0, 2);
  }

  const completed = totalAppts - noShowCount;
  const noShowRate = totalAppts > 0 ? (noShowCount / totalAppts) : 0;

  historyStmt.run(
    patient.patient_id,
    totalAppts,
    completed,
    noShowCount,
    noShowRate.toFixed(2),
    recentReschedules
  );
}
console.log(`✓ Seeded patient history for ${patients.length} patients\n`);

// ============================================================================
// SEED WEATHER DATA (7 days: Oct 27 - Nov 2, 2025 - Last week of October)
// ============================================================================

console.log('📝 Seeding weather data...');
const weatherConditions = [
  { date: '2025-10-27', condition: 'Rainy', temperature_f: 52, precipitation_pct: 75 },
  { date: '2025-10-28', condition: 'Rainy', temperature_f: 48, precipitation_pct: 80 },
  { date: '2025-10-29', condition: 'Rainy', temperature_f: 50, precipitation_pct: 70 },
  { date: '2025-10-30', condition: 'Cloudy', temperature_f: 55, precipitation_pct: 30 },
  { date: '2025-10-31', condition: 'Rainy', temperature_f: 45, precipitation_pct: 85 },
  { date: '2025-11-01', condition: 'Sunny', temperature_f: 58, precipitation_pct: 0 },
  { date: '2025-11-02', condition: 'Sunny', temperature_f: 62, precipitation_pct: 0 }
];

const weatherStmt = db.prepare(`
  INSERT INTO weather_data (weather_id, date, zip_code, condition, temperature_f, precipitation_pct)
  VALUES (?, ?, ?, ?, ?, ?)
`);

for (const weather of weatherConditions) {
  for (const zipCode of ZIP_CODES) {
    const weatherId = `W_${weather.date}_${zipCode}`;
    weatherStmt.run(
      weatherId,
      weather.date,
      zipCode,
      weather.condition,
      weather.temperature_f,
      weather.precipitation_pct
    );
  }
}
console.log(`✓ Seeded weather data for 7 days × ${ZIP_CODES.length} zip codes\n`);

// ============================================================================
// SEED APPOINTMENTS (700 appointments across 7 days)
// ============================================================================

console.log('📝 Seeding appointments...');
const dates = weatherConditions.map(w => w.date);
const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
];

const appointmentStmt = db.prepare(`
  INSERT INTO appointments (
    appointment_id, patient_id, provider_id, scheduled_time, booked_at,
    appointment_type, chief_complaint, status, duration_mins
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let appointmentCount = 0;
const appointmentsPerDay = 70; // Reduced from 100 to add gaps - more realistic schedule

for (const date of dates) {
  let dailyCount = 0;
  const usedSlots = new Set(); // Track used time slots to avoid duplicates

  while (dailyCount < appointmentsPerDay) {
    const provider = randomChoice(providers);
    const patient = randomChoice(patients);
    const time = randomChoice(timeSlots);
    const slotKey = `${provider.provider_id}_${time}`;

    // Skip if this provider already has appointment at this time
    if (usedSlots.has(slotKey)) {
      continue;
    }

    const scheduledTime = `${date}T${time}:00`;
    const appointmentId = `A${String(appointmentCount + 1).padStart(4, '0')}`;

    // Generate realistic booking lead time (when patient scheduled the appointment)
    // Distribution mirrors real-world booking patterns
    const scheduledDate = new Date(scheduledTime);
    const bookingPattern = Math.random();
    let daysBeforeAppointment;

    if (bookingPattern < 0.20) {
      // 20% - Last-minute bookings (1-3 days before) - HIGH RISK
      daysBeforeAppointment = randomInt(1, 3);
    } else if (bookingPattern < 0.60) {
      // 40% - Optimal bookings (7-14 days before) - LOW RISK
      daysBeforeAppointment = randomInt(7, 14);
    } else if (bookingPattern < 0.90) {
      // 30% - Planned ahead (15-45 days before) - MEDIUM RISK
      daysBeforeAppointment = randomInt(15, 45);
    } else {
      // 10% - Very far ahead (60-180 days before) - MEDIUM-HIGH RISK
      daysBeforeAppointment = randomInt(60, 180);
    }

    const bookedDate = new Date(scheduledDate);
    bookedDate.setDate(bookedDate.getDate() - daysBeforeAppointment);

    // CRITICAL: Cap booking date to October 4, 2025 (today's date in the simulation)
    // Appointments cannot be booked in the future
    const todayDate = new Date('2025-10-04T00:00:00');
    if (bookedDate > todayDate) {
      // If calculated booking date is in the future, set it to a random time within the past week
      const daysAgo = randomInt(1, 7);
      bookedDate.setTime(todayDate.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
    }

    const bookedAt = bookedDate.toISOString().replace('T', ' ').substring(0, 19);

    appointmentStmt.run(
      appointmentId,
      patient.patient_id,
      provider.provider_id,
      scheduledTime,
      bookedAt,
      randomChoice(APPOINTMENT_TYPES),
      randomChoice(CHIEF_COMPLAINTS),
      'scheduled',
      randomChoice([15, 30, 45, 60])
    );

    usedSlots.add(slotKey);
    appointmentCount++;
    dailyCount++;
  }
}

console.log(`✓ Seeded ${appointmentCount} appointments across ${dates.length} days\n`);

// ============================================================================
// SEED WAITLIST PATIENTS (100 patients)
// ============================================================================

console.log('📝 Seeding waitlist patients...');
const preferredTimeframes = ['Within 1 week', 'Within 2 weeks', 'Within 1 month', 'Flexible'];

// Helper function to generate random historical dates (Aug 1 - Oct 2, 2025)
function randomHistoricalDate() {
  const startDate = new Date('2025-08-01');
  const endDate = new Date('2025-10-02');
  const randomTime = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime());
  return new Date(randomTime).toISOString().slice(0, 19).replace('T', ' ');
}

// Specialty-specific patient data for waitlist
const SPECIALTY_DATA = {
  'Pediatrics': {
    complaints: ['Ear infection', 'Cough/cold symptoms', 'Well-child visit', 'ADHD concerns', 'Growth delay', 'Asthma symptoms', 'Sports injury'],
    reasons: [
      "New patient (age 5) needs vaccination catch-up. Family recently moved from out of state, immunization records incomplete. Needs DTaP, MMR boosters before kindergarten.",
      "New patient (age 8) with recurrent ear infections. Has had 4 infections in past 6 months, parents concerned about hearing impact and school performance.",
      "New patient (age 12) for well-child checkup and sports physical. Plays soccer, needs clearance for upcoming season and growth/development assessment.",
      "New patient (age 7) with possible ADHD. Teacher reports difficulty focusing in class, parents notice homework struggles. Needs evaluation and behavioral assessment.",
      "New patient (age 3) with growth concerns. Weight/height below 5th percentile, pediatrician from previous state recommended specialist follow-up.",
      "New patient (age 10) with asthma symptoms. Exercise-induced wheezing, needs pulmonary function test and inhaler prescription for sports activities."
    ]
  },
  'Internal Medicine': {
    complaints: ['Diabetes management', 'Hypertension', 'Thyroid issues', 'Annual physical (adult)', 'Chronic fatigue', 'Weight management'],
    reasons: [
      "New patient (age 52) with type 2 diabetes diagnosis from recent ER visit. Needs to establish care and create diabetes management plan including diet and medication.",
      "New patient (age 45) with elevated blood pressure. Recent readings 150/95, wants to avoid medication if possible through lifestyle changes and monitoring.",
      "New patient (age 38) experiencing frequent headaches and fatigue. Initial labs from urgent care showed borderline thyroid levels, needs endocrinology consultation.",
      "New patient (age 60) seeking annual physical and preventive care. No major health issues but family history of heart disease requires regular monitoring.",
      "New patient (age 48) seeking weight management support. BMI 36, pre-diabetic, wants medically supervised weight loss program before considering bariatric surgery.",
      "New patient (age 55) with elevated cholesterol from recent health screening. Family history of cardiac events, wants to discuss statin therapy and lifestyle changes."
    ]
  },
  'Cardiology': {
    complaints: ['Chest pain', 'Heart palpitations', 'Hypertension management', 'Shortness of breath', 'Arrhythmia'],
    reasons: [
      "New patient (age 58) experiencing occasional chest pain with exertion. Stress test from PCP was abnormal, needs cardiac evaluation and possible catheterization.",
      "New patient (age 62) with heart palpitations and dizziness. Holter monitor showed atrial fibrillation episodes, needs anticoagulation management and rate control.",
      "New patient (age 67) post-MI (3 months ago). Completed cardiac rehab, needs ongoing cardiology care and medication optimization for secondary prevention.",
      "New patient (age 55) with uncontrolled hypertension despite 3 medications. Blood pressure averaging 160/100, needs specialist evaluation for resistant hypertension.",
      "New patient (age 70) with heart failure symptoms. Shortness of breath with minimal exertion, ankle swelling. Echocardiogram showed reduced ejection fraction (35%).",
      "New patient (age 64) family history of sudden cardiac death. Father died at 60 from heart attack, wants cardiac risk assessment and preventive screening."
    ]
  },
  'Orthopedics': {
    complaints: ['Knee pain', 'Back pain', 'Sports injury', 'Joint pain', 'Shoulder pain'],
    reasons: [
      "New patient (age 45) seeking second opinion on knee replacement. Has seen orthopedic surgeon but wants to explore conservative treatment options first.",
      "New patient (age 35) with chronic lower back pain. Tried physical therapy with no improvement, needs specialist evaluation for potential treatment options. MRI shows disc herniation.",
      "New patient (age 28) ACL tear from skiing accident. ER visit 2 weeks ago, needs surgical consultation and timeline for return to sports activities.",
      "New patient (age 55) with shoulder pain and limited range of motion. Rotator cuff suspected, failed conservative therapy, needs imaging and possible arthroscopic surgery.",
      "New patient (age 68) with severe osteoarthritis in both knees. Pain affecting daily activities, wants to discuss knee replacement vs continued conservative management.",
      "New patient (age 42) with carpal tunnel syndrome. Numbness and tingling in hands affecting work as computer programmer. Needs nerve conduction study and treatment plan."
    ]
  },
  'Family Medicine': {
    complaints: ['Annual physical', 'Flu-like symptoms', 'Preventive care', 'Minor illness', 'Health screening'],
    reasons: [
      "New patient (age 35) relocating to area. Generally healthy, needs to establish primary care and transfer prescriptions from previous provider.",
      "New patient (age 42) for annual physical and health screening. Overdue for routine labs, colonoscopy, wants comprehensive preventive care plan.",
      "New patient (age 29) with recurrent sinus infections. Has had 3 episodes in past 4 months, wants evaluation for chronic sinusitis or allergies.",
      "New patient (age 50) seeking preventive care. No current health issues but turning 50, wants age-appropriate cancer screenings and health optimization.",
      "New patient (age 38) with persistent fatigue and sleep issues. Works long hours, wants evaluation for possible vitamin deficiencies or thyroid problems.",
      "New patient (age 45) with acid reflux not responding to omeprazole. Gastroenterologist recommended but wants to try medication adjustment first with PCP."
    ]
  }
};

const waitlistStmt = db.prepare(`
  INSERT INTO waitlist_patients (
    waitlist_id, patient_name, chief_complaint, reason, preferred_timeframe, provider_preference, requested_provider_id, added_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

for (let i = 1; i <= 100; i++) {
  const firstName = randomChoice(FIRST_NAMES);
  const lastName = randomChoice(LAST_NAMES);
  const waitlistId = `WL${String(i).padStart(4, '0')}`;
  const preferredTimeframe = randomChoice(preferredTimeframes);
  const requestedProvider = randomChoice(providers);
  const addedAt = randomHistoricalDate();

  // Get specialty-specific data for this provider
  const specialtyData = SPECIALTY_DATA[requestedProvider.specialty];
  const chiefComplaint = randomChoice(specialtyData.complaints);
  const reason = randomChoice(specialtyData.reasons);

  waitlistStmt.run(
    waitlistId,
    `${firstName} ${lastName}`,
    chiefComplaint,
    reason,
    preferredTimeframe,
    requestedProvider.name,
    requestedProvider.provider_id,
    addedAt
  );
}

console.log(`✓ Seeded 100 waitlist patients with specialty-matched concerns\n`);

// ============================================================================
// SUMMARY
// ============================================================================

console.log('═══════════════════════════════════════════════════════════');
console.log('✅ DATABASE SEEDING COMPLETE');
console.log('═══════════════════════════════════════════════════════════');
console.log(`📊 SUMMARY:`);
console.log(`   • Providers: ${providers.length}`);
console.log(`   • Patients: ${patients.length}`);
console.log(`   • Appointments: ${appointmentCount} (across 7 days)`);
console.log(`   • Waitlist: 100 patients`);
console.log(`   • Weather data: ${weatherConditions.length} days × ${ZIP_CODES.length} zip codes`);
console.log(`   • Patient history: ${patients.length} records`);
console.log('═══════════════════════════════════════════════════════════\n');
console.log('🚀 Ready to start server: npm start');
console.log('');

db.close();
