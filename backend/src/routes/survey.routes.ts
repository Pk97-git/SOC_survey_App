import { Router, Response } from 'express';
import pool from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { SurveyController } from '../controllers/survey.controller';
import { isValidUUID, VALID_CONDITION_RATINGS, VALID_OVERALL_CONDITIONS } from '../utils/validation.utils';

const router = Router();
const surveyController = new SurveyController();

// Get all surveys (filtered by role)
router.get('/', authenticate, surveyController.getAll);

// Create survey (Admin or Surveyor)
router.post('/', authenticate, authorize('admin', 'surveyor'), surveyController.create);

// Delete ALL surveys for a site (Admin only)
router.delete('/site/:siteId', authenticate, authorize('admin'), (req: AuthRequest, res: Response, next) => {
    if (!isValidUUID(req.params.siteId)) {
        return res.status(400).json({ error: 'Invalid site ID format' });
    }
    next();
}, surveyController.deleteAllBySite);

// Export ALL surveys for a site as a single ZIP (must be before /:id routes)
router.get('/export-zip', authenticate, surveyController.exportAllZip);

// Bulk fetch inspections for multiple surveys in one request
// Body: { surveyIds: ["uuid1", "uuid2"] }
router.post('/inspections/bulk', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        console.log("----- BULK INSPECTIONS INCOMING PAYLOAD -----");
        console.log(JSON.stringify(req.body, null, 2));

        const { surveyIds } = req.body;

        if (!Array.isArray(surveyIds) || surveyIds.length === 0) {
            return res.status(400).json({ error: 'surveyIds array is required in request body' });
        }

        if (surveyIds.some(id => !isValidUUID(id))) {
            return res.status(400).json({ error: 'One or more survey IDs are invalid' });
        }

        const result = await pool.query(
            `SELECT ai.*, a.name as asset_name, a.ref_code, a.service_line,
                    ai.survey_id
             FROM asset_inspections ai
             LEFT JOIN assets a ON ai.asset_id = a.id
             WHERE ai.survey_id = ANY($1::uuid[])
             ORDER BY ai.survey_id, ai.created_at ASC`,
            [surveyIds]
        );

        res.json({ inspections: result.rows });
    } catch (error: any) {
        console.error('Bulk get inspections error DETAILS:', error);
        res.status(500).json({ error: 'Failed to get inspections', details: error.message });
    }
});

// Export survey to Excel
router.get('/:id/export', authenticate, surveyController.exportToExcel);

// Update inspection — must be registered BEFORE PUT /:id to avoid Express treating
// "inspections" as the :id param
router.put('/inspections/:id', authenticate, authorize('admin', 'surveyor'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({ error: 'Invalid inspection ID format' });
        }

        const {
            conditionRating,
            overallCondition,
            quantityInstalled,
            quantityWorking,
            remarks,
            gpsLat,
            gpsLng
        } = req.body;

        if (conditionRating !== undefined && conditionRating !== null && !VALID_CONDITION_RATINGS.has(conditionRating)) {
            return res.status(400).json({ error: `Invalid condition rating. Must be one of: ${[...VALID_CONDITION_RATINGS].join(', ')}` });
        }
        if (overallCondition !== undefined && overallCondition !== null && !VALID_OVERALL_CONDITIONS.has(overallCondition)) {
            return res.status(400).json({ error: `Invalid overall condition. Must be one of: ${[...VALID_OVERALL_CONDITIONS].join(', ')}` });
        }

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

// Get survey by ID
router.get('/:id', authenticate, surveyController.getById);

// Update survey (Admin or own surveyor)
router.put('/:id', authenticate, authorize('admin', 'surveyor'), surveyController.update);

// Submit survey (Surveyor or Admin)
router.post('/:id/submit', authenticate, authorize('admin', 'surveyor'), surveyController.submit);

// Delete survey (Admin or own surveyor)
router.delete('/:id', authenticate, surveyController.delete);

// Get inspections for a survey
router.get('/:surveyId/inspections', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { surveyId } = req.params;

        if (!isValidUUID(surveyId)) {
            return res.status(400).json({ error: 'Invalid survey ID format' });
        }

        const result = await pool.query(
            `SELECT ai.*, a.name as asset_name, a.ref_code, a.service_line
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
router.post('/:surveyId/inspections', authenticate, authorize('admin', 'surveyor'), async (req: AuthRequest, res: Response) => {
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

        if (!isValidUUID(surveyId)) {
            console.error('Validation Error: Invalid survey ID format:', surveyId);
            return res.status(400).json({ error: 'Invalid survey ID format' });
        }
        if (!assetId) {
            console.error('Validation Error: Asset ID is missing');
            return res.status(400).json({ error: 'Asset ID is required' });
        }
        if (!isValidUUID(assetId)) {
            console.error('Validation Error: Invalid asset ID format:', assetId);
            return res.status(400).json({ error: 'Invalid asset ID format' });
        }
        if (conditionRating !== undefined && conditionRating !== null && !VALID_CONDITION_RATINGS.has(conditionRating)) {
            console.error('Validation Error: Invalid condition rating:', conditionRating);
            return res.status(400).json({ error: `Invalid condition rating. Must be one of: ${[...VALID_CONDITION_RATINGS].join(', ')}` });
        }
        if (overallCondition !== undefined && overallCondition !== null && !VALID_OVERALL_CONDITIONS.has(overallCondition)) {
            console.error('Validation Error: Invalid overall condition:', overallCondition);
            return res.status(400).json({ error: `Invalid overall condition. Must be one of: ${[...VALID_OVERALL_CONDITIONS].join(', ')}` });
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

export default router;
