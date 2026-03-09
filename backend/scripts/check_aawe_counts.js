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

        // 2. Count Service Lines & Assets PER Location
        const query = `
            SELECT location, service_line, COUNT(*) as asset_count
            FROM assets 
            WHERE site_id = $1 
            AND location IS NOT NULL
            GROUP BY location, service_line
            ORDER BY location, service_line
        `;

        const res = await pool.query(query, [site.id]);

        console.log(`\nDetailed Breakdown by Location:`);

        let currentLocation = '';
        res.rows.forEach((row) => {
            if (row.location !== currentLocation) {
                console.log(`\n📍 ${row.location}`);
                currentLocation = row.location;
            }
            console.log(`   - ${row.service_line}: ${row.asset_count} assets`);
        });

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pool.end();
    }
}

main();
