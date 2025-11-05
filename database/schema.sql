-- Silulo Foundation Database Schema
-- PostgreSQL Database Setup

-- Drop existing tables if they exist
DROP TABLE IF EXISTS bootcamps CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create Users Table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  surname VARCHAR(255) NOT NULL,
  id_number VARCHAR(13) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  hub VARCHAR(255),
  role VARCHAR(50) DEFAULT 'entrepreneur',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Businesses Table
CREATE TABLE businesses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  registration_number VARCHAR(100) UNIQUE NOT NULL,
  location VARCHAR(255),
  industry VARCHAR(100),
  years_operating INTEGER,
  description TEXT,
  turnover_range VARCHAR(100),
  logo_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Payments Table
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  status VARCHAR(50) DEFAULT 'unpaid',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Bootcamps Table
CREATE TABLE bootcamps (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cohort VARCHAR(100),
  assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_id_number ON users(id_number);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_businesses_user_id ON businesses(user_id);
CREATE INDEX idx_businesses_registration_number ON businesses(registration_number);
CREATE INDEX idx_payments_business_id ON payments(business_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_year_month ON payments(year, month);
CREATE INDEX idx_bootcamps_user_id ON bootcamps(user_id);

-- Add comments for documentation
COMMENT ON TABLE users IS 'Stores entrepreneur and admin user information';
COMMENT ON TABLE businesses IS 'Stores business information linked to entrepreneurs';
COMMENT ON TABLE payments IS 'Tracks monthly payment status for businesses';
COMMENT ON TABLE bootcamps IS 'Tracks bootcamp cohort assignments for entrepreneurs';

-- Success message
SELECT 'Database schema created successfully!' AS status;