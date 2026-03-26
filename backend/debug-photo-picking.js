const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function debugSurvey(surveyId) {
    try {
        console.log(`\n=== DEBUGGING SURVEY: ${surveyId} ===`);
        const surveyRes = await pool.query('SELECT id, site_id, status, updated_at FROM surveys WHERE id = $1', [surveyId]);
        console.log("Survey Info:", surveyRes.rows[0]);

        const inspectionsRes = await pool.query(`
            SELECT ai.id as inspection_id, ai.asset_id, a.name as asset_name, ai.mag_review,
                   (SELECT json_agg(p.file_path) FROM photos p WHERE p.asset_inspection_id = ai.id) as surveyor_photos
            FROM asset_inspections ai
            JOIN assets a ON ai.asset_id = a.id
            WHERE ai.survey_id = $1
            ORDER BY a.building, a.location, a.name
        `, [surveyId]);

        inspectionsRes.rows.forEach(row => {
            if ((row.surveyor_photos && row.surveyor_photos.length > 0) || (row.mag_review && row.mag_review !== 'null')) {
                console.log(`\n- Asset: ${row.asset_name} (ID: ${row.asset_id})`);
                console.log(`  Surveyor Photos:`, row.surveyor_photos || []);
                if (row.mag_review) {
                    let mag = row.mag_review;
                    if (typeof mag === 'string') try { mag = JSON.parse(mag); } catch(e) {}
                    console.log(`  MAG Photos:`, mag.photos || []);
                }
            }
        });
    } catch (e) {
        console.error(e);
    }
}

async function run() {
    await debugSurvey('cc6b013f-a0d6-4650-ae64-0a4deaae62c2');
    await debugSurvey('d2af9e85-e6bf-4dbc-ab04-ef927928eed9');
    process.exit(0);
}

run();
