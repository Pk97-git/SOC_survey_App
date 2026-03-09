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

        // 2. Count Total Assets
        const query = `
            SELECT COUNT(*)
            FROM assets 
            WHERE site_id = $1 
            AND location IS NOT NULL
        `;

        const res = await pool.query(query, [site.id]);

        console.log(`\n-----------------------------------`);
        console.log(`TOTAL ASSETS FOR ${site.name}: ${res.rows[0].count}`);
        console.log(`-----------------------------------`);

        // 3. Count Breakdown by Service Line
        const serviceLineQuery = `
            SELECT service_line, COUNT(*)
            FROM assets 
            WHERE site_id = $1 
            AND location IS NOT NULL
            GROUP BY service_line
            ORDER BY count DESC
        `;
        const breakdownRes = await pool.query(serviceLineQuery, [site.id]);

        console.log("\nCounts by Service Line:");
        breakdownRes.rows.forEach(row => {
            console.log(`${row.service_line}: ${row.count}`);
        });

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pool.end();
    }
}

main();
