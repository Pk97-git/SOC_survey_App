import { Router, Response } from 'express';
import pool from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { SurveyController } from '../controllers/survey.controller';
import { InspectionController } from '../controllers/inspection.controller';
import { InspectionService } from '../services/inspection.service';
import { InspectionRepository } from '../repositories/inspection.repository';
import { isValidUUID } from '../utils/validation.utils';

const router = Router();
const surveyController = new SurveyController();

// Dependency Injection instantiation for the cleanly decoupled controllers
const inspectionRepository = new InspectionRepository(pool);
const inspectionService = new InspectionService(inspectionRepository);
const inspectionController = new InspectionController(inspectionService);

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
router.post('/inspections/bulk', authenticate, inspectionController.getBulkInspections);

// Export survey to Excel
router.get('/:id/export', authenticate, surveyController.exportToExcel);

// Update inspection — must be registered BEFORE PUT /:id to avoid Express treating
router.put('/inspections/:id', authenticate, authorize('admin', 'surveyor'), inspectionController.updateInspection);

// Get survey by ID
router.get('/:id', authenticate, surveyController.getById);

// Update survey (Admin or own surveyor)
router.put('/:id', authenticate, authorize('admin', 'surveyor'), surveyController.update);

// Submit survey (Surveyor or Admin)
router.post('/:id/submit', authenticate, authorize('admin', 'surveyor'), surveyController.submit);

// Delete survey (Admin or own surveyor)
router.delete('/:id', authenticate, surveyController.delete);

// Get inspections for a survey
router.get('/:surveyId/inspections', authenticate, inspectionController.getInspections);

// Create inspection
router.post('/:surveyId/inspections', authenticate, authorize('admin', 'surveyor'), inspectionController.createInspection);

export default router;
