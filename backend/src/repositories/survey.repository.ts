import pool from '../config/database';
import { Survey, CreateSurveyDTO, UpdateSurveyDTO, SurveyFilter } from '../models/survey.model';

export class SurveyRepository {
    async findAll(filter: SurveyFilter): Promise<Survey[]> {
        let query = `
            SELECT s.*, 
                   si.name as site_name,
                   u.full_name as surveyor_name
            FROM surveys s
            LEFT JOIN sites si ON s.site_id = si.id
            LEFT JOIN users u ON s.surveyor_id = u.id
            WHERE 1=1
        `;
        const params: any[] = [];
        let paramIndex = 1;

        if (filter.surveyorId) {
            query += ` AND s.surveyor_id = $${paramIndex}`;
            params.push(filter.surveyorId);
            paramIndex++;
        }

        if (filter.status) {
            query += ` AND s.status = $${paramIndex}`;
            params.push(filter.status);
            paramIndex++;
        }

        if (filter.siteId) {
            query += ` AND s.site_id = $${paramIndex}`;
            params.push(filter.siteId);
            paramIndex++;
        }

        query += ' ORDER BY s.created_at DESC';

        if (filter.limit) {
            query += ` LIMIT $${paramIndex}`;
            params.push(filter.limit);
            paramIndex++;
        }

        if (filter.offset) {
            query += ` OFFSET $${paramIndex}`;
            params.push(filter.offset);
            paramIndex++;
        }

        const result = await pool.query(query, params);
        return result.rows;
    }

    async findById(id: string): Promise<Survey | null> {
        const result = await pool.query(
            `SELECT s.*, 
                    si.name as site_name,
                    u.full_name as surveyor_name
             FROM surveys s
             LEFT JOIN sites si ON s.site_id = si.id
             LEFT JOIN users u ON s.surveyor_id = u.id
             WHERE s.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    async create(data: CreateSurveyDTO): Promise<Survey> {
        const result = await pool.query(
            `INSERT INTO surveys (site_id, surveyor_id, trade, status) 
             VALUES ($1, $2, $3, 'draft') 
             RETURNING *`,
            [data.siteId, data.surveyorId, data.trade]
        );
        return result.rows[0];
    }

    async update(id: string, data: UpdateSurveyDTO): Promise<Survey | null> {
        const result = await pool.query(
            `UPDATE surveys 
             SET trade = COALESCE($1, trade),
                 status = COALESCE($2, status),
                 updated_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [data.trade, data.status, id]
        );
        return result.rows[0] || null;
    }

    async submit(id: string): Promise<Survey | null> {
        const result = await pool.query(
            `UPDATE surveys 
             SET status = 'submitted',
                 submitted_at = NOW(),
                 updated_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [id]
        );
        return result.rows[0] || null;
    }

    async delete(id: string): Promise<boolean> {
        const result = await pool.query(
            'DELETE FROM surveys WHERE id = $1 RETURNING id',
            [id]
        );
        return (result.rows.length > 0);
    }

    // Check ownership method might be useful for service layer validation, 
    // but typically we just fetch by ID and check field
}
