import { Pool } from 'pg';

export interface InspectionData {
    id?: string;
    survey_id: string;
    asset_id: string;
    condition_rating?: string;
    overall_condition?: string;
    quantity_installed?: number;
    quantity_working?: number;
    remarks?: string;
    gps_lat?: number;
    gps_lng?: number;
    mag_review?: any;
    cit_review?: any;
    dgda_review?: any;
    photos?: string[];
}

export class InspectionRepository {
    private pool: Pool;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    async getBySurveyId(surveyId: string) {
        const result = await this.pool.query(
            `SELECT ai.*, a.name as asset_name, a.ref_code, a.service_line,
                    COALESCE(
                        (SELECT json_agg(p.id) FROM photos p WHERE p.asset_inspection_id = ai.id),
                        '[]'::json
                    ) as photos
             FROM asset_inspections ai
             LEFT JOIN assets a ON ai.asset_id = a.id
             WHERE ai.survey_id = $1
             ORDER BY ai.created_at ASC`,
            [surveyId]
        );
        return result.rows;
    }

    async getBulkBySurveyIds(surveyIds: string[]) {
        const result = await this.pool.query(
            `SELECT ai.*, a.name as asset_name, a.ref_code, a.service_line,
                    ai.survey_id,
                    COALESCE(
                        (SELECT json_agg(p.id) FROM photos p WHERE p.asset_inspection_id = ai.id),
                        '[]'::json
                    ) as photos
             FROM asset_inspections ai
             LEFT JOIN assets a ON ai.asset_id = a.id
             WHERE ai.survey_id = ANY($1::uuid[])
             ORDER BY ai.survey_id, ai.created_at ASC`,
            [surveyIds]
        );
        return result.rows;
    }

    async create(data: InspectionData) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            const id = data.id;
            const result = await client.query(
                `INSERT INTO asset_inspections (
                    id, survey_id, asset_id, condition_rating, overall_condition, 
                    quantity_installed, quantity_working, remarks, gps_lat, gps_lng,
                    mag_review, cit_review, dgda_review
                ) 
                VALUES (COALESCE($13, gen_random_uuid()), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12::jsonb) 
                RETURNING *`,
                [
                    data.survey_id, data.asset_id, data.condition_rating, data.overall_condition,
                    data.quantity_installed, data.quantity_working, data.remarks, data.gps_lat, data.gps_lng,
                    data.mag_review ? JSON.stringify(data.mag_review) : null,
                    data.cit_review ? JSON.stringify(data.cit_review) : null,
                    data.dgda_review ? JSON.stringify(data.dgda_review) : null,
                    id
                ]
            );
            
            const inspection = result.rows[0];

            // Handle photos if provided
            if (data.photos && data.photos.length > 0) {
                for (const photoIdentifier of data.photos) {
                    if (typeof photoIdentifier !== 'string') continue;

                    // Case 1: UUID (from web immediate upload or existing photo)
                    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(photoIdentifier)) {
                        // Photo already exists in photos table, just link it
                        await client.query(
                            `UPDATE photos
                             SET asset_inspection_id = $1, survey_id = $2
                             WHERE id = $3`,
                            [inspection.id, data.survey_id, photoIdentifier]
                        );
                        continue;
                    }

                    // Case 2: File path (from mobile offline upload)
                    if (photoIdentifier.startsWith('uploads/')) {
                        await client.query(
                            `INSERT INTO photos (asset_inspection_id, survey_id, file_path)
                             VALUES ($1, $2, $3)
                             ON CONFLICT DO NOTHING`,
                            [inspection.id, data.survey_id, photoIdentifier]
                        );
                        continue;
                    }

                    // Case 3: Legacy URL - extract UUID
                    if (photoIdentifier.includes('/photos/')) {
                        const match = photoIdentifier.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
                        if (match) {
                            await client.query(
                                `UPDATE photos
                                 SET asset_inspection_id = $1, survey_id = $2
                                 WHERE id = $3`,
                                [inspection.id, data.survey_id, match[1]]
                            );
                        }
                    }
                }
            }

            await client.query('COMMIT');
            return inspection;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    async update(id: string, data: Partial<InspectionData>) {
        const result = await this.pool.query(
            `UPDATE asset_inspections
             SET condition_rating = COALESCE($1, condition_rating),
                 overall_condition = COALESCE($2, overall_condition),
                 quantity_installed = COALESCE($3, quantity_installed),
                 quantity_working = COALESCE($4, quantity_working),
                 remarks = COALESCE($5, remarks),
                 gps_lat = COALESCE($6, gps_lat),
                 gps_lng = COALESCE($7, gps_lng),
                 mag_review = COALESCE($8::jsonb, mag_review),
                 cit_review = COALESCE($9::jsonb, cit_review),
                 dgda_review = COALESCE($10::jsonb, dgda_review),
                 updated_at = NOW()
             WHERE id = $11
             RETURNING *`,
            [
                data.condition_rating, data.overall_condition, data.quantity_installed, data.quantity_working,
                data.remarks, data.gps_lat, data.gps_lng,
                data.mag_review ? JSON.stringify(data.mag_review) : null,
                data.cit_review ? JSON.stringify(data.cit_review) : null,
                data.dgda_review ? JSON.stringify(data.dgda_review) : null,
                id
            ]
        );
        return result.rows[0];
    }

    async getParentSurveyStatus(inspectionId: string) {
        const result = await this.pool.query(
            `SELECT s.status 
             FROM asset_inspections ai 
             JOIN surveys s ON ai.survey_id = s.id 
             WHERE ai.id = $1`,
            [inspectionId]
        );
        return result.rows[0];
    }

    async updateWithLock(id: string, data: Partial<InspectionData>, userRole: string) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const parentCheck = await client.query(
                `SELECT s.id, s.status 
                 FROM asset_inspections ai 
                 JOIN surveys s ON ai.survey_id = s.id 
                 WHERE ai.id = $1
                 FOR UPDATE`,
                [id]
            );

            if (parentCheck.rows.length > 0) {
                const isSubmitted = parentCheck.rows[0].status === 'submitted' || parentCheck.rows[0].status === 'completed';
                if (isSubmitted && userRole !== 'admin') {
                    throw new Error('Unauthorized: Only admins can edit inspections of submitted surveys');
                }
            }

            const surveyId = parentCheck.rows[0]?.id;

            const result = await client.query(
                `UPDATE asset_inspections
                 SET condition_rating = COALESCE($1, condition_rating),
                     overall_condition = COALESCE($2, overall_condition),
                     quantity_installed = COALESCE($3, quantity_installed),
                     quantity_working = COALESCE($4, quantity_working),
                     remarks = COALESCE($5, remarks),
                     gps_lat = COALESCE($6, gps_lat),
                     gps_lng = COALESCE($7, gps_lng),
                     mag_review = COALESCE($8::jsonb, mag_review),
                     cit_review = COALESCE($9::jsonb, cit_review),
                     dgda_review = COALESCE($10::jsonb, dgda_review),
                     updated_at = NOW()
                 WHERE id = $11
                 RETURNING *`,
                [
                    data.condition_rating, data.overall_condition, data.quantity_installed, data.quantity_working,
                    data.remarks, data.gps_lat, data.gps_lng,
                    data.mag_review ? JSON.stringify(data.mag_review) : null,
                    data.cit_review ? JSON.stringify(data.cit_review) : null,
                    data.dgda_review ? JSON.stringify(data.dgda_review) : null,
                    id
                ]
            );

            // Synchronize photos
            // The frontend sends a list of photo identifiers (can be URLs, UUIDs, or paths)
            const providedIdentifiers = new Set<string>();
            const extractIds = (items: string[] = []) => {
                items.forEach(p => {
                    // Extract UUID if it's a full URL or a relative path
                    const match = p.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
                    if (match) {
                        providedIdentifiers.add(match[1]);
                    } else if (p.startsWith('uploads/')) {
                        providedIdentifiers.add(p);
                    }
                });
            };

            extractIds(data.photos);
            if (data.mag_review?.photos) extractIds(data.mag_review.photos);
            if (data.cit_review?.photos) extractIds(data.cit_review.photos);
            if (data.dgda_review?.photos) extractIds(data.dgda_review.photos);

            // 1. Delete photos that are NOT in the provided list
            // Only targets photos linked to THIS inspection.
            if (surveyId) {
                // Fetch current photos to handle deletions correctly
                const currentPhotos = await client.query(
                    `SELECT id, file_path FROM photos WHERE asset_inspection_id = $1`,
                    [id]
                );

                for (const row of currentPhotos.rows) {
                    if (!providedIdentifiers.has(row.id) && !providedIdentifiers.has(row.file_path)) {
                        await client.query(`DELETE FROM photos WHERE id = $1`, [row.id]);
                        console.log(`[InspectionRepo] Deleted orphan photo ${row.id} (${row.file_path})`);
                    }
                }

                // 2. Add new photos
                const newItems = (data.photos || []);
                for (const photoIdentifier of newItems) {
                    if (typeof photoIdentifier !== 'string') continue;

                    // UUID - link existing photo
                    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(photoIdentifier)) {
                        // Check if already linked
                        const existing = await client.query(
                            `SELECT id FROM photos WHERE id = $1 AND asset_inspection_id = $2`,
                            [photoIdentifier, id]
                        );
                        if (existing.rows.length === 0) {
                            await client.query(
                                `UPDATE photos
                                 SET asset_inspection_id = $1, survey_id = $2
                                 WHERE id = $3`,
                                [id, surveyId, photoIdentifier]
                            );
                        }
                        continue;
                    }

                    // File path - insert new
                    if (photoIdentifier.startsWith('uploads/')) {
                        const exists = await client.query(
                            `SELECT id FROM photos WHERE asset_inspection_id = $1 AND file_path = $2`,
                            [id, photoIdentifier]
                        );
                        if (exists.rows.length === 0) {
                            await client.query(
                                `INSERT INTO photos (asset_inspection_id, survey_id, file_path)
                                 VALUES ($1, $2, $3)`,
                                [id, surveyId, photoIdentifier]
                            );
                        }
                    }

                    // Legacy URL - extract UUID
                    if (photoIdentifier.includes('/photos/')) {
                        const match = photoIdentifier.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
                        if (match) {
                            await client.query(
                                `UPDATE photos
                                 SET asset_inspection_id = $1, survey_id = $2
                                 WHERE id = $3`,
                                [id, surveyId, match[1]]
                            );
                        }
                    }
                }
            }
            
            await client.query('COMMIT');
            return result.rows[0];
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }
}
