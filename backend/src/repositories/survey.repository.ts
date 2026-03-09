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

        // surveyorId filter completely removed to allow system-wide fetch

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
            `INSERT INTO surveys (site_id, surveyor_id, trade, location, status)
             VALUES ($1, $2, $3, $4, 'draft')
             RETURNING *`,
            [data.siteId, data.surveyorId || null, data.trade || null, data.location || null]
        );
        return result.rows[0];
    }

    async update(id: string, data: UpdateSurveyDTO): Promise<Survey | null> {
        const result = await pool.query(
            `UPDATE surveys
             SET trade = COALESCE($1, trade),
                 status = COALESCE($2, status),
                 location = COALESCE($3, location),
                 surveyor_id = CASE WHEN $4::text IS NOT NULL THEN $4::uuid ELSE surveyor_id END,
                 updated_at = NOW()
             WHERE id = $5
             RETURNING *`,
            [data.trade, data.status, data.location, data.surveyorId || null, id]
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

    async deleteAllBySite(siteId: string): Promise<boolean> {
        await pool.query('DELETE FROM surveys WHERE site_id = $1', [siteId]);
        return true;
    }

    async findWithDetails(id: string): Promise<any> {
        const survey = await this.findById(id);
        if (!survey) return null;

        // Fetch ALL assets for this site and trade, joining with any existing inspections
        // This ensures the report includes all assets that NEED to be inspected,
        // even if they haven't been touched yet.
        const inspections = await pool.query(
            `SELECT
                a.id as asset_id,
                a.name as asset_name,
                a.ref_code,
                a.service_line,
                a.building,
                a.location,
                a.asset_tag,
                a.status as asset_status,
                a.description,

                ai.id as inspection_id,
                ai.condition_rating,
                ai.overall_condition,
                ai.quantity_installed,
                ai.quantity_working,
                ai.remarks,
                ai.gps_lat,
                ai.gps_lng,
                (
                    SELECT json_agg(json_build_object('id', p.id, 'file_path', p.file_path, 'caption', p.caption))
                    FROM photos p
                    WHERE p.asset_inspection_id = ai.id
                ) as photos,
                (
                    SELECT json_build_object('comments', rc.comments, 'photos', rc.photos)
                    FROM review_comments rc
                    WHERE rc.asset_inspection_id = ai.id AND rc.reviewer_type = 'MAG'
                    LIMIT 1
                ) as mag_review,
                (
                    SELECT json_build_object('comments', rc.comments, 'photos', rc.photos)
                    FROM review_comments rc
                    WHERE rc.asset_inspection_id = ai.id AND rc.reviewer_type IN ('CIT', 'REVIEWER')
                    LIMIT 1
                ) as cit_review,
                (
                    SELECT json_build_object('comments', rc.comments, 'photos', rc.photos)
                    FROM review_comments rc
                    WHERE rc.asset_inspection_id = ai.id AND rc.reviewer_type = 'DGDA'
                    LIMIT 1
                ) as dgda_review
             FROM assets a
             LEFT JOIN asset_inspections ai ON a.id = ai.asset_id AND ai.survey_id = $1
             WHERE a.site_id = $2 AND a.service_line = $3
             ORDER BY a.building, a.location, a.name`,
            [id, survey.site_id, survey.trade]
        );

        return {
            ...survey,
            inspections: inspections.rows.map(row => ({
                ...row,
                condition_rating: row.condition_rating || '',
                remarks: row.remarks || '',
            }))
        };
    }

    /**
     * Fetch all surveys for a site together with their inspection + photo data
     * in exactly 2 queries (vs. 2×N in the naïve per-survey approach).
     */
    async findAllWithDetailsBySite(siteId: string): Promise<any[]> {
        const surveysResult = await pool.query(
            `SELECT s.*,
                    si.name as site_name,
                    u.full_name as surveyor_name
             FROM surveys s
             LEFT JOIN sites si ON s.site_id = si.id
             LEFT JOIN users u ON s.surveyor_id = u.id
             WHERE s.site_id = $1
             ORDER BY s.created_at DESC`,
            [siteId]
        );

        if (surveysResult.rows.length === 0) return [];

        const surveyIds: string[] = surveysResult.rows.map((s: any) => s.id);

        const inspectionsResult = await pool.query(
            `SELECT
                a.id as asset_id,
                a.name as asset_name,
                a.ref_code,
                a.service_line,
                a.building,
                a.location,
                a.asset_tag,
                a.status as asset_status,
                a.description,
                s.id as survey_id,
                ai.id as inspection_id,
                ai.condition_rating,
                ai.overall_condition,
                ai.quantity_installed,
                ai.quantity_working,
                ai.remarks,
                ai.gps_lat,
                ai.gps_lng,
                (
                    SELECT json_agg(json_build_object('id', p.id, 'file_path', p.file_path, 'caption', p.caption))
                    FROM photos p
                    WHERE p.asset_inspection_id = ai.id
                ) as photos,
                (
                    SELECT json_build_object('comments', rc.comments, 'photos', rc.photos)
                    FROM review_comments rc
                    WHERE rc.asset_inspection_id = ai.id AND rc.reviewer_type = 'MAG'
                    LIMIT 1
                ) as mag_review,
                (
                    SELECT json_build_object('comments', rc.comments, 'photos', rc.photos)
                    FROM review_comments rc
                    WHERE rc.asset_inspection_id = ai.id AND rc.reviewer_type IN ('CIT', 'REVIEWER')
                    LIMIT 1
                ) as cit_review,
                (
                    SELECT json_build_object('comments', rc.comments, 'photos', rc.photos)
                    FROM review_comments rc
                    WHERE rc.asset_inspection_id = ai.id AND rc.reviewer_type = 'DGDA'
                    LIMIT 1
                ) as dgda_review
             FROM surveys s
             JOIN assets a ON a.site_id = s.site_id AND a.service_line = s.trade
             LEFT JOIN asset_inspections ai ON a.id = ai.asset_id AND ai.survey_id = s.id
             WHERE s.id = ANY($1::uuid[])
             ORDER BY s.id, a.building, a.location, a.name`,
            [surveyIds]
        );

        const inspectionsBySurvey = new Map<string, any[]>();
        for (const row of inspectionsResult.rows) {
            const list = inspectionsBySurvey.get(row.survey_id) ?? [];
            list.push({
                ...row,
                condition_rating: row.condition_rating || '',
                remarks: row.remarks || '',
            });
            inspectionsBySurvey.set(row.survey_id, list);
        }

        return surveysResult.rows.map((survey: any) => ({
            ...survey,
            inspections: inspectionsBySurvey.get(survey.id) ?? [],
        }));
    }
}
