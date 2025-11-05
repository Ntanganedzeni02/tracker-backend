-- Silulo Foundation Seed Data
-- Test data for development

-- Clear existing data
TRUNCATE TABLE bootcamps, payments, businesses, users RESTART IDENTITY CASCADE;

-- Insert Test Users
-- Password for all test users: "password123"
-- Hash: $2a$10$8Z8qXQZ8Z8qXQZ8Z8qXQZOqXQZ8Z8qXQZ8Z8qXQZOqXQZ8Z8qXQZ8u

-- Admin User
INSERT INTO users (name, surname, id_number, email, phone, password_hash, hub, role)
VALUES (
  'Admin',
  'User',
  '8001015800080',
  'admin@silulo.com',
  '0821234567',
  '$2a$10$YQZ8qXQZ8Z8qXQZ8Z8qXQuGZvN5Z8Z8qXQZ8Z8qXQZ5Z8qXQZ8Z8qXQ',
  'Johannesburg',
  'admin'
);

-- Test Entrepreneurs
INSERT INTO users (name, surname, id_number, email, phone, password_hash, hub, role)
VALUES 
(
  'Thabo',
  'Molefe',
  '9005125800081',
  'thabo@example.com',
  '0821234568',
  '$2a$10$YQZ8qXQZ8Z8qXQZ8Z8qXQuGZvN5Z8Z8qXQZ8Z8qXQZ5Z8qXQZ8Z8qXQ',
  'Dunnon',
  'entrepreneur'
),
(
  'Nomsa',
  'Dlamini',
  '8506235800082',
  'nomsa@example.com',
  '0821234569',
  '$2a$10$YQZ8qXQZ8Z8qXQZ8Z8qXQuGZvN5Z8Z8qXQZ8Z8qXQZ5Z8qXQZ8Z8qXQ',
  'Khayelitsha',
  'entrepreneur'
),
(
  'Sipho',
  'Ndlovu',
  '9208145800083',
  'sipho@example.com',
  '0821234570',
  '$2a$10$YQZ8qXQZ8Z8qXQZ8Z8qXQuGZvN5Z8Z8qXQZ8Z8qXQZ5Z8qXQZ8Z8qXQ',
  'Bellville',
  'entrepreneur'
);

-- Insert Test Businesses
INSERT INTO businesses (user_id, name, type, registration_number, location, industry, years_operating, description, turnover_range)
VALUES 
(
  2,
  'Thabo Tech Solutions',
  'PTY LTD',
  '2019/123456/07',
  'Dunnon, Cape Town',
  'Technology',
  5,
  'Web development and IT consulting services for small businesses',
  'R100k-R500k'
),
(
  2,
  'Molefe Consulting',
  'Sole Proprietor',
  '2021/789012/07',
  'Khayelitsha, Cape Town',
  'Business Consulting',
  3,
  'Business strategy and consulting services',
  'R50k-R100k'
),
(
  3,
  'Nomsa Catering',
  'CC',
  '2018/345678/23',
  'Bellville, Cape Town',
  'Food & Beverage',
  6,
  'Catering services for events and corporate functions',
  'R500k-R1M'
),
(
  4,
  'Sipho Transport Services',
  'PTY LTD',
  '2020/901234/07',
  'Khayelitsha, Cape Town',
  'Logistics',
  4,
  'Delivery and transportation services',
  'R100k-R500k'
);

-- Insert Payment Records
-- Generate payments for the last 6 months for each business
INSERT INTO payments (business_id, month, year, status, notes)
VALUES 
-- Thabo Tech Solutions - Business ID 1
(1, 5, 2025, 'paid', 'Paid on time'),
(1, 6, 2025, 'paid', 'Paid on time'),
(1, 7, 2025, 'paid', 'Paid on time'),
(1, 8, 2025, 'pending', 'Payment expected'),
(1, 9, 2025, 'unpaid', 'Awaiting payment'),
(1, 10, 2025, 'unpaid', 'Current month'),

-- Molefe Consulting - Business ID 2
(2, 5, 2025, 'paid', 'Paid on time'),
(2, 6, 2025, 'unpaid', 'Late payment'),
(2, 7, 2025, 'paid', 'Paid after reminder'),
(2, 8, 2025, 'paid', 'Paid on time'),
(2, 9, 2025, 'pending', 'Payment expected'),
(2, 10, 2025, 'unpaid', 'Current month'),

-- Nomsa Catering - Business ID 3
(3, 5, 2025, 'paid', 'Paid on time'),
(3, 6, 2025, 'paid', 'Paid on time'),
(3, 7, 2025, 'paid', 'Paid on time'),
(3, 8, 2025, 'paid', 'Paid on time'),
(3, 9, 2025, 'paid', 'Paid on time'),
(3, 10, 2025, 'unpaid', 'Current month'),

-- Sipho Transport Services - Business ID 4
(4, 5, 2025, 'unpaid', 'Missed payment'),
(4, 6, 2025, 'paid', 'Paid late'),
(4, 7, 2025, 'paid', 'Paid on time'),
(4, 8, 2025, 'pending', 'Payment expected'),
(4, 9, 2025, 'unpaid', 'Awaiting payment'),
(4, 10, 2025, 'unpaid', 'Current month');

-- Insert Bootcamp Assignments
INSERT INTO bootcamps (user_id, cohort, cohort_year, attendance, total_sessions, bootcamp_status, assigned_date)
VALUES 
(2, 'Cohort 2024-Q1', 2024, 8, 10, 'active', '2024-01-15 10:00:00'),
(3, 'Cohort 2024-Q2', 2024, 10, 10, 'completed', '2024-04-10 10:00:00'),
(4, 'Cohort 2025-Q1', 2025, 3, 10, 'active', '2025-01-10 10:00:00');

-- Success message and summary
SELECT 
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM businesses) as total_businesses,
  (SELECT COUNT(*) FROM payments) as total_payments,
  (SELECT COUNT(*) FROM bootcamps) as total_bootcamp_assignments,
  'Seed data inserted successfully!' as status;