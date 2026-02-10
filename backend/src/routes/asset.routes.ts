import { Router, Response } from 'express';
import pool from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import multer from 'multer';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for Excel file uploads
const excelStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/excel');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'assets-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const excelUpload = multer({
    storage: excelStorage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /xlsx|xls/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype) ||
                        file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                        file.mimetype === 'application/vnd.ms-excel';

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
        }
    }
});

// Get all assets (with optional site filter)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { siteId } = req.query;

        let query = `
      SELECT a.*, s.name as site_name 
      FROM assets a 
      LEFT JOIN sites s ON a.site_id = s.id 
    `;
        const params: any[] = [];

        if (siteId) {
            query += ' WHERE a.site_id = $1';
            params.push(siteId);
        }

        query += ' ORDER BY a.created_at DESC';

        const result = await pool.query(query, params);

        res.json({ assets: result.rows });
    } catch (error: any) {
        console.error('Get assets error:', error);
        res.status(500).json({ error: 'Failed to get assets' });
    }
});

// Get asset by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT a.*, s.name as site_name 
       FROM assets a 
       LEFT JOIN sites s ON a.site_id = s.id 
       WHERE a.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        res.json({ asset: result.rows[0] });
    } catch (error: any) {
        console.error('Get asset error:', error);
        res.status(500).json({ error: 'Failed to get asset' });
    }
});

// Create asset (Admin or Surveyor)
router.post('/', authenticate, authorize('admin', 'surveyor'), async (req: AuthRequest, res: Response) => {
    try {
        const { siteId, refCode, name, serviceLine, floor, area, age, description } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Asset name is required' });
        }

        const result = await pool.query(
            `INSERT INTO assets (site_id, ref_code, name, service_line, floor, area, age, description) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
            [siteId, refCode, name, serviceLine, floor, area, age, description]
        );

        res.status(201).json({
            message: 'Asset created successfully',
            asset: result.rows[0]
        });
    } catch (error: any) {
        console.error('Create asset error:', error);
        res.status(500).json({ error: 'Failed to create asset' });
    }
});

// Bulk import assets (Admin or Surveyor)
router.post('/bulk-import', authenticate, authorize('admin', 'surveyor'), async (req: AuthRequest, res: Response) => {
    try {
        const { siteId, assets } = req.body;

        if (!siteId || !assets || !Array.isArray(assets)) {
            return res.status(400).json({ error: 'Site ID and assets array required' });
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const insertedAssets = [];

            for (const asset of assets) {
                const result = await client.query(
                    `INSERT INTO assets (site_id, ref_code, name, service_line, floor, area, age, description) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
           RETURNING *`,
                    [
                        siteId,
                        asset.refCode || asset.ref_code,
                        asset.name,
                        asset.serviceLine || asset.service_line,
                        asset.floor,
                        asset.area,
                        asset.age,
                        asset.description
                    ]
                );

                insertedAssets.push(result.rows[0]);
            }

            await client.query('COMMIT');

            res.status(201).json({
                message: `${insertedAssets.length} assets imported successfully`,
                assets: insertedAssets
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error: any) {
        console.error('Bulk import error:', error);
        res.status(500).json({ error: 'Failed to import assets' });
    }
});

// Update asset (Admin or Surveyor)
router.put('/:id', authenticate, authorize('admin', 'surveyor'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { refCode, name, serviceLine, floor, area, age, description } = req.body;

        const result = await pool.query(
            `UPDATE assets 
       SET ref_code = COALESCE($1, ref_code),
           name = COALESCE($2, name),
           service_line = COALESCE($3, service_line),
           floor = COALESCE($4, floor),
           area = COALESCE($5, area),
           age = COALESCE($6, age),
           description = COALESCE($7, description)
       WHERE id = $8
       RETURNING *`,
            [refCode, name, serviceLine, floor, area, age, description, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        res.json({
            message: 'Asset updated successfully',
            asset: result.rows[0]
        });
    } catch (error: any) {
        console.error('Update asset error:', error);
        res.status(500).json({ error: 'Failed to update asset' });
    }
});

// Delete asset (Admin or Surveyor)
router.delete('/:id', authenticate, authorize('admin', 'surveyor'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM assets WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        res.json({ message: 'Asset deleted successfully' });
    } catch (error: any) {
        console.error('Delete asset error:', error);
        res.status(500).json({ error: 'Failed to delete asset' });
    }
});

export default router;
