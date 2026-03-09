import pool from '../config/database';
import dotenv from 'dotenv';
dotenv.config();

async function fixAdminRole() {
    try {
        console.log('Checking user admin@cit.com...');
        const result = await pool.query('SELECT id, email, full_name, role FROM users WHERE email = $1', ['admin@cit.com']);

        if (result.rows.length === 0) {
            console.log('User not found!');
            return;
        }

        const user = result.rows[0];
        console.log('Current User details:', user);

        if (user.role !== 'admin') {
            console.log(`Role is "${user.role}". Updating to "admin"...`);
            const updateResult = await pool.query(
                'UPDATE users SET role = $1 WHERE email = $2 RETURNING *',
                ['admin', 'admin@cit.com']
            );
            console.log('Updated User:', updateResult.rows[0]);
        } else {
            console.log('Role is already "admin". No changes needed.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

fixAdminRole();
