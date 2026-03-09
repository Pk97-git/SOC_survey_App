
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function main() {
    try {
        // 1. Find Site
        const siteRes = await pool.query("SELECT id, name FROM sites WHERE name ILIKE '%aawe%' LIMIT 1");
        if (siteRes.rows.length === 0) {
            console.log("No site found matching 'aawe'");
            return;
        }
        const site = siteRes.rows[0];
        console.log(`Found Site: ${site.name} (ID: ${site.id})`);

        // 2. Get Data: Location | Service Line | Count
        const query = `
            SELECT location, service_line, COUNT(*) as count
            FROM assets 
            WHERE site_id = $1 
            AND location IS NOT NULL
            GROUP BY location, service_line
            ORDER BY location, service_line
        `;

        const res = await pool.query(query, [site.id]);

        // 3. Pivot Data
        const locations = {};
        const serviceLines = new Set();

        res.rows.forEach(row => {
            if (!locations[row.location]) {
                locations[row.location] = {};
            }
            locations[row.location][row.service_line] = parseInt(row.count, 10);
            serviceLines.add(row.service_line);
        });

        // 4. Print Header
        const sortedServiceLines = Array.from(serviceLines).sort();
        const header = ['Location', ...sortedServiceLines, 'TOTAL'];
        const formatRow = (cols) => {
            return cols.map((col, idx) => {
                const w = idx === 0 ? 30 : 15;
                return String(col).padEnd(w);
            }).join(' | ');
        };

        console.log('\n' + '-'.repeat(100));
        console.log(formatRow(header));
        console.log('-'.repeat(100));

        // 5. Print Rows
        Object.keys(locations).sort().forEach(loc => {
            const counts = locations[loc];
            let rowTotal = 0;
            const cols = [loc];

            sortedServiceLines.forEach(sl => {
                const count = counts[sl] || 0;
                cols.push(count || '-');
                rowTotal += count;
            });

            cols.push(rowTotal);
            console.log(formatRow(cols));
        });

        console.log('-'.repeat(100));

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pool.end();
    }
}

main();
