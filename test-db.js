// Quick test to check PostgreSQL connection and schema
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'facility_survey_db',
    user: 'postgres',
    password: 'Lime-Road!',
    connectionTimeoutMillis: 5000,
});

async function test() {
    try {
        const client = await pool.connect();
        console.log('✅ Connected to facility_survey_db!');
        
        // Check if tables exist
        const result = await client.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
        );
        
        console.log('Tables:', result.rows.map(r => r.table_name));
        
        if (result.rows.length === 0) {
            console.log('❌ No tables found - need to run schema.sql');
        } else {
            console.log('✅ Tables exist');
        }
        
        client.release();
        await pool.end();
    } catch (err) {
        console.error('❌ Error:', err.message);
        await pool.end();
    }
}

test();
