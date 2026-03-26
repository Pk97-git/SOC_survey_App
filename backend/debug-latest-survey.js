const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function debugLatestSurvey() {
    try {
        // 1. Get latest submitted survey
        const surveyRes = await pool.query('SELECT id, site_id, status, submitted_at FROM surveys WHERE status = \'submitted\' ORDER BY submitted_at DESC LIMIT 1');
        if (surveyRes.rows.length === 0) {
            console.log("No submitted surveys found.");
            process.exit(0);
        }
        const survey = surveyRes.rows[0];
        console.log("LATEST SURVEY:", survey);

        // 2. Get inspections and their photos
        const inspectionsRes = await pool.query(`
            SELECT ai.id as inspection_id, ai.asset_id, a.name as asset_name, ai.mag_review,
                   (SELECT json_agg(p.file_path) FROM photos p WHERE p.asset_inspection_id = ai.id) as surveyor_photos
            FROM asset_inspections ai
            JOIN assets a ON ai.asset_id = a.id
            WHERE ai.survey_id = $1
            ORDER BY a.building, a.location, a.name
        `, [survey.id]);

        console.log("\nINSPECTIONS DATA:");
        inspectionsRes.rows.forEach(row => {
            console.log(`\nAsset: ${row.asset_name} (ID: ${row.asset_id})`);
            console.log(`Surveyor Photos:`, row.surveyor_photos);
            if (row.mag_review) {
                let mag = row.mag_review;
                if (typeof mag === 'string') try { mag = JSON.parse(mag); } catch(e) {}
                console.log(`MAG Photos:`, mag.photos);
            }
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

debugLatestSurvey();
