const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function checkPhotoDups(surveyId) {
    try {
        console.log(`\n=== CHECKING PHOTOS FOR SURVEY: ${surveyId} ===`);
        const res = await pool.query(`
            SELECT p.id, p.file_path, p.asset_inspection_id, ai.asset_id, a.name as asset_name
            FROM photos p
            JOIN asset_inspections ai ON p.asset_inspection_id = ai.id
            JOIN assets a ON ai.asset_id = a.id
            WHERE ai.survey_id = $1
            ORDER BY p.file_path
        `, [surveyId]);

        console.log("SURVEYOR PHOTO RECORDS:");
        res.rows.forEach(row => {
            console.log(`- Path: ${row.file_path} | Asset: ${row.asset_name} | InspID: ${row.asset_inspection_id}`);
        });

        const resMag = await pool.query(`
            SELECT ai.id as inspection_id, a.name as asset_name, ai.mag_review
            FROM asset_inspections ai
            JOIN assets a ON ai.asset_id = a.id
            WHERE ai.survey_id = $1 AND ai.mag_review IS NOT NULL
        `, [surveyId]);

        console.log("\nMAG REVIEW JSON DATA:");
        resMag.rows.forEach(row => {
            let mag = row.mag_review;
            if (typeof mag === 'string') try { mag = JSON.parse(mag); } catch(e) {}
            console.log(`- Asset: ${row.asset_name} | Photos in JSON:`, mag.photos);
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkPhotoDups('d2af9e85-e6bf-4dbc-ab04-ef927928eed9');
