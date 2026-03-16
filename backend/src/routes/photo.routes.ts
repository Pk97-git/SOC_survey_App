import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pool from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { isValidUUID } from '../utils/validation.utils';

const router = Router();

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        const uploadDir = process.env.UPLOAD_DIR || './uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default
    },
    fileFilter: (_req, file, cb) => {
        const allowedExts = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
        const allowedMimes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
        const ext = path.extname(file.originalname).toLowerCase();

        if (allowedExts.has(ext) && allowedMimes.has(file.mimetype)) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Upload photo
router.post('/upload', authenticate, authorize('surveyor'), upload.single('photo'), async (req: AuthRequest, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { assetInspectionId, surveyId, caption } = req.body;

        if (!assetInspectionId || !surveyId) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Asset inspection ID and survey ID are required' });
        }

        if (!isValidUUID(assetInspectionId) || !isValidUUID(surveyId)) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Invalid asset inspection ID or survey ID format' });
        }

        const result = await pool.query(
            `INSERT INTO photos (asset_inspection_id, survey_id, file_path, file_size, caption)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [assetInspectionId, surveyId, req.file.path, req.file.size, caption]
        );

        res.status(201).json({
            message: 'Photo uploaded successfully',
            photo: result.rows[0]
        });
    } catch (error: unknown) {
        console.error('Upload photo error:', error);
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Failed to upload photo' });
    }
});

// Get photo by ID (returns file)
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({ error: 'Invalid photo ID format' });
        }

        const result = await pool.query(
            'SELECT * FROM photos WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Photo not found' });
        }

        const photo = result.rows[0];

        const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
        const resolvedPath = path.resolve(photo.file_path);

        // Guard against path traversal: resolved path must be inside the upload directory
        if (!resolvedPath.startsWith(uploadDir + path.sep) && resolvedPath !== uploadDir) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!fs.existsSync(resolvedPath)) {
            return res.status(404).json({ error: 'Photo file not found on server' });
        }

        res.sendFile(resolvedPath);
    } catch (error: unknown) {
        console.error('Get photo error:', error);
        res.status(500).json({ error: 'Failed to get photo' });
    }
});

// Get photos for an inspection
router.get('/inspection/:inspectionId', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { inspectionId } = req.params;

        if (!isValidUUID(inspectionId)) {
            return res.status(400).json({ error: 'Invalid inspection ID format' });
        }

        const result = await pool.query(
            'SELECT * FROM photos WHERE asset_inspection_id = $1 ORDER BY uploaded_at ASC',
            [inspectionId]
        );

        res.json({ photos: result.rows });
    } catch (error: unknown) {
        console.error('Get inspection photos error:', error);
        res.status(500).json({ error: 'Failed to get photos' });
    }
});

// Delete photo
router.delete('/:id', authenticate, authorize('surveyor', 'admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user!;

        if (!isValidUUID(id)) {
            return res.status(400).json({ error: 'Invalid photo ID format' });
        }

        // Check ownership first
        const photoCheck = await pool.query(
            `SELECT p.file_path, s.surveyor_id
             FROM photos p
             JOIN surveys s ON p.survey_id = s.id
             WHERE p.id = $1`,
            [id]
        );

        if (photoCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Photo not found' });
        }

        // Authorization check: Admin and Surveyor can delete
        const isAdmin = user.role === 'admin';
        const isSurveyor = user.role === 'surveyor';
        if (!isAdmin && !isSurveyor) {
            return res.status(403).json({ error: 'You are not authorized to delete this photo' });
        }

        const result = await pool.query(
            'DELETE FROM photos WHERE id = $1 RETURNING file_path',
            [id]
        );

        // Delete file from filesystem
        const filePath = result.rows[0].file_path;
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.json({ message: 'Photo deleted successfully' });
    } catch (error: unknown) {
        console.error('Delete photo error:', error);
        res.status(500).json({ error: 'Failed to delete photo' });
    }
});

export default router;
