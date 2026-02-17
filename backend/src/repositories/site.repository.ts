import pool from '../config/database';
import { Site, CreateSiteDTO, UpdateSiteDTO } from '../models/site.model';

export class SiteRepository {
    async findAll(): Promise<Site[]> {
        const result = await pool.query(
            'SELECT * FROM sites ORDER BY name ASC'
        );
        return result.rows;
    }

    async findById(id: string): Promise<Site | null> {
        const result = await pool.query(
            'SELECT * FROM sites WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    }

    async create(data: CreateSiteDTO): Promise<Site> {
        const result = await pool.query(
            'INSERT INTO sites (name, location, client) VALUES ($1, $2, $3) RETURNING *',
            [data.name, data.location || null, data.client || null]
        );
        return result.rows[0];
    }

    async update(id: string, data: UpdateSiteDTO): Promise<Site | null> {
        const result = await pool.query(
            `UPDATE sites
             SET name = COALESCE($1, name),
                 location = COALESCE($2, location),
                 client = COALESCE($3, client),
                 updated_at = NOW()
             WHERE id = $4
             RETURNING *`,
            [data.name, data.location, data.client, id]
        );
        return result.rows[0] || null;
    }

    async delete(id: string): Promise<boolean> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Delete Surveys (Cascades to asset_inspections, photos, etc.)
            await client.query('DELETE FROM surveys WHERE site_id = $1', [id]);

            // 2. Delete Site (Cascades to assets)
            const result = await client.query(
                'DELETE FROM sites WHERE id = $1 RETURNING id',
                [id]
            );

            await client.query('COMMIT');
            return (result.rows.length > 0);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}
