require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'silulo_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function fixPasswords() {
  try {
    console.log('Fixing user passwords...\n');
    
    // Generate hash for "password123"
    const hash = await bcrypt.hash('password123', 10);
    console.log('Generated hash for password: password123');
    console.log('Hash:', hash, '\n');

    // Update admin user
    const adminResult = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING email, role',
      [hash, 'admin@silulo.com']
    );
    
    if (adminResult.rows.length > 0) {
      console.log('Updated admin@silulo.com');
    }

    // Update test entrepreneurs
    const emails = ['thabo@example.com', 'nomsa@example.com', 'sipho@example.com'];
    
    for (const email of emails) {
      const result = await pool.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING email',
        [hash, email]
      );
      
      if (result.rows.length > 0) {
        console.log(`Updated ${email}`);
      }
    }

    console.log('\nAll passwords fixed!');
    console.log('\nYou can now login with:');
    console.log('Email: admin@silulo.com');
    console.log('Password: password123\n');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

fixPasswords();