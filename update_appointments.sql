-- ============================================================================
-- Update appointments to Last Week of October 2025
-- Redistribute 700 appointments across Oct 27-31 with NO conflicts
-- ============================================================================

-- Step 1: Create temporary table with new schedule (no conflicts)
CREATE TEMPORARY TABLE new_schedule AS
WITH
  -- Generate time slots (8:00 AM to 5:00 PM, 30-min intervals = 18 slots)
  time_slots AS (
    SELECT '08:00:00' as slot_time UNION ALL
    SELECT '08:30:00' UNION ALL SELECT '09:00:00' UNION ALL SELECT '09:30:00' UNION ALL
    SELECT '10:00:00' UNION ALL SELECT '10:30:00' UNION ALL SELECT '11:00:00' UNION ALL
    SELECT '11:30:00' UNION ALL SELECT '12:00:00' UNION ALL SELECT '12:30:00' UNION ALL
    SELECT '13:00:00' UNION ALL SELECT '13:30:00' UNION ALL SELECT '14:00:00' UNION ALL
    SELECT '14:30:00' UNION ALL SELECT '15:00:00' UNION ALL SELECT '15:30:00' UNION ALL
    SELECT '16:00:00' UNION ALL SELECT '16:30:00' UNION ALL SELECT '17:00:00'
  ),
  -- Generate dates for last week of October 2025
  dates AS (
    SELECT '2025-10-27' as date UNION ALL  -- Monday
    SELECT '2025-10-28' UNION ALL          -- Tuesday
    SELECT '2025-10-29' UNION ALL          -- Wednesday
    SELECT '2025-10-30' UNION ALL          -- Thursday
    SELECT '2025-10-31'                    -- Friday
  ),
  -- Number each appointment within provider
  numbered_appointments AS (
    SELECT
      appointment_id,
      provider_id,
      ROW_NUMBER() OVER (PARTITION BY provider_id ORDER BY appointment_id) - 1 as row_num
    FROM appointments
  )
SELECT
  na.appointment_id,
  na.provider_id,
  -- Calculate which day (0-4 for Mon-Fri)
  (na.row_num / 18) % 5 as day_index,
  -- Calculate which time slot (0-17)
  na.row_num % 18 as slot_index
FROM numbered_appointments na;

-- Step 2: Update appointments with new scheduled_time
UPDATE appointments
SET scheduled_time = (
  SELECT
    CASE ns.day_index
      WHEN 0 THEN '2025-10-27'
      WHEN 1 THEN '2025-10-28'
      WHEN 2 THEN '2025-10-29'
      WHEN 3 THEN '2025-10-30'
      WHEN 4 THEN '2025-10-31'
    END || 'T' ||
    CASE ns.slot_index
      WHEN 0 THEN '08:00:00'
      WHEN 1 THEN '08:30:00'
      WHEN 2 THEN '09:00:00'
      WHEN 3 THEN '09:30:00'
      WHEN 4 THEN '10:00:00'
      WHEN 5 THEN '10:30:00'
      WHEN 6 THEN '11:00:00'
      WHEN 7 THEN '11:30:00'
      WHEN 8 THEN '12:00:00'
      WHEN 9 THEN '12:30:00'
      WHEN 10 THEN '13:00:00'
      WHEN 11 THEN '13:30:00'
      WHEN 12 THEN '14:00:00'
      WHEN 13 THEN '14:30:00'
      WHEN 14 THEN '15:00:00'
      WHEN 15 THEN '15:30:00'
      WHEN 16 THEN '16:00:00'
      WHEN 17 THEN '16:30:00'
      WHEN 18 THEN '17:00:00'
    END
  FROM new_schedule ns
  WHERE appointments.appointment_id = ns.appointment_id
);

-- Step 3: Update weather data dates
UPDATE weather_data
SET date = CASE
  WHEN date = '2025-03-14' THEN
    CASE (CAST(SUBSTR(weather_id, -1) AS INTEGER) % 5)
      WHEN 0 THEN '2025-10-27'
      WHEN 1 THEN '2025-10-28'
      WHEN 2 THEN '2025-10-29'
      WHEN 3 THEN '2025-10-30'
      WHEN 4 THEN '2025-10-31'
    END
  ELSE date
END
WHERE date = '2025-03-14';

-- Step 4: Clear old risk assessments (they have outdated calculations)
DELETE FROM ai_risk_assessments;

-- Step 5: Clean up
DROP TABLE new_schedule;

-- Verification queries
SELECT 'Total appointments:' as check_type, COUNT(*) as count FROM appointments;
SELECT 'Appointments per day:' as check_type, DATE(scheduled_time) as day, COUNT(*) as count
FROM appointments
GROUP BY DATE(scheduled_time)
ORDER BY day;
SELECT 'Scheduling conflicts (should be 0):' as check_type, COUNT(*) as count
FROM (
  SELECT provider_id, scheduled_time, COUNT(*) as cnt
  FROM appointments
  GROUP BY provider_id, scheduled_time
  HAVING cnt > 1
);
