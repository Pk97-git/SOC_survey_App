const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function findAbsoluteLatest() {
    try {
        const res = await pool.query(`
            SELECT s.id, s.status, s.updated_at, si.name as site_name, s.trade
            FROM surveys s
            LEFT JOIN sites si ON s.site_id = si.id
            WHERE s.status = 'submitted'
            ORDER BY s.updated_at DESC
            LIMIT 1
        `);
        if (res.rows.length === 0) return;
        const s = res.rows[0];
        console.log(`\nLATEST SUBMITTED SURVEY: ${s.id} (${s.site_name} - ${s.trade})`);

        const insp = await pool.query(`
            SELECT a.name, ai.mag_review,
                   (SELECT json_agg(p.file_path) FROM photos p WHERE p.asset_inspection_id = ai.id) as surveyor_photos
            FROM asset_inspections ai
            JOIN assets a ON ai.asset_id = a.id
            WHERE ai.survey_id = $1
        `, [s.id]);

        insp.rows.forEach(row => {
            console.log(`\nAsset: ${row.name}`);
            console.log(`Surveyor Photos:`, row.surveyor_photos || []);
            if (row.mag_review) {
                let mag = row.mag_review;
                if (typeof mag === 'string') try { mag = JSON.parse(mag); } catch(e) {}
                console.log(`MAG Photos:`, mag.photos || []);
            }
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

findAbsoluteLatest();
