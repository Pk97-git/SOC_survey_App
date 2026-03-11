import { Response } from 'express';
import { SurveyService } from '../services/survey.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { VALID_TRADES, VALID_SURVEY_STATUSES } from '../utils/validation.utils';

export class SurveyController {
    private service: SurveyService;

    constructor() {
        this.service = new SurveyService();
    }

    getAll = async (req: AuthRequest, res: Response) => {
        try {
            const { status, siteId, limit, offset, since } = req.query;
            const filter = {
                status: status as string,
                siteId: siteId as string,
                since: since as string,
                limit: limit ? parseInt(limit as string) : undefined,
                offset: offset ? parseInt(offset as string) : undefined
            };

            const surveys = await this.service.getAll(req.user, filter);
            res.json({ surveys });
        } catch (error: unknown) {
            console.error('Get surveys error:', error);
            res.status(500).json({ error: 'Failed to get surveys' });
        }
    };

    getById = async (req: AuthRequest, res: Response) => {
        try {
            const id = req.params.id as string;
            const survey = await this.service.getById(req.user, id);

            if (!survey) {
                return res.status(404).json({ error: 'Survey not found or access denied' });
            }

            res.json({ survey });
        } catch (error: unknown) {
            console.error('Get survey error:', error);
            res.status(500).json({ error: 'Failed to get survey' });
        }
    };

    create = async (req: AuthRequest, res: Response) => {
        try {
            const { siteId, trade, location, surveyorId } = req.body;
            if (!siteId) {
                return res.status(400).json({ error: 'Site ID is required' });
            }
            if (trade !== undefined && trade !== null && !VALID_TRADES.has(String(trade).toUpperCase())) {
                return res.status(400).json({ error: `Invalid trade. Must be one of: ${[...VALID_TRADES].join(', ')}` });
            }

            const survey = await this.service.create(req.user, {
                siteId,
                trade,
                location,
                // Service enforces: surveyors always self-assign, admins create unassigned
                surveyorId: surveyorId || null
            });

            console.log('✅ Survey created:', survey.id);
            res.status(201).json({
                message: 'Survey created successfully',
                survey
            });
        } catch (error: unknown) {
            console.error('Create survey error:', error);
            res.status(500).json({ error: 'Failed to create survey' });
        }
    };

    update = async (req: AuthRequest, res: Response) => {
        try {
            const id = req.params.id as string;
            const { trade, status, surveyorId, location } = req.body;

            if (trade !== undefined && trade !== null && !VALID_TRADES.has(String(trade).toUpperCase())) {
                return res.status(400).json({ error: `Invalid trade. Must be one of: ${[...VALID_TRADES].join(', ')}` });
            }
            if (status !== undefined && status !== null && !VALID_SURVEY_STATUSES.has(status)) {
                return res.status(400).json({ error: `Invalid status. Must be one of: ${[...VALID_SURVEY_STATUSES].join(', ')}` });
            }

            const survey = await this.service.update(req.user, id, { trade, status, surveyorId, location });

            if (!survey) {
                return res.status(404).json({ error: 'Survey not found' });
            }

            res.json({
                message: 'Survey updated successfully',
                survey
            });
        } catch (error: unknown) {
            if (error instanceof Error && error.message === 'Unauthorized') {
                return res.status(403).json({ error: 'Unauthorized' });
            }
            console.error('Update survey error:', error);
            res.status(500).json({ error: 'Failed to update survey' });
        }
    };

    submit = async (req: AuthRequest, res: Response) => {
        try {
            const id = req.params.id as string;
            const survey = await this.service.submit(req.user, id);

            if (!survey) {
                return res.status(404).json({ error: 'Survey not found' });
            }

            res.json({
                message: 'Survey submitted successfully',
                survey
            });
        } catch (error: unknown) {
            if (error instanceof Error && error.message === 'Unauthorized') {
                return res.status(403).json({ error: 'Unauthorized' });
            }
            console.error('Submit survey error:', error);
            res.status(500).json({ error: 'Failed to submit survey' });
        }
    };

    delete = async (req: AuthRequest, res: Response) => {
        try {
            const id = req.params.id as string;
            const success = await this.service.delete(req.user, id);

            if (!success) {
                return res.status(404).json({ error: 'Survey not found' });
            }

            res.json({ message: 'Survey deleted successfully' });
        } catch (error: unknown) {
            if (error instanceof Error && error.message === 'Unauthorized') {
                return res.status(403).json({ error: 'Unauthorized' });
            }
            console.error('Delete survey error:', error);
            res.status(500).json({ error: 'Failed to delete survey' });
        }
    };

    deleteAllBySite = async (req: AuthRequest, res: Response) => {
        try {
            const { siteId } = req.params;
            const success = await this.service.deleteAllBySite(req.user, siteId as string);

            if (!success) {
                return res.status(500).json({ error: 'Failed to delete surveys' });
            }

            res.json({ message: 'All surveys for site deleted successfully' });
        } catch (error: unknown) {
            if (error instanceof Error && error.message === 'Unauthorized') {
                return res.status(403).json({ error: 'Unauthorized' });
            }
            console.error('Delete all surveys error:', error);
            res.status(500).json({ error: 'Failed to delete surveys' });
        }
    };

    exportAllZip = async (req: AuthRequest, res: Response) => {
        try {
            const { siteId } = req.query;
            if (!siteId || typeof siteId !== 'string') {
                return res.status(400).json({ error: 'siteId query parameter is required' });
            }

            console.log(`📦 ZIP export requested for site ${siteId} by ${req.user?.email}`);
            const zipBuffer = await this.service.exportAllZip(req.user, siteId);

            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="surveys_${siteId}.zip"`);
            console.log(`✅ ZIP export ready for site ${siteId}`);
            res.send(zipBuffer);
        } catch (error: unknown) {
            console.error('Export all ZIP error:', error);
            console.error('ZIP export error:', error);
            res.status(500).json({ error: 'Failed to generate ZIP export' });
        }
    };

    exportToExcel = async (req: AuthRequest, res: Response) => {
        try {
            const id = req.params.id as string;
            const location = req.query.location as string; // Optional location filter

            // DEBUG LOGGING
            console.log(`🔍 Export Request Received:`);
            console.log(`   Survey ID: ${id}`);
            console.log(`   Location: ${location || 'ALL'}`);
            console.log(`   User: ${req.user?.email} (${req.user?.role})`);

            const buffer = await this.service.exportExcel(req.user, id, location);

            if (!buffer) {
                console.error(`❌ Export failed: Survey ${id} data not found or null`);
                return res.status(404).json({ error: `Survey ${id} not found or has no inspection data for the requested scope` });
            }

            const filename = location
                ? `survey-${id}-${location}.xlsx`
                : `survey-${id}.xlsx`;

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            console.log(`✅ Export successful: ${filename}`);
            res.send(buffer);
        } catch (error: unknown) {
            if (error instanceof Error && error.message === 'Unauthorized') {
                return res.status(403).json({ error: 'Unauthorized' });
            }
            console.error('Export survey error:', error);
            res.status(500).json({ error: 'Failed to export survey' });
        }
    };
}
