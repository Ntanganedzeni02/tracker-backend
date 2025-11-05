require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    'https://tracker.vercel.app/',
    'http://localhost:3000'                   // For local testing
  ],
  credentials: true
}));
app.use(express.json());

// PostgreSQL Connection Pool
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'silulo_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Admin Middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ==================== AUTHENTICATION ROUTES ====================

// POST /api/auth/register - Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, surname, idNumber, email, phone, password, hub } = req.body;

    // Validation
    if (!name || !surname || !idNumber || !email || !password) {
      return res.status(400).json({ error: 'Name, surname, ID number, email, and password are required' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR id_number = $2',
      [email, idNumber]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email or ID number already exists' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (name, surname, id_number, email, phone, password_hash, hub, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, surname, email, phone, hub, role, created_at`,
      [name, surname, idNumber, email, phone, password_hash, hub, 'entrepreneur']
    );

    const user = result.rows[0];

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        surname: user.surname,
        email: user.email,
        phone: user.phone,
        hub: user.hub,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login - User login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        surname: user.surname,
        email: user.email,
        phone: user.phone,
        hub: user.hub,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ==================== BUSINESS ROUTES ====================

// POST /api/businesses - Create business
app.post('/api/businesses', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      type,
      registrationNumber,
      location,
      industry,
      yearsOperating,
      description,
      turnover_range,
      logoUrl
    } = req.body;

    if (!name || !registrationNumber) {
      return res.status(400).json({ error: 'Business name and registration number are required' });
    }

    // Check if registration number already exists
    const existing = await pool.query(
      'SELECT id FROM businesses WHERE registration_number = $1',
      [registrationNumber]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Business with this registration number already exists' });
    }

    const result = await pool.query(
      `INSERT INTO businesses (user_id, name, type, registration_number, location, industry, 
       years_operating, description, turnover_range, logo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [req.user.userId, name, type, registrationNumber, location, industry, 
       yearsOperating, description, turnover_range, logoUrl]
    );

    res.status(201).json({
      message: 'Business created successfully',
      business: result.rows[0]
    });
  } catch (error) {
    console.error('Create business error:', error);
    res.status(500).json({ error: 'Failed to create business' });
  }
});

// GET /api/businesses/:userId - Get user's businesses
app.get('/api/businesses/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Users can only view their own businesses unless they're admin
    if (req.user.userId !== parseInt(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      'SELECT * FROM businesses WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({ businesses: result.rows });
  } catch (error) {
    console.error('Get businesses error:', error);
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});

// ==================== ENTREPRENEUR ROUTES ====================

// POST /api/entrepreneur/payment - Create payment record (entrepreneur)
app.post('/api/entrepreneur/payment', authenticateToken, async (req, res) => {
  try {
    const { businessId, month, year } = req.body;

    if (!businessId || !month || !year) {
      return res.status(400).json({ error: 'Business ID, month, and year are required' });
    }

    // Verify business belongs to user
    const businessCheck = await pool.query(
      'SELECT id FROM businesses WHERE id = $1 AND user_id = $2',
      [businessId, req.user.userId]
    );

    if (businessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this business' });
    }

    // Check if payment already exists
    const existing = await pool.query(
      'SELECT id FROM payments WHERE business_id = $1 AND month = $2 AND year = $3',
      [businessId, month, year]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Payment record already exists for this month/year' });
    }

    const result = await pool.query(
      `INSERT INTO payments (business_id, month, year, status, notes)
       VALUES ($1, $2, $3, 'pending', 'Created by entrepreneur')
       RETURNING *`,
      [businessId, month, year]
    );

    res.status(201).json({
      message: 'Payment record created successfully',
      payment: result.rows[0]
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Failed to create payment record' });
  }
});

// GET /api/entrepreneur/dashboard - Get entrepreneur data
app.get('/api/entrepreneur/dashboard', authenticateToken, async (req, res) => {
  try {
    // Get user info
    const userResult = await pool.query(
      'SELECT id, name, surname, email, phone, hub FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get businesses
    const businessResult = await pool.query(
      'SELECT * FROM businesses WHERE user_id = $1',
      [req.user.userId]
    );

    const businesses = businessResult.rows;

    // Get payments for all businesses
    let payments = [];
    if (businesses.length > 0) {
      const businessIds = businesses.map(b => b.id);
      const paymentResult = await pool.query(
        `SELECT p.*, b.name as business_name 
         FROM payments p 
         JOIN businesses b ON p.business_id = b.id
         WHERE p.business_id = ANY($1)
         ORDER BY p.year DESC, p.month DESC`,
        [businessIds]
      );
      payments = paymentResult.rows;
    }

    // Get bootcamp assignment
    const bootcampResult = await pool.query(
      'SELECT cohort, assigned_date FROM bootcamps WHERE user_id = $1',
      [req.user.userId]
    );

    res.json({
      user,
      businesses,
      payments,
      bootcamp: bootcampResult.rows[0] || null
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// ==================== ADMIN USER ROUTES ====================

// GET /api/admin/entrepreneurs - List all entrepreneurs with search
app.get('/api/admin/entrepreneurs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { search, hub, status } = req.query;
    
    let query = `
      SELECT u.id, u.name, u.surname, u.id_number, u.email, u.phone, u.hub, u.status, u.created_at,
       COUNT(DISTINCT b.id) as business_count
       FROM users u
       LEFT JOIN businesses b ON u.id = b.user_id
       WHERE u.role = 'entrepreneur'
    `;
    
    const params = [];
    let paramCount = 1;

    // Add search filter
    if (search) {
      query += ` AND (
        LOWER(u.name) LIKE LOWER(${paramCount}) OR 
        LOWER(u.surname) LIKE LOWER(${paramCount}) OR 
        LOWER(u.email) LIKE LOWER(${paramCount})
      )`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Add hub filter
    if (hub) {
      query += ` AND u.hub = ${paramCount}`;
      params.push(hub);
      paramCount++;
    }

    // Add status filter
    if (status) {
      query += ` AND u.status = ${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` GROUP BY u.id ORDER BY u.created_at DESC`;

    const result = await pool.query(query, params);
    res.json({ entrepreneurs: result.rows });
  } catch (error) {
    console.error('Get entrepreneurs error:', error);
    res.status(500).json({ error: 'Failed to fetch entrepreneurs' });
  }
});

// PUT /api/admin/entrepreneurs/:userId - Update entrepreneur
app.put('/api/admin/entrepreneurs/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, surname, email, phone, hub, status } = req.body;

    const result = await pool.query(
      `UPDATE users 
       SET name = COALESCE($1, name),
           surname = COALESCE($2, surname),
           email = COALESCE($3, email),
           phone = COALESCE($4, phone),
           hub = COALESCE($5, hub),
           status = COALESCE($6, status)
       WHERE id = $7 AND role = 'entrepreneur'
       RETURNING id, name, surname, email, phone, hub, status`,
      [name, surname, email, phone, hub, status, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entrepreneur not found' });
    }

    res.json({
      message: 'Entrepreneur updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update entrepreneur error:', error);
    res.status(500).json({ error: 'Failed to update entrepreneur' });
  }
});

// DELETE /api/admin/entrepreneurs/:userId - Deactivate entrepreneur
app.delete('/api/admin/entrepreneurs/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Soft delete - you could add a 'status' column, for now we'll just prevent login
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2 AND role = $3 RETURNING id',
      ['DEACTIVATED', userId, 'entrepreneur']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entrepreneur not found' });
    }

    res.json({ message: 'Entrepreneur deactivated successfully' });
  } catch (error) {
    console.error('Deactivate entrepreneur error:', error);
    res.status(500).json({ error: 'Failed to deactivate entrepreneur' });
  }
});

// ==================== ADMIN PAYMENT ROUTES ====================

// GET /api/admin/businesses/all - Get all businesses for payment creation
app.get('/api/admin/businesses/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.id, b.name, b.registration_number,
       u.name as owner_name, u.surname as owner_surname, u.email as owner_email
       FROM businesses b
       JOIN users u ON b.user_id = u.id
       ORDER BY b.name`
    );

    res.json({ businesses: result.rows });
  } catch (error) {
    console.error('Get all businesses error:', error);
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});

// POST /api/admin/payments - Create new payment record
app.post('/api/admin/payments', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { businessId, month, year, status, notes } = req.body;

    if (!businessId || !month || !year) {
      return res.status(400).json({ error: 'Business ID, month, and year are required' });
    }

    // Check if payment already exists for this business/month/year
    const existing = await pool.query(
      'SELECT id FROM payments WHERE business_id = $1 AND month = $2 AND year = $3',
      [businessId, month, year]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Payment record already exists for this month/year' });
    }

    const result = await pool.query(
      `INSERT INTO payments (business_id, month, year, status, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [businessId, month, year, status || 'unpaid', notes]
    );

    res.status(201).json({
      message: 'Payment record created successfully',
      payment: result.rows[0]
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Failed to create payment record' });
  }
});

// GET /api/admin/payments - List all payments
app.get('/api/admin/payments', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, b.name as business_name, b.registration_number,
       u.name as user_name, u.surname as user_surname, u.email
       FROM payments p
       JOIN businesses b ON p.business_id = b.id
       JOIN users u ON b.user_id = u.id
       ORDER BY p.year DESC, p.month DESC, p.created_at DESC`
    );

    res.json({ payments: result.rows });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// PUT /api/admin/payments/:paymentId - Update payment status
app.put('/api/admin/payments/:paymentId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status, notes } = req.body;

    if (!status || !['paid', 'unpaid', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required (paid, unpaid, or pending)' });
    }

    const result = await pool.query(
      `UPDATE payments 
       SET status = $1, notes = COALESCE($2, notes)
       WHERE id = $3
       RETURNING *`,
      [status, notes, paymentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({
      message: 'Payment updated successfully',
      payment: result.rows[0]
    });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// ==================== ADMIN REPORTS ROUTES ====================

// GET /api/admin/reports - Get system metrics
app.get('/api/admin/reports', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Total users
    const usersResult = await pool.query(
      "SELECT COUNT(*) as total FROM users WHERE role = 'entrepreneur'"
    );

    // Total businesses
    const businessResult = await pool.query(
      'SELECT COUNT(*) as total FROM businesses'
    );

    // Payment statistics
    const paymentsResult = await pool.query(
      `SELECT 
       COUNT(*) as total,
       COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid,
       COUNT(CASE WHEN status = 'unpaid' THEN 1 END) as unpaid,
       COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
       COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue
       FROM payments`
    );

    // Recent registrations (last 30 days)
    const recentResult = await pool.query(
      `SELECT COUNT(*) as recent 
       FROM users 
       WHERE role = 'entrepreneur' 
       AND created_at >= NOW() - INTERVAL '30 days'`
    );

    // Bootcamp assignments
    const bootcampResult = await pool.query(
      'SELECT COUNT(*) as total FROM bootcamps'
    );

    // Hub performance
    const hubPerformance = await pool.query(
      `SELECT 
        u.hub,
        COUNT(DISTINCT u.id) as total_entrepreneurs,
        COUNT(DISTINCT b.id) as total_businesses,
        COUNT(DISTINCT CASE WHEN u.status = 'active' THEN u.id END) as active_entrepreneurs,
        COUNT(DISTINCT p.id) as total_payments,
        COUNT(DISTINCT CASE WHEN p.status = 'paid' THEN p.id END) as paid_payments
       FROM users u
       LEFT JOIN businesses b ON u.id = b.user_id
       LEFT JOIN payments p ON b.id = p.business_id
       WHERE u.role = 'entrepreneur' AND u.hub IS NOT NULL
       GROUP BY u.hub
       ORDER BY total_entrepreneurs DESC`
    );

    res.json({
      totalEntrepreneurs: parseInt(usersResult.rows[0].total),
      totalBusinesses: parseInt(businessResult.rows[0].total),
      totalPayments: parseInt(paymentsResult.rows[0].total),
      paidPayments: parseInt(paymentsResult.rows[0].paid),
      unpaidPayments: parseInt(paymentsResult.rows[0].unpaid),
      pendingPayments: parseInt(paymentsResult.rows[0].pending),
      overduePayments: parseInt(paymentsResult.rows[0].overdue),
      recentRegistrations: parseInt(recentResult.rows[0].recent),
      bootcampAssignments: parseInt(bootcampResult.rows[0].total),
      hubPerformance: hubPerformance.rows
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// ==================== ADMIN BOOTCAMP ROUTES ====================

// POST /api/admin/bootcamp/assign - Assign entrepreneur to bootcamp
app.post('/api/admin/bootcamp/assign', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId, cohort, cohortYear, attendance, totalSessions, bootcampStatus } = req.body;

    if (!userId || !cohort) {
      return res.status(400).json({ error: 'User ID and cohort are required' });
    }

    // Extract year from cohort if not provided
    const year = cohortYear || parseInt(cohort.match(/\d{4}/)?.[0]) || new Date().getFullYear();

    // Check if already assigned
    const existing = await pool.query(
      'SELECT id FROM bootcamps WHERE user_id = $1',
      [userId]
    );

    if (existing.rows.length > 0) {
      // Update existing assignment
      const result = await pool.query(
        `UPDATE bootcamps 
         SET cohort = $1, 
             cohort_year = $2, 
             attendance = COALESCE($3, attendance),
             total_sessions = COALESCE($4, total_sessions),
             bootcamp_status = COALESCE($5, bootcamp_status),
             assigned_date = CURRENT_TIMESTAMP 
         WHERE user_id = $6 
         RETURNING *`,
        [cohort, year, attendance, totalSessions, bootcampStatus, userId]
      );
      return res.json({
        message: 'Bootcamp assignment updated successfully',
        assignment: result.rows[0]
      });
    }

    // Create new assignment
    const result = await pool.query(
      `INSERT INTO bootcamps (user_id, cohort, cohort_year, attendance, total_sessions, bootcamp_status) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [userId, cohort, year, attendance || 0, totalSessions || 0, bootcampStatus || 'active']
    );

    res.status(201).json({
      message: 'Bootcamp assigned successfully',
      assignment: result.rows[0]
    });
  } catch (error) {
    console.error('Assign bootcamp error:', error);
    res.status(500).json({ error: 'Failed to assign bootcamp' });
  }
});

// GET /api/admin/bootcamp/cohorts - List bootcamp assignments with filters
app.get('/api/admin/bootcamp/cohorts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { cohortYear, hub, status } = req.query;

    let query = `
      SELECT b.id, b.cohort, b.cohort_year, b.assigned_date, b.attendance, 
             b.total_sessions, b.bootcamp_status,
       u.id as user_id, u.name, u.surname, u.email, u.phone, u.hub
       FROM bootcamps b
       JOIN users u ON b.user_id = u.id
       WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (cohortYear) {
      query += ` AND b.cohort_year = ${paramCount}`;
      params.push(parseInt(cohortYear));
      paramCount++;
    }

    if (hub) {
      query += ` AND u.hub = ${paramCount}`;
      params.push(hub);
      paramCount++;
    }

    if (status) {
      query += ` AND b.bootcamp_status = ${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` ORDER BY b.assigned_date DESC`;

    const result = await pool.query(query, params);
    res.json({ assignments: result.rows });
  } catch (error) {
    console.error('Get bootcamp cohorts error:', error);
    res.status(500).json({ error: 'Failed to fetch bootcamp assignments' });
  }
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Database: ${process.env.DB_NAME || 'silulo_db'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  pool.end();
  process.exit(0);
});