import { Request, Response } from 'express';
import { SiteService } from '../services/site.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class SiteController {
    private service: SiteService;

    constructor() {
        this.service = new SiteService();
    }

    getAll = async (req: AuthRequest, res: Response) => {
        try {
            const sites = await this.service.getAll();
            res.json({ sites });
        } catch (error: any) {
            console.error('Get sites error:', error);
            res.status(500).json({ error: 'Failed to get sites' });
        }
    };

    getById = async (req: AuthRequest, res: Response) => {
        try {
            const id = req.params.id as string;
            const site = await this.service.getById(id);

            if (!site) {
                return res.status(404).json({ error: 'Site not found' });
            }

            res.json({ site });
        } catch (error: any) {
            console.error('Get site error:', error);
            res.status(500).json({ error: 'Failed to get site' });
        }
    };

    create = async (req: AuthRequest, res: Response) => {
        try {
            const { name, location } = req.body;
            if (!name) {
                return res.status(400).json({ error: 'Site name is required' });
            }

            const site = await this.service.create({ name, location });

            res.status(201).json({
                message: 'Site created successfully',
                site
            });
        } catch (error: any) {
            console.error('Create site error:', error);
            res.status(500).json({ error: 'Failed to create site' });
        }
    };

    update = async (req: AuthRequest, res: Response) => {
        try {
            const id = req.params.id as string;
            const { name, location } = req.body;

            const site = await this.service.update(id, { name, location });

            if (!site) {
                return res.status(404).json({ error: 'Site not found' });
            }

            res.json({
                message: 'Site updated successfully',
                site
            });
        } catch (error: any) {
            console.error('Update site error:', error);
            res.status(500).json({ error: 'Failed to update site' });
        }
    };

    delete = async (req: AuthRequest, res: Response) => {
        try {
            const id = req.params.id as string;
            const success = await this.service.delete(id);

            if (!success) {
                return res.status(404).json({ error: 'Site not found' });
            }

            res.json({ message: 'Site deleted successfully' });
        } catch (error: any) {
            console.error('Delete site error:', error);
            res.status(500).json({ error: 'Failed to delete site' });
        }
    };
}
