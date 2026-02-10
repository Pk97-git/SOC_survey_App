import { Request, Response } from 'express';
import { SurveyService } from '../services/survey.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class SurveyController {
    private service: SurveyService;

    constructor() {
        this.service = new SurveyService();
    }

    getAll = async (req: AuthRequest, res: Response) => {
        try {
            const { status, siteId, limit, offset } = req.query;
            const filter = {
                status: status as string,
                siteId: siteId as string,
                limit: limit ? parseInt(limit as string) : undefined,
                offset: offset ? parseInt(offset as string) : undefined
            };

            const surveys = await this.service.getAll(req.user, filter);
            res.json({ surveys });
        } catch (error: any) {
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
        } catch (error: any) {
            console.error('Get survey error:', error);
            res.status(500).json({ error: 'Failed to get survey' });
        }
    };

    create = async (req: AuthRequest, res: Response) => {
        try {
            const { siteId, trade } = req.body;
            if (!siteId) {
                return res.status(400).json({ error: 'Site ID is required' });
            }

            const survey = await this.service.create(req.user, {
                siteId,
                trade,
                surveyorId: req.user!.userId
            });

            res.status(201).json({
                message: 'Survey created successfully',
                survey
            });
        } catch (error: any) {
            console.error('Create survey error:', error);
            res.status(500).json({ error: 'Failed to create survey' });
        }
    };

    update = async (req: AuthRequest, res: Response) => {
        try {
            const id = req.params.id as string;
            const { trade, status } = req.body;

            const survey = await this.service.update(req.user, id, { trade, status });

            if (!survey) {
                return res.status(404).json({ error: 'Survey not found' });
            }

            res.json({
                message: 'Survey updated successfully',
                survey
            });
        } catch (error: any) {
            if (error.message === 'Unauthorized') {
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
        } catch (error: any) {
            if (error.message === 'Unauthorized') {
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
        } catch (error: any) {
            if (error.message === 'Unauthorized') {
                return res.status(403).json({ error: 'Unauthorized' });
            }
            console.error('Delete survey error:', error);
            res.status(500).json({ error: 'Failed to delete survey' });
        }
    };
}
