import { Router, Response } from 'express';
import pool from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Get all sites
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT s.*, u.full_name as created_by_name 
       FROM sites s 
       LEFT JOIN users u ON s.created_by = u.id 
       ORDER BY s.created_at DESC`
        );

        res.json({ sites: result.rows });
    } catch (error: any) {
        console.error('Get sites error:', error);
        res.status(500).json({ error: 'Failed to get sites' });
    }
});

// Get site by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT s.*, u.full_name as created_by_name 
       FROM sites s 
       LEFT JOIN users u ON s.created_by = u.id 
       WHERE s.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Site not found' });
        }

        res.json({ site: result.rows[0] });
    } catch (error: any) {
        console.error('Get site error:', error);
        res.status(500).json({ error: 'Failed to get site' });
    }
});

// Create site (Admin or Surveyor)
router.post('/', authenticate, authorize('admin', 'surveyor'), async (req: AuthRequest, res: Response) => {
    try {
        const { name, location } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Site name is required' });
        }

        const result = await pool.query(
            `INSERT INTO sites (name, location, created_by) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
            [name, location, req.user!.userId]
        );

        res.status(201).json({
            message: 'Site created successfully',
            site: result.rows[0]
        });
    } catch (error: any) {
        console.error('Create site error:', error);
        res.status(500).json({ error: 'Failed to create site' });
    }
});

// Update site (Admin or Surveyor)
router.put('/:id', authenticate, authorize('admin', 'surveyor'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, location } = req.body;

        const result = await pool.query(
            `UPDATE sites 
       SET name = COALESCE($1, name), 
           location = COALESCE($2, location)
       WHERE id = $3
       RETURNING *`,
            [name, location, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Site not found' });
        }

        res.json({
            message: 'Site updated successfully',
            site: result.rows[0]
        });
    } catch (error: any) {
        console.error('Update site error:', error);
        res.status(500).json({ error: 'Failed to update site' });
    }
});

// Delete site (Admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM sites WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Site not found' });
        }

        res.json({ message: 'Site deleted successfully' });
    } catch (error: any) {
        console.error('Delete site error:', error);
        res.status(500).json({ error: 'Failed to delete site' });
    }
});

export default router;
