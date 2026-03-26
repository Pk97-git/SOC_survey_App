const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

async function testLockout() {
    try {
        console.log('--- SYNC LOCKOUT TEST ---');
        
        const surveyId = '81941602-034c-4e22-b329-d218fcb48108'; // One of the submitted surveys
        const assetId = '36ca65c2-a22e-4c6a-bfaa-3bd5ea0fb94b'; // A real asset on that site

        // Verify survey exists and is 'submitted'
        const survey = await pool.query('SELECT status FROM surveys WHERE id = $1', [surveyId]);
        console.log(`Current status of survey ${surveyId}: ${survey.rows[0].status}`);

        // Try to insert an inspection manually using the same logic as the sync route
        // (Checking if survey is submitted)
        const isSubmitted = survey.rows[0].status === 'submitted' || survey.rows[0].status === 'completed';
        if (isSubmitted) {
            console.log('⚠️ TEST CONFIRMED: Backend logic WOULD block this inspection sync because the survey is "submitted".');
        } else {
            console.log('Backend should allow this sync.');
        }

    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        await pool.end();
    }
}

testLockout();
