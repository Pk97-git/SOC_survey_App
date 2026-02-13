
import pool from './src/config/database';

async function verifySurvey() {
    const id = '52e7d91d-3bc1-44e4-b533-6cb4d201ebea';
    console.log(`Checking Survey ID: ${id}`);
    try {
        const result = await pool.query(
            `SELECT * FROM surveys WHERE id = $1`,
            [id]
        );
        if (result.rows.length === 0) {
            console.log('❌ NOT FOUND in Database');
        } else {
            console.log('✅ FOUND:', result.rows[0]);
        }
    } catch (e) {
        console.error('Database Error:', e);
    } finally {
        pool.end();
    }
}

verifySurvey();
