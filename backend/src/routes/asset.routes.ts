import { Router, Response } from 'express';
import pool from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import multer from 'multer';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { resolveField } from '../utils/transform.utils';
import { isValidUUID } from '../utils/validation.utils';

const BULK_IMPORT_LIMIT = 1000000; // Increased significantly per user request

interface ExcelAssetRow {
    site_id: string;
    ref_code: string;
    name: string;
    service_line: string;
    description: string;
    status: string;
    asset_tag: string;
    zone: string;
    building: string;
    location: string;
}

const router = Router();

// Configure multer for Excel file uploads
const excelStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/excel');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'assets-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const excelUpload = multer({
    storage: excelStorage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (_req, file, cb) => {
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

// Import Excel file (Admin or Surveyor) - Moved to top to ensure priority
router.post('/import-excel', authenticate, authorize('admin', 'surveyor'), excelUpload.single('file'), async (req: AuthRequest, res: Response) => {
    console.log('[AssetRoutes] POST /import-excel hit');
    console.log('[AssetRoutes] Content-Type:', req.headers['content-type']);
    console.log('[AssetRoutes] req.file:', req.file);
    console.log('[AssetRoutes] req.body keys:', Object.keys(req.body || {}));

    let filePath: string | undefined;

    try {
        if (!req.file) {
            console.error('[AssetRoutes] No file uploaded - multer did not parse a file');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { siteId } = req.body;
        console.log(`[AssetRoutes] Import for siteId: ${siteId}`);

        if (!siteId) {
            return res.status(400).json({ error: 'Site ID is required' });
        }

        filePath = req.file.path;
        console.log(`[AssetRoutes] File saved at: ${filePath}`);

        // Read Excel file
        const workbook = XLSX.readFile(filePath);

        const ALLOWED_SHEETS = ['MECHANICAL', 'FLS', 'ELECTRICAL', 'CIVIL', 'PLUMBING', 'HVAC'];
        const assetsToInsert: ExcelAssetRow[] = [];
        const summary: string[] = [];

        // Process sheets
        for (const sheetName of workbook.SheetNames) {
            const normalizedSheetName = sheetName.trim().toUpperCase();
            if (!ALLOWED_SHEETS.includes(normalizedSheetName)) {
                continue;
            }

            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) continue;

            let sheetCount = 0;
            // Helper to get value case-insensitively
            const getValue = (row: any, keys: string[]) => {
                const rowKeys = Object.keys(row);
                for (const key of keys) {
                    const foundKey = rowKeys.find(k => k.trim().toLowerCase() === key.toLowerCase());
                    if (foundKey) return row[foundKey];
                }
                return undefined;
            };

            for (const rowItem of jsonData) {
                const row = rowItem as any;

                // Strict Mapping per User Request
                assetsToInsert.push({
                    site_id: siteId,
                    ref_code: getValue(row, ['Asset Code']) || '',
                    name: getValue(row, ['Asset Description']) || 'Unknown Asset',
                    service_line: getValue(row, ['Asset System']) || 'General',
                    description: getValue(row, ['Asset Description']) || '',
                    status: getValue(row, ['Asset Status']) || 'Active',
                    asset_tag: getValue(row, ['Asset Tag']) || '',
                    zone: getValue(row, ['Zone']) || '',
                    building: getValue(row, ['Building']) || '',
                    location: getValue(row, ['Location']) || ''
                });
                sheetCount++;
            }
            summary.push(`${sheetName}: ${sheetCount}`);
        }

        if (assetsToInsert.length === 0) {
            return res.status(400).json({ error: 'No valid assets found in allowed sheets' });
        }

        // Bulk Insert to DB using unnest — single query for all rows (10-100x faster than a loop)
        const client = await pool.connect();
        let insertedCount = 0;

        try {
            await client.query('BEGIN');

            const siteIds = assetsToInsert.map(a => a.site_id);
            const refCodes = assetsToInsert.map(a => a.ref_code);
            const names = assetsToInsert.map(a => a.name);
            const svcLines = assetsToInsert.map(a => a.service_line);
            const descs = assetsToInsert.map(a => a.description);
            const statuses = assetsToInsert.map(a => a.status);
            const assetTags = assetsToInsert.map(a => a.asset_tag);
            const zones = assetsToInsert.map(a => a.zone);
            const buildings = assetsToInsert.map(a => a.building);
            const locations = assetsToInsert.map(a => a.location);

            const result = await client.query(
                `INSERT INTO assets (site_id, ref_code, name, service_line, description, status, asset_tag, building, location)
                 SELECT UNNEST($1::uuid[]), UNNEST($2::text[]), UNNEST($3::text[]), UNNEST($4::text[]),
                        UNNEST($5::text[]), UNNEST($6::text[]), UNNEST($7::text[]), UNNEST($8::text[]), UNNEST($9::text[])
                 RETURNING id`,
                [siteIds, refCodes, names, svcLines, descs, statuses, assetTags, buildings, locations]
            );

            insertedCount = result.rowCount ?? 0;
            await client.query('COMMIT');
        } catch (dbError) {
            await client.query('ROLLBACK');
            throw dbError;
        } finally {
            client.release();
        }

        console.log(`[AssetRoutes] Import success: ${insertedCount} assets`);
        res.status(201).json({
            message: 'Import successful',
            count: insertedCount,
            summary
        });

    } catch (error: any) {
        console.error('Excel import error:', error);
        res.status(500).json({ error: 'Failed to process Excel file' });
    } finally {
        // Ensure file is always cleaned up, regardless of success or failure
        if (filePath && fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
                console.log(`[AssetRoutes] Cleaned up file: ${filePath}`);
            } catch (cleanupError) {
                console.error(`[AssetRoutes] Failed to clean up file: ${filePath}`, cleanupError);
            }
        }
    }
});

// Get all assets (with optional site filter)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const siteId = typeof req.query.siteId === 'string' ? req.query.siteId : undefined;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : null;
        const offset = parseInt(req.query.offset as string) || 0;
        const since = typeof req.query.since === 'string' ? req.query.since : undefined;

        let query = `
      SELECT a.*, s.name as site_name
      FROM assets a
      LEFT JOIN sites s ON a.site_id = s.id
      WHERE 1=1
    `;
        const params: (string | number)[] = [];
        let paramIdx = 1;

        if (siteId) {
            if (!isValidUUID(siteId)) {
                return res.status(400).json({ error: 'Invalid site ID format' });
            }
            query += ` AND a.site_id = $${paramIdx++}`;
            params.push(siteId);
        }

        if (since) {
            query += ` AND a.updated_at > $${paramIdx++}`;
            params.push(since);
        }

        if (limit) {
            query += ` ORDER BY a.updated_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx}`;
            params.push(limit, offset);
        } else {
            query += ` ORDER BY a.updated_at DESC`;
        }

        const result = await pool.query(query, params);

        res.json({ assets: result.rows, limit, offset });
    } catch (error: unknown) {
        console.error('Get assets error:', error);
        res.status(500).json({ error: 'Failed to get assets' });
    }
});

// Get asset by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        if (!isValidUUID(id)) {
            return res.status(400).json({ error: 'Invalid asset ID format' });
        }

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
        const { siteId, refCode, name, serviceLine, status, assetTag, zone, building, location, floor, area, age, description } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 255) {
            return res.status(400).json({ error: 'Asset name is required (max 255 chars)' });
        }
        if (siteId && !isValidUUID(siteId)) {
            return res.status(400).json({ error: 'Invalid site ID format' });
        }

        const result = await pool.query(
            `INSERT INTO assets (site_id, ref_code, name, service_line, status, asset_tag, building, location, floor, area, age, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
            [siteId, refCode, name, serviceLine, status, assetTag, building, location, floor, area, age, description]
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
        if (!isValidUUID(siteId)) {
            return res.status(400).json({ error: 'Invalid site ID format' });
        }
        if (assets.length > BULK_IMPORT_LIMIT) {
            return res.status(400).json({ error: `Cannot import more than ${BULK_IMPORT_LIMIT} assets at once` });
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const siteIds = assets.map(() => siteId);
            const refCodes = assets.map((a: any) => resolveField(a, 'refCode') ?? '');
            const names = assets.map((a: any) => resolveField(a, 'name') ?? '');
            const svcLines = assets.map((a: any) => resolveField(a, 'serviceLine') ?? '');
            const floors = assets.map((a: any) => resolveField(a, 'floor') ?? '');
            const areas = assets.map((a: any) => resolveField(a, 'area') ?? '');
            const ages = assets.map((a: any) => resolveField(a, 'age') ?? '');
            const descs = assets.map((a: any) => resolveField(a, 'description') ?? '');

            const result = await client.query(
                `INSERT INTO assets (site_id, ref_code, name, service_line, floor, area, age, description)
                 SELECT UNNEST($1::uuid[]), UNNEST($2::text[]), UNNEST($3::text[]), UNNEST($4::text[]),
                        UNNEST($5::text[]), UNNEST($6::text[]), UNNEST($7::text[]), UNNEST($8::text[])
                 RETURNING *`,
                [siteIds, refCodes, names, svcLines, floors, areas, ages, descs]
            );

            await client.query('COMMIT');

            res.status(201).json({
                message: `${result.rowCount ?? 0} assets imported successfully`,
                assets: result.rows
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
        if (!isValidUUID(id)) {
            return res.status(400).json({ error: 'Invalid asset ID format' });
        }
        const { refCode, name, serviceLine, status, assetTag, zone, building, location, floor, area, age, description } = req.body;

        const result = await pool.query(
            `UPDATE assets
       SET ref_code = COALESCE($1, ref_code),
           name = COALESCE($2, name),
           service_line = COALESCE($3, service_line),
           status = COALESCE($4, status),
           asset_tag = COALESCE($5, asset_tag),
           building = COALESCE($6, building),
           location = COALESCE($7, location),
           floor = COALESCE($8, floor),
           area = COALESCE($9, area),
           age = COALESCE($10, age),
           description = COALESCE($11, description),
           updated_at = NOW()
       WHERE id = $12
       RETURNING *`,
            [refCode, name, serviceLine, status, assetTag, building, location, floor, area, age, description, id]
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
        if (!isValidUUID(id)) {
            return res.status(400).json({ error: 'Invalid asset ID format' });
        }

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
