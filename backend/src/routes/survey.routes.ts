import { Router, Response } from 'express';
import pool from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { SurveyController } from '../controllers/survey.controller';

const router = Router();
const surveyController = new SurveyController();

// Get all surveys (filtered by role)
router.get('/', authenticate, surveyController.getAll);

// Export survey to Excel
router.get('/:id/export', authenticate, surveyController.export);

// Get survey by ID
router.get('/:id', authenticate, surveyController.getById);

// Delete survey (Admin or own surveyor)
router.delete('/:id', authenticate, surveyController.delete);

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
        // Temporary logging
        const fs = require('fs');
        const path = require('path');
        fs.appendFileSync(path.join(__dirname, '../../error.log'), `${new Date().toISOString()} - Get inspections error: ${error.message} - ${JSON.stringify(error)}\n`);

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
router.put('/inspections/:id', authenticate, authorize('admin', 'surveyor'), async (req: AuthRequest, res: Response) => {
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
