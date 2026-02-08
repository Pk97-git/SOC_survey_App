import pool from '../config/database';
import bcrypt from 'bcryptjs';

async function seedDatabase() {
    console.log('🌱 Seeding database...');

    try {
        // 1. Create admin user
        console.log('Creating admin user...');
        const adminPassword = await bcrypt.hash('admin123', 10);

        const adminResult = await pool.query(
            `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
            ['admin@example.com', adminPassword, 'System Administrator', 'admin']
        );

        const adminId = adminResult.rows[0]?.id;
        console.log('✅ Admin user created');

        // 2. Create surveyor users
        console.log('Creating surveyor users...');
        const surveyorPassword = await bcrypt.hash('surveyor123', 10);

        const surveyors = [
            { email: 'surveyor1@example.com', name: 'John Surveyor' },
            { email: 'surveyor2@example.com', name: 'Jane Surveyor' },
        ];

        for (const surveyor of surveyors) {
            await pool.query(
                `INSERT INTO users (email, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO NOTHING`,
                [surveyor.email, surveyorPassword, surveyor.name, 'surveyor']
            );
        }
        console.log('✅ Surveyor users created');

        // 3. Create reviewer users
        console.log('Creating reviewer users...');
        const reviewerPassword = await bcrypt.hash('reviewer123', 10);

        const reviewers = [
            { email: 'mag@example.com', name: 'MAG Reviewer' },
            { email: 'cit@example.com', name: 'CIT Reviewer' },
            { email: 'dgda@example.com', name: 'DGDA Reviewer' },
        ];

        for (const reviewer of reviewers) {
            await pool.query(
                `INSERT INTO users (email, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO NOTHING`,
                [reviewer.email, reviewerPassword, reviewer.name, 'reviewer']
            );
        }
        console.log('✅ Reviewer users created');

        // 4. Create sample sites
        console.log('Creating sample sites...');
        const sites = [
            { name: 'Historical Well-2 Location 26', location: 'North Zone' },
            { name: 'Main Building Complex', location: 'Central Zone' },
            { name: 'Storage Facility A', location: 'South Zone' },
        ];

        const siteIds = [];
        for (const site of sites) {
            const result = await pool.query(
                `INSERT INTO sites (name, location, created_by)
         VALUES ($1, $2, $3)
         RETURNING id`,
                [site.name, site.location, adminId]
            );
            siteIds.push(result.rows[0].id);
        }
        console.log('✅ Sample sites created');

        // 5. Create sample assets
        console.log('Creating sample assets...');
        const assets = [
            {
                site_id: siteIds[0],
                ref_code: 'FM-001',
                name: 'Air Conditioning Unit',
                service_line: 'FM Services',
                floor: 'Ground',
                area: 'Main Hall',
                age: '5 years',
                description: 'Central AC unit for main hall',
            },
            {
                site_id: siteIds[0],
                ref_code: 'FM-002',
                name: 'Fire Extinguisher',
                service_line: 'Safety Equipment',
                floor: 'Ground',
                area: 'Corridor A',
                age: '2 years',
                description: 'CO2 fire extinguisher',
            },
            {
                site_id: siteIds[1],
                ref_code: 'EL-001',
                name: 'Emergency Light',
                service_line: 'Electrical',
                floor: 'First',
                area: 'Stairwell',
                age: '3 years',
                description: 'LED emergency exit light',
            },
        ];

        for (const asset of assets) {
            await pool.query(
                `INSERT INTO assets (site_id, ref_code, name, service_line, floor, area, age, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    asset.site_id,
                    asset.ref_code,
                    asset.name,
                    asset.service_line,
                    asset.floor,
                    asset.area,
                    asset.age,
                    asset.description,
                ]
            );
        }
        console.log('✅ Sample assets created');

        console.log('');
        console.log('🎉 Database seeded successfully!');
        console.log('');
        console.log('Default credentials:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Admin:     admin@example.com / admin123');
        console.log('Surveyor:  surveyor1@example.com / surveyor123');
        console.log('Reviewer:  mag@example.com / reviewer123');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');
        console.log('⚠️  IMPORTANT: Change these passwords in production!');

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run seed
seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
