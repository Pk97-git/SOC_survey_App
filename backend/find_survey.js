
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres:Lime-Road!@localhost:5432/facility_survey_db'
});

async function run() {
    try {
        console.log('--- Photos Table Schema ---');
        const schema = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'photos'");
        console.log(JSON.stringify(schema.rows, null, 2));

        console.log('\n--- Status of Survey b390f2e7... ---');
        const survey = await pool.query("SELECT * FROM surveys WHERE id = 'b390f2e7-1cd0-4d23-94fd-b39f307cc2ae'");
        console.log(JSON.stringify(survey.rows, null, 2));

        console.log('\n--- Recent Photos ---');
        // Based on schema check, choose right columns. For now try *
        const photos = await pool.query("SELECT * FROM photos ORDER BY id DESC LIMIT 10");
        console.log(JSON.stringify(photos.rows, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();
