import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    database: process.env.DB_NAME || 'facility_survey_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

async function test() {
    try {
        const surveyIds = ["b67220fe-5244-45fc-b31b-4d9606255a8e"];
        console.log("Testing with surveyIds:", surveyIds);

        const result = await pool.query(
            `SELECT ai.*, a.name as asset_name, a.ref_code, a.service_line,
                    ai.survey_id
             FROM asset_inspections ai
             LEFT JOIN assets a ON ai.asset_id = a.id
             WHERE ai.survey_id = ANY($1::uuid[])
             ORDER BY ai.survey_id, ai.created_at ASC`,
            [surveyIds]
        );
        console.log("Success! Rows:", result.rows.length);
    } catch (error) {
        console.error("SQL Error:", error);
    } finally {
        await pool.end();
    }
}

test();
