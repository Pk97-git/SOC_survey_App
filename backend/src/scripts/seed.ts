import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'facility_survey_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function seed() {
    try {
        console.log('🌱 Starting database seeding...');

        // Wait for DB connection
        let retries = 5;
        while (retries > 0) {
            try {
                await pool.query('SELECT NOW()');
                console.log('✅ Connected to database');
                break;
            } catch (err) {
                console.log(`⏳ Waiting for database... (${retries} retries left)`);
                retries--;
                await new Promise(res => setTimeout(res, 2000));
            }
        }

        // Read and Execute Schema
        const schemaPath = path.join(__dirname, '../../schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf8');
            console.log('📝 Running schema migration...');
            await pool.query(schema);
            console.log('✅ Schema applied');
        } else {
            console.error('❌ schema.sql not found at', schemaPath);
        }

        // Create Users
        const users = [
            {
                email: 'admin@cit.com',
                password: 'admin123',
                fullName: 'Admin User',
                role: 'admin'
            },
            {
                email: 'surveyor@cit.com',
                password: 'survey123',
                fullName: 'Field Surveyor',
                role: 'surveyor'
            }
        ];

        for (const user of users) {
            const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [user.email]);

            if (userExists.rows.length === 0) {
                const hashedPassword = await bcrypt.hash(user.password, 10);
                await pool.query(
                    `INSERT INTO users (email, password_hash, full_name, role) 
                     VALUES ($1, $2, $3, $4)`,
                    [user.email, hashedPassword, user.fullName, user.role]
                );
                console.log(`✅ Created user: ${user.email}`);
            } else {
                console.log(`ℹ️ User already exists: ${user.email}`);
            }
        }

        console.log('✨ Seeding completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seed();
