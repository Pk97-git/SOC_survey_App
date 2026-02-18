import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pool from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = process.env.UPLOAD_DIR || './uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
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
            // Clean up uploaded file
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Asset inspection ID and survey ID are required' });
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
    } catch (error: any) {
        console.error('Upload photo error:', error);
        // Clean up file on error
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

        const result = await pool.query(
            'SELECT * FROM photos WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Photo not found' });
        }

        const photo = result.rows[0];

        if (!fs.existsSync(photo.file_path)) {
            return res.status(404).json({ error: 'Photo file not found on server' });
        }

        res.sendFile(path.resolve(photo.file_path));
    } catch (error: any) {
        console.error('Get photo error:', error);
        res.status(500).json({ error: 'Failed to get photo' });
    }
});

// Get photos for an inspection
router.get('/inspection/:inspectionId', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { inspectionId } = req.params;

        const result = await pool.query(
            'SELECT * FROM photos WHERE asset_inspection_id = $1 ORDER BY uploaded_at ASC',
            [inspectionId]
        );

        res.json({ photos: result.rows });
    } catch (error: any) {
        console.error('Get inspection photos error:', error);
        res.status(500).json({ error: 'Failed to get photos' });
    }
});

// Delete photo
router.delete('/:id', authenticate, authorize('surveyor', 'admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user!;

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

        const photo = photoCheck.rows[0];

        // Authorization check: Admin can always delete
        // Unassigned survey photos (surveyor_id IS NULL) — admin only
        // Assigned survey photos — admin or the owning surveyor
        const isAdmin = user.role === 'admin';
        const isOwner = photo.surveyor_id && photo.surveyor_id === user.userId;
        if (!isAdmin && !isOwner) {
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
    } catch (error: any) {
        console.error('Delete photo error:', error);
        res.status(500).json({ error: 'Failed to delete photo' });
    }
});

export default router;
