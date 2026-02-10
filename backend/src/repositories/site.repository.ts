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
            'INSERT INTO sites (name, location) VALUES ($1, $2) RETURNING *',
            [data.name, data.location]
        );
        return result.rows[0];
    }

    async update(id: string, data: UpdateSiteDTO): Promise<Site | null> {
        const result = await pool.query(
            `UPDATE sites 
             SET name = COALESCE($1, name),
                 location = COALESCE($2, location),
                 updated_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [data.name, data.location, id]
        );
        return result.rows[0] || null;
    }

    async delete(id: string): Promise<boolean> {
        const result = await pool.query(
            'DELETE FROM sites WHERE id = $1 RETURNING id',
            [id]
        );
        return (result.rows.length > 0);
    }
}
