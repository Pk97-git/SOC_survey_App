import { Router, Response } from 'express';
import pool from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Get all surveys (filtered by role)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { status, siteId } = req.query;
        const user = req.user!;

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

        // Role-based filtering
        if (user.role === 'surveyor') {
            query += ` AND s.surveyor_id = $${paramIndex}`;
            params.push(user.userId);
            paramIndex++;
        }
        // Admin sees all, Reviewer sees assigned (TODO: implement assignment logic)

        // Status filter
        if (status) {
            query += ` AND s.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        // Site filter
        if (siteId) {
            query += ` AND s.site_id = $${paramIndex}`;
            params.push(siteId);
            paramIndex++;
        }

        query += ' ORDER BY s.created_at DESC';

        const result = await pool.query(query, params);

        res.json({ surveys: result.rows });
    } catch (error: any) {
        console.error('Get surveys error:', error);
        res.status(500).json({ error: 'Failed to get surveys' });
    }
});

// Get survey by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user!;

        let query = `
      SELECT s.*, 
             si.name as site_name,
             u.full_name as surveyor_name
      FROM surveys s
      LEFT JOIN sites si ON s.site_id = si.id
      LEFT JOIN users u ON s.surveyor_id = u.id
      WHERE s.id = $1
    `;

        // Role-based access
        if (user.role === 'surveyor') {
            query += ' AND s.surveyor_id = $2';
        }

        const params = user.role === 'surveyor' ? [id, user.userId] : [id];
        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Survey not found or access denied' });
        }

        res.json({ survey: result.rows[0] });
    } catch (error: any) {
        console.error('Get survey error:', error);
        res.status(500).json({ error: 'Failed to get survey' });
    }
});

// Create survey (Surveyor only)
router.post('/', authenticate, authorize('surveyor'), async (req: AuthRequest, res: Response) => {
    try {
        const { siteId, trade } = req.body;

        if (!siteId) {
            return res.status(400).json({ error: 'Site ID is required' });
        }

        const result = await pool.query(
            `INSERT INTO surveys (site_id, surveyor_id, trade, status) 
       VALUES ($1, $2, $3, 'draft') 
       RETURNING *`,
            [siteId, req.user!.userId, trade]
        );

        res.status(201).json({
            message: 'Survey created successfully',
            survey: result.rows[0]
        });
    } catch (error: any) {
        console.error('Create survey error:', error);
        res.status(500).json({ error: 'Failed to create survey' });
    }
});

// Update survey
router.put('/:id', authenticate, authorize('surveyor'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { trade, status } = req.body;
        const user = req.user!;

        const result = await pool.query(
            `UPDATE surveys 
       SET trade = COALESCE($1, trade),
           status = COALESCE($2, status),
           updated_at = NOW()
       WHERE id = $3 AND surveyor_id = $4
       RETURNING *`,
            [trade, status, id, user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Survey not found or access denied' });
        }

        res.json({
            message: 'Survey updated successfully',
            survey: result.rows[0]
        });
    } catch (error: any) {
        console.error('Update survey error:', error);
        res.status(500).json({ error: 'Failed to update survey' });
    }
});

// Submit survey
router.post('/:id/submit', authenticate, authorize('surveyor'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user!;

        const result = await pool.query(
            `UPDATE surveys 
       SET status = 'submitted',
           submitted_at = NOW(),
           updated_at = NOW()
       WHERE id = $1 AND surveyor_id = $2
       RETURNING *`,
            [id, user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Survey not found or access denied' });
        }

        res.json({
            message: 'Survey submitted successfully',
            survey: result.rows[0]
        });
    } catch (error: any) {
        console.error('Submit survey error:', error);
        res.status(500).json({ error: 'Failed to submit survey' });
    }
});

// Delete survey (Admin or own surveyor)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user!;

        let query = 'DELETE FROM surveys WHERE id = $1';
        const params: any[] = [id];

        if (user.role === 'surveyor') {
            query += ' AND surveyor_id = $2';
            params.push(user.userId);
        }

        query += ' RETURNING id';

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Survey not found or access denied' });
        }

        res.json({ message: 'Survey deleted successfully' });
    } catch (error: any) {
        console.error('Delete survey error:', error);
        res.status(500).json({ error: 'Failed to delete survey' });
    }
});

// Get inspections for a survey
router.get('/:surveyId/inspections', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { surveyId } = req.params;

        const result = await pool.query(
            `SELECT ai.*, a.name as asset_name, a.ref_code, a.service_line, a.floor, a.area
       FROM asset_inspections ai
       LEFT JOIN assets a ON ai.asset_id = a.id
       WHERE ai.survey_id = $1
       ORDER BY ai.created_at ASC`,
            [surveyId]
        );

        res.json({ inspections: result.rows });
    } catch (error: any) {
        console.error('Get inspections error:', error);
        res.status(500).json({ error: 'Failed to get inspections' });
    }
});

// Create inspection
router.post('/:surveyId/inspections', authenticate, authorize('surveyor'), async (req: AuthRequest, res: Response) => {
    try {
        const { surveyId } = req.params;
        const {
            assetId,
            conditionRating,
            overallCondition,
            quantityInstalled,
            quantityWorking,
            remarks,
            gpsLat,
            gpsLng
        } = req.body;

        if (!assetId) {
            return res.status(400).json({ error: 'Asset ID is required' });
        }

        const result = await pool.query(
            `INSERT INTO asset_inspections (
        survey_id, asset_id, condition_rating, overall_condition, 
        quantity_installed, quantity_working, remarks, gps_lat, gps_lng
      ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
            [
                surveyId, assetId, conditionRating, overallCondition,
                quantityInstalled, quantityWorking, remarks, gpsLat, gpsLng
            ]
        );

        res.status(201).json({
            message: 'Inspection created successfully',
            inspection: result.rows[0]
        });
    } catch (error: any) {
        console.error('Create inspection error:', error);
        res.status(500).json({ error: 'Failed to create inspection' });
    }
});

// Update inspection
router.put('/inspections/:id', authenticate, authorize('surveyor'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const {
            conditionRating,
            overallCondition,
            quantityInstalled,
            quantityWorking,
            remarks,
            gpsLat,
            gpsLng
        } = req.body;

        const result = await pool.query(
            `UPDATE asset_inspections 
       SET condition_rating = COALESCE($1, condition_rating),
           overall_condition = COALESCE($2, overall_condition),
           quantity_installed = COALESCE($3, quantity_installed),
           quantity_working = COALESCE($4, quantity_working),
           remarks = COALESCE($5, remarks),
           gps_lat = COALESCE($6, gps_lat),
           gps_lng = COALESCE($7, gps_lng),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
            [conditionRating, overallCondition, quantityInstalled, quantityWorking, remarks, gpsLat, gpsLng, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Inspection not found' });
        }

        res.json({
            message: 'Inspection updated successfully',
            inspection: result.rows[0]
        });
    } catch (error: any) {
        console.error('Update inspection error:', error);
        res.status(500).json({ error: 'Failed to update inspection' });
    }
});

export default router;
