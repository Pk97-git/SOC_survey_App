const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function findLatestSurveys() {
    try {
        const res = await pool.query(`
            SELECT s.id, s.status, s.updated_at, si.name as site_name, s.trade
            FROM surveys s
            LEFT JOIN sites si ON s.site_id = si.id
            ORDER BY s.updated_at DESC
            LIMIT 5
        `);
        console.log("RECENT SURVEYS:", res.rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

findLatestSurveys();
