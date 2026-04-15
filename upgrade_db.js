require('dotenv').config();
const mysql = require('mysql2/promise');

async function upgrade() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'oxxo_comercial'
  });

  try {
    console.log('--- Upgrading DB Schema ---');
    
    // Add role and can_edit to users if they don't exist
    const [cols] = await pool.query('SHOW COLUMNS FROM users');
    const colNames = cols.map(c => c.Field);
    
    if (!colNames.includes('role')) {
      await pool.query("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'editor'");
      console.log('Added role column');
    }
    
    if (!colNames.includes('can_edit')) {
      await pool.query("ALTER TABLE users ADD COLUMN can_edit TINYINT(1) DEFAULT 1");
      console.log('Added can_edit column');
    }
    
    // Ensure admin is actually admin
    await pool.query("UPDATE users SET role = 'admin', can_edit = 1 WHERE username = 'admin'");
    console.log('Ensured admin user permissions');

    console.log('--- Upgrade Complete ---');
    process.exit(0);
  } catch (err) {
    console.error('Error during upgrade:', err);
    process.exit(1);
  }
}

upgrade();
