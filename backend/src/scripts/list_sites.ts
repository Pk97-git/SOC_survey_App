import pool from '../config/database';
import dotenv from 'dotenv';

dotenv.config();

async function listSites() {
    try {
        console.log('Connecting to database...');
        const res = await pool.query('SELECT * FROM sites ORDER BY created_at DESC');

        if (res.rows.length === 0) {
            console.log('No sites found in the database.');
        } else {
            console.log(`Found ${res.rows.length} sites:`);
            console.table(res.rows.map(site => ({
                id: site.id,
                name: site.name,
                location: site.location,
                created_at: site.created_at
            })));
        }
    } catch (err) {
        console.error('Error querying sites:', err);
    } finally {
        await pool.end();
    }
}

listSites();
