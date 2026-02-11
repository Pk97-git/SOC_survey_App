
import pool from '../config/database';

const migrate = async () => {
    try {
        const client = await pool.connect();
        try {
            console.log('Starting migration...');
            await client.query('BEGIN');

            // Add new columns if they don't exist
            const columns = [
                'status VARCHAR(50)',
                'asset_tag VARCHAR(100)',
                'building VARCHAR(255)',
                'location VARCHAR(255)' // Dedicated location column
            ];

            for (const col of columns) {
                const colName = col.split(' ')[0];
                await client.query(`ALTER TABLE assets ADD COLUMN IF NOT EXISTS ${col};`);
                console.log(`Prepared column: ${colName}`);
            }

            await client.query('COMMIT');
            console.log('✅ Migration successful: Added status, asset_tag, building, location to assets table');
        } catch (e) {
            await client.query('ROLLBACK');
            console.error('❌ Migration failed:', e);
            process.exit(1);
        } finally {
            client.release();
            // Close pool to allow script to exit
            await pool.end();
        }
    } catch (err) {
        console.error('Connection error:', err);
        process.exit(1);
    }
};

migrate();
