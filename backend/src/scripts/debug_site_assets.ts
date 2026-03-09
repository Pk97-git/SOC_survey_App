
import pool from '../config/database';

const debugSite = async (siteNameFragment: string) => {
    try {
        console.log(`Searching for site containing: "${siteNameFragment}"...`);

        const siteResult = await pool.query(
            `SELECT * FROM sites WHERE name ILIKE $1`,
            [`%${siteNameFragment}%`]
        );

        if (siteResult.rows.length === 0) {
            console.log('No site found.');
            return;
        }

        const site = siteResult.rows[0];
        console.log(`Found Site: ${site.name} (ID: ${site.id})`);

        // Check distinct service lines
        const serviceLinesResult = await pool.query(
            `SELECT DISTINCT service_line FROM assets WHERE site_id = $1 ORDER BY service_line`,
            [site.id]
        );

        console.log('\n--- Distinct Service Lines ---');
        if (serviceLinesResult.rows.length === 0) {
            console.log('No assets found for this site.');
        } else {
            serviceLinesResult.rows.forEach(r => {
                console.log(`- "${r.service_line}"`);
            });
            console.log(`\nTotal Unique Trades: ${serviceLinesResult.rows.length}`);
        }

        // Context: Total assets
        const countResult = await pool.query(
            `SELECT COUNT(*) FROM assets WHERE site_id = $1`,
            [site.id]
        );
        console.log(`\nTotal Assets in DB: ${countResult.rows[0].count}`);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await pool.end();
    }
};

const siteName = process.argv[2] || 'Aawe';
debugSite(siteName);
