const fs = require('fs');
const { Pool } = require('pg');
const path = require('path');

const pool = new Pool({ host: 'localhost', port: 5433, database: 'facility_survey_db', user: 'postgres', password: 'postgres' });

async function run() {
    try {
        const res = await pool.query(`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`);
        const schema = {};
        res.rows.forEach(r => {
            if (!schema[r.table_name]) schema[r.table_name] = new Set();
            schema[r.table_name].add(r.column_name);
        });

        const files = [
            'src/routes/survey.routes.ts', 'src/routes/sync.routes.ts', 'src/routes/user.routes.ts',
            'src/routes/asset.routes.ts', 'src/routes/photo.routes.ts', 'src/routes/review.routes.ts',
            'src/routes/auth.routes.ts', 'src/services/audit.service.ts', 'src/scripts/seed.ts',
            'src/repositories/site.repository.ts', 'src/repositories/survey.repository.ts'
        ];

        let failed = false;

        for (const file of files) {
            const fullPath = path.join(__dirname, file);
            if (!fs.existsSync(fullPath)) continue;
            const content = fs.readFileSync(fullPath, 'utf8');

            const insertMatches = content.matchAll(/INSERT INTO ([a-z_]+)\s*\(([^)]+)\)/g);
            for (const match of insertMatches) {
                const table = match[1];
                const colsRaw = match[2];
                if (!schema[table]) { console.error(`Table ${table} not in schema! (File: ${file})`); failed = true; continue; }

                const cols = colsRaw.split(',').map(c => c.trim().replace(/\n/g, '').replace(/[\s"']/g, ''));
                for (const col of cols) {
                    if (col === '' || col.toUpperCase() === 'SELECT') continue;
                    if (!schema[table].has(col)) { console.error(`Column '${col}' not in table ${table}! (File: ${file})`); failed = true; }
                }
            }

            const updateMatches = content.matchAll(/UPDATE ([a-z_]+)[\s\n]+SET ([\s\S]*?) WHERE/g);
            for (const match of updateMatches) {
                const table = match[1];
                let setClause = match[2].replace(/\n/g, ' ');
                if (!schema[table]) { console.error(`Table ${table} not in schema! (File: ${file})`); failed = true; continue; }

                const colMatches = setClause.matchAll(/([a-zA-Z_]+)\s*=/g);
                for (const m of colMatches) {
                    const col = m[1];
                    if (!schema[table].has(col)) { console.error(`Column '${col}' not in table ${table}! (File: ${file})`); failed = true; }
                }
            }
        }

        if (!failed) console.log("SUCCESS! All queries perfectly align with the schema.");
        else console.log("Found schema misalignments!");

    } catch (e) { console.error(e); } finally { pool.end(); }
}
run();
