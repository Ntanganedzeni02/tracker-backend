-- Update existing bootcamp records with proper data

-- Update cohort years from cohort names
UPDATE bootcamps 
SET cohort_year = CAST(SUBSTRING(cohort FROM '\d{4}') AS INTEGER)
WHERE cohort_year IS NULL AND cohort LIKE '%202%';

-- Set default values for attendance and sessions if null
UPDATE bootcamps 
SET attendance = 0 
WHERE attendance IS NULL;

UPDATE bootcamps 
SET total_sessions = 0 
WHERE total_sessions IS NULL;

-- Set default bootcamp_status to active if null
UPDATE bootcamps 
SET bootcamp_status = 'active' 
WHERE bootcamp_status IS NULL;

-- Verify updates
SELECT 
  b.id, 
  u.name, 
  u.surname, 
  b.cohort, 
  b.cohort_year, 
  b.attendance, 
  b.total_sessions, 
  b.bootcamp_status
FROM bootcamps b
JOIN users u ON b.user_id = u.id;

SELECT 'Bootcamp data updated successfully!' AS status;