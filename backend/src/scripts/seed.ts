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

        // Reset Database
        console.log('🗑️  Resetting database...');
        await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
        await pool.query('GRANT ALL ON SCHEMA public TO postgres; -- or your db user');
        await pool.query('GRANT ALL ON SCHEMA public TO public;');

        // Read and Execute Schema
        const schemaPath = path.join(__dirname, '../../schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf8');
            console.log('📝 Applying new schema...');
            await pool.query(schema);
            console.log('✅ Schema applied');
        } else {
            console.error('❌ schema.sql not found at', schemaPath);
            process.exit(1);
        }

        // Create Users
        console.log('bust creating users...');
        const userResult = await pool.query(
            `INSERT INTO users (email, password_hash, full_name, role) 
             VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)
             RETURNING id, email, role`,
            [
                'admin@cit.com', await bcrypt.hash('admin123', 10), 'Admin User', 'admin',
                'surveyor@cit.com', await bcrypt.hash('survey123', 10), 'Field Surveyor', 'surveyor'
            ]
        );
        console.log('✅ Users created');

        const adminId = userResult.rows.find((u: any) => u.role === 'admin').id;

        // Create Sample Site
        const siteResult = await pool.query(
            `INSERT INTO sites (name, location, created_by) 
             VALUES ($1, $2, $3) 
             RETURNING id`,
            ['Demo Facility', '123 Main St, Tech City', adminId]
        );
        const siteId = siteResult.rows[0].id;
        console.log('✅ Sample Site created');

        // Create Sample Assets
        await pool.query(
            `INSERT INTO assets (site_id, ref_code, name, service_line, status, building, location) 
             VALUES 
             ($1, 'AHU-01', 'Main AHU', 'MECHANICAL', 'Active', 'Main Building', 'Roof'),
             ($1, 'PUMP-01', 'Chilled Water Pump', 'PLUMBING', 'Active', 'Main Building', 'Basement')`,
            [siteId]
        );
        console.log('✅ Sample Assets created');

        console.log('✨ Database reset and seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seed();
