const { Pool } = require('pg');
require('dotenv').config({ path: 'c:/Users/Prashant/Documents/GH products/SOC products/Conditional survey/backend/.env' });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function check() {
    try {
        console.log('Testing connection to:', process.env.DB_NAME);
        const res = await pool.query('SELECT current_database(), current_user, version()');
        console.log('Connection successful!');
        console.log('Results:', res.rows[0]);
        
        const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('Tables in public schema:', tables.rows.map(t => t.table_name));
        
        process.exit(0);
    } catch (err) {
        console.error('Connection failed:', err.message);
        process.exit(1);
    }
}

check();
