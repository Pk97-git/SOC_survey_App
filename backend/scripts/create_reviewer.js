require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

async function main() {
    try {
        console.log('Connecting to database...');
        const hashedPassword = await bcrypt.hash('password', 12);

        await pool.query(
            `INSERT INTO users (id, email, password_hash, full_name, role, is_active)
             VALUES (gen_random_uuid(), 'reviewer@cit.com', $1, 'System Reviewer', 'reviewer', true)
             ON CONFLICT (email) DO UPDATE SET password_hash = $1, role = 'reviewer'`,
            [hashedPassword]
        );
        console.log('✅ Reviewer user created successfully!');
        console.log('Email: reviewer@cit.com');
        console.log('Password: password');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

main();
