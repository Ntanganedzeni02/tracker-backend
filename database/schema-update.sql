-- Add new fields to existing tables

-- Add status field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Add overdue status support (already works with existing status field in payments)
-- Just adding a comment for clarity
COMMENT ON COLUMN payments.status IS 'Payment status: paid, unpaid, pending, or overdue';

-- Add attendance field to bootcamps table
ALTER TABLE bootcamps ADD COLUMN IF NOT EXISTS attendance INTEGER DEFAULT 0;
ALTER TABLE bootcamps ADD COLUMN IF NOT EXISTS total_sessions INTEGER DEFAULT 0;
ALTER TABLE bootcamps ADD COLUMN IF NOT EXISTS bootcamp_status VARCHAR(50) DEFAULT 'active';
ALTER TABLE bootcamps ADD COLUMN IF NOT EXISTS cohort_year INTEGER;

-- Update existing bootcamp records to extract year from cohort name
UPDATE bootcamps 
SET cohort_year = CAST(SUBSTRING(cohort FROM '\d{4}') AS INTEGER)
WHERE cohort_year IS NULL AND cohort LIKE '%202%';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_bootcamps_cohort_year ON bootcamps(cohort_year);
CREATE INDEX IF NOT EXISTS idx_bootcamps_status ON bootcamps(bootcamp_status);

SELECT 'Schema updates completed successfully!' AS status;