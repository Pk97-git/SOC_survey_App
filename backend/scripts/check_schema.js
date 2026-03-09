const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: 'postgres',
    database: 'facility_survey_db'
});

async function run() {
    try {
        const res = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name, ordinal_position
    `);

        const tables = {};
        res.rows.forEach(r => {
            if (!tables[r.table_name]) tables[r.table_name] = [];
            tables[r.table_name].push(`${r.column_name} (${r.data_type})`);
        });

        console.log(JSON.stringify(tables, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        pool.end();
    }
}

run();
