import { Request, Response } from 'express';
import { InspectionService } from '../services/inspection.service';
import { isValidUUID } from '../utils/validation.utils';

export class InspectionController {
    private service: InspectionService;

    constructor(service: InspectionService) {
        this.service = service;
    }

    // Bind this context securely for Express hooks
    getInspections = async (req: Request, res: Response) => {
        try {
            const { surveyId } = req.params;

            if (!isValidUUID(surveyId)) {
                return res.status(400).json({ error: 'Invalid survey ID format' });
            }

            const inspections = await this.service.getInspections(surveyId);
            res.json({ inspections });
        } catch (error: any) {
            console.error('Get inspections error:', error);
            res.status(500).json({ error: 'Failed to get inspections' });
        }
    };

    getBulkInspections = async (req: Request, res: Response) => {
        try {
            const { surveyIds } = req.body;

            if (!Array.isArray(surveyIds) || surveyIds.length === 0) {
                return res.status(400).json({ error: 'surveyIds array is required in request body' });
            }

            if (surveyIds.some(id => !isValidUUID(id))) {
                return res.status(400).json({ error: 'One or more survey IDs are invalid' });
            }

            const inspections = await this.service.getBulkInspections(surveyIds);
            res.json({ inspections });
        } catch (error: any) {
            console.error('Bulk get inspections error:', error);
            res.status(500).json({ error: 'Failed to get inspections' });
        }
    };

    createInspection = async (req: Request, res: Response) => {
        try {
            const { surveyId } = req.params;

            if (!isValidUUID(surveyId)) {
                return res.status(400).json({ error: 'Invalid survey ID format' });
            }
            if (!req.body.assetId) {
                return res.status(400).json({ error: 'Asset ID is required' });
            }
            if (!isValidUUID(req.body.assetId)) {
                return res.status(400).json({ error: 'Invalid asset ID format' });
            }

            const inspection = await this.service.createInspection({
                id: req.body.id,
                survey_id: surveyId,
                asset_id: req.body.assetId,
                condition_rating: req.body.conditionRating,
                overall_condition: req.body.overallCondition,
                quantity_installed: req.body.quantityInstalled,
                quantity_working: req.body.quantityWorking,
                remarks: req.body.remarks,
                gps_lat: req.body.gpsLat,
                gps_lng: req.body.gpsLng,
                mag_review: req.body.magReview,
                cit_review: req.body.citReview,
                dgda_review: req.body.dgdaReview,
                photos: req.body.photos
            });

            res.status(201).json({
                message: 'Inspection created successfully',
                inspection
            });
        } catch (error: any) {
            console.error('Create inspection error:', error);
            if (error.message && error.message.includes('Invalid')) {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to create inspection' });
        }
    };

    updateInspection = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            if (!isValidUUID(id)) {
                return res.status(400).json({ error: 'Invalid inspection ID format' });
            }

            // The user role is attached by the authenticate middleware
            const userRole = (req as any).user?.role || 'surveyor';

            const inspection = await this.service.updateInspection(id, {
                condition_rating: req.body.conditionRating,
                overall_condition: req.body.overallCondition,
                quantity_installed: req.body.quantityInstalled,
                quantity_working: req.body.quantityWorking,
                remarks: req.body.remarks,
                gps_lat: req.body.gpsLat,
                gps_lng: req.body.gpsLng,
                mag_review: req.body.magReview,
                cit_review: req.body.citReview,
                dgda_review: req.body.dgdaReview,
                photos: req.body.photos
            }, userRole);

            res.json({
                message: 'Inspection updated successfully',
                inspection
            });
        } catch (error: any) {
            console.error('Update inspection error:', error);
            if (error.message && error.message.includes('Unauthorized')) {
                return res.status(403).json({ error: error.message });
            }
            if (error.message && error.message.includes('not found')) {
                return res.status(404).json({ error: error.message });
            }
            if (error.message && error.message.includes('Invalid')) {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to update inspection' });
        }
    };
}
