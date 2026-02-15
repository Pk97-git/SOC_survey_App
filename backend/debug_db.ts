import path from 'path';
import dotenv from 'dotenv';
// Load env from the same directory as the script
dotenv.config({ path: path.join(__dirname, '.env') });

import pool from './src/config/database';

async function verifySurvey() {
    const id = process.argv[2] || '52e7d91d-3bc1-44e4-b533-6cb4d201ebea';
    console.log(`🔍 Checking Survey ID: ${id}`);
    console.log(`🌐 Connecting to ${process.env.DB_HOST}:${process.env.DB_PORT}...`);

    try {
        const result = await pool.query(
            `SELECT * FROM surveys WHERE id = $1`,
            [id]
        );
        if (result.rows.length === 0) {
            console.log('❌ NOT FOUND in Database');

            // Show some existing surveys to help debug
            const latest = await pool.query('SELECT id, trade, site_id FROM surveys ORDER BY created_at DESC LIMIT 5');
            console.log('\n📜 Latest 5 Surveys in DB:');
            console.table(latest.rows);
        } else {
            const survey = result.rows[0];
            console.log('✅ FOUND Survey:', survey);

            // Check assets for this site and trade
            const assetsResult = await pool.query(
                `SELECT count(*) as count, service_line 
                 FROM assets 
                 WHERE site_id = $1 
                 GROUP BY service_line`,
                [survey.site_id]
            );
            console.log('\n📦 Assets for this site by service_line:');
            console.table(assetsResult.rows);

            const matchingAssets = await pool.query(
                `SELECT count(*) as count 
                 FROM assets 
                 WHERE site_id = $1 AND service_line = $2`,
                [survey.site_id, survey.trade]
            );
            console.log(`\n🎯 Assets matching survey trade "${survey.trade}": ${matchingAssets.rows[0].count}`);

            // Check if any inspections exist for this survey
            const inspectionsResult = await pool.query(
                `SELECT count(*) as count FROM asset_inspections WHERE survey_id = $1`,
                [id]
            );
            console.log(`📝 Asset Inspections for this survey: ${inspectionsResult.rows[0].count}`);
        }
    } catch (e) {
        console.error('❌ Database Error:', e);
    } finally {
        await pool.end();
    }
}

verifySurvey();
