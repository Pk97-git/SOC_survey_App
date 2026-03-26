const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function checkPhotos() {
    try {
        console.log('--- Checking Absolute Latest 100 Photos ---');
        const res = await pool.query('SELECT * FROM photos ORDER BY uploaded_at DESC LIMIT 100');
        if (res.rows.length === 0) {
            console.log('No photos found in the database.');
        } else {
            console.table(res.rows.map(r => ({
                id: r.id.substring(0,8),
                insp_id: r.asset_inspection_id,
                survey_id: r.survey_id,
                path: r.file_path,
                uploaded: r.uploaded_at
            })));
        }
    } catch (err) {
        console.error('Error querying photos:', err);
    } finally {
        await pool.end();
    }
}

checkPhotos();
