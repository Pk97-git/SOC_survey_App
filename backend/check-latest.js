const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgresql://postgres:Lime-Road!@localhost:5432/facility_survey_db"
});

async function checkRecent() {
    try {
        console.log("--- Checking Most Recent Submission ---");

        // 1. Get the latest 3 surveys to be sure
        const surveyRes = await pool.query(`
            SELECT s.id, s.status, s.trade, s.location, s.submitted_at, u.full_name as surveyor, s.updated_at
            FROM surveys s
            LEFT JOIN users u ON s.surveyor_id = u.id
            ORDER BY s.updated_at DESC
            LIMIT 3
        `);

        if (surveyRes.rowCount === 0) {
            console.log("No surveys found in database.");
            return;
        }

        for (const survey of surveyRes.rows) {
            console.log(`\nSurvey:`);
            console.log(` - ID: ${survey.id}`);
            console.log(` - Status: ${survey.status}`);
            console.log(` - Trade: ${survey.trade}`);
            console.log(` - Location: ${survey.location}`);
            console.log(` - Submitted At: ${survey.submitted_at}`);
            console.log(` - Updated At: ${survey.updated_at}`);
            console.log(` - Surveyor: ${survey.surveyor}`);

            // 2. Get inspections for this survey
            const inspectionsRes = await pool.query(`
                SELECT id, asset_id, condition_rating, remarks
                FROM asset_inspections
                WHERE survey_id = $1
            `, [survey.id]);

            console.log(`   Inspections found: ${inspectionsRes.rowCount}`);
            
            for (const insp of inspectionsRes.rows) {
                console.log(`   - Inspection ID: ${insp.id}`);
                
                // 3. Check for photos linked to this inspection
                const photosRes = await pool.query(`
                    SELECT id, file_path, uploaded_at
                    FROM photos
                    WHERE asset_inspection_id = $1
                `, [insp.id]);

                if (photosRes.rowCount > 0) {
                    console.log(`     ✅ Photos linked: ${photosRes.rowCount}`);
                    photosRes.rows.forEach(p => console.log(`        [PHOTO]: ${p.file_path}`));
                } else {
                    console.log(`     ❌ No photos linked in 'photos' table.`);
                }
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

checkRecent();
