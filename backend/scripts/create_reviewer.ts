import pool from '../src/config/database';
import { hashPassword } from '../src/services/password.service';

async function main() {
    try {
        console.log('Connecting to database...');
        const hashedPassword = await hashPassword('password');

        await pool.query(
            `INSERT INTO users (id, email, password_hash, full_name, role, is_active)
             VALUES (gen_random_uuid(), 'reviewer@cit.com', $1, 'System Reviewer', 'reviewer', true)
             ON CONFLICT (email) DO UPDATE SET password_hash = $1, role = 'reviewer'`,
            [hashedPassword]
        );
        console.log('✅ Reviewer user created successfully!');
        console.log('Email: reviewer@cit.com');
        console.log('Password: password');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

main();
