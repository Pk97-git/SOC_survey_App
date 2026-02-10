import pool from '../config/database';
import dotenv from 'dotenv';
dotenv.config();

async function checkUser() {
    try {
        console.log('Checking user admin@cit.com...');
        const result = await pool.query('SELECT id, email, full_name, role FROM users WHERE email = $1', ['admin@cit.com']);

        if (result.rows.length === 0) {
            console.log('User not found!');
        } else {
            console.log('User details:', result.rows[0]);
        }

        console.log('Checking all users:');
        const allUsers = await pool.query('SELECT id, email, role FROM users');
        allUsers.rows.forEach(u => console.log(`${u.email}: ${u.role}`));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

checkUser();
