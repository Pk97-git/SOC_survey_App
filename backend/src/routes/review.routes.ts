import { Router, Response } from 'express';
import pool from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Get surveys assigned to reviewer
router.get('/assigned', authenticate, authorize('reviewer'), async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;

        const result = await pool.query(
            `SELECT s.*, sa.reviewer_type, sa.status as assignment_status
       FROM surveys s
       JOIN survey_assignments sa ON s.id = sa.survey_id
       WHERE sa.reviewer_id = $1
       ORDER BY s.submitted_at DESC`,
            [userId]
        );

        res.json({ surveys: result.rows });
    } catch (error: any) {
        console.error('Get assigned surveys error:', error);
        res.status(500).json({ error: 'Failed to get assigned surveys' });
    }
});

// Add review comments for a survey
router.post('/:surveyId', authenticate, authorize('reviewer'), async (req: AuthRequest, res: Response) => {
    try {
        const { surveyId } = req.params;
        const { assetInspectionId, comments, photos, reviewerType } = req.body;
        const reviewerId = req.user?.userId;

        const result = await pool.query(
            `INSERT INTO review_comments (asset_inspection_id, reviewer_id, reviewer_type, comments, photos)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [assetInspectionId, reviewerId, reviewerType, comments, JSON.stringify(photos || [])]
        );

        res.json({ review: result.rows[0] });
    } catch (error: any) {
        console.error('Post review error:', error);
        res.status(500).json({ error: 'Failed to save review' });
    }
});

// Bulk submit/update review comments
router.post('/:surveyId/bulk', authenticate, authorize('reviewer'), async (req: AuthRequest, res: Response) => {
    try {
        const { reviews } = req.body;
        const reviewerId = req.user?.userId;

        if (!Array.isArray(reviews)) {
            return res.status(400).json({ error: 'reviews array is required' });
        }

        // We will process them sequentially to avoid complex UPSERT syntax without strict constraints
        for (const review of reviews) {
            const { inspectionId, notes, reviewerRole, photos } = review;

            // 1. Check if a review already exists for this inspection + reviewer
            const existing = await pool.query(
                `SELECT id FROM review_comments 
                 WHERE asset_inspection_id = $1 AND reviewer_id = $2`,
                [inspectionId, reviewerId]
            );

            if (existing.rows.length > 0) {
                // Update
                await pool.query(
                    `UPDATE review_comments 
                     SET comments = $1, reviewer_type = $2, updated_at = NOW() 
                     WHERE id = $3`,
                    [notes, reviewerRole, existing.rows[0].id]
                );
            } else {
                // Insert
                await pool.query(
                    `INSERT INTO review_comments (asset_inspection_id, reviewer_id, reviewer_type, comments)
                     VALUES ($1, $2, $3, $4)`,
                    [inspectionId, reviewerId, reviewerRole, notes]
                );
            }
        }

        res.json({ message: 'Bulk reviews saved successfully' });
    } catch (error: any) {
        console.error("Bulk review error:", error);
        res.status(500).json({ error: 'Failed to save bulk reviews' });
    }
});

// Update review comments
router.put('/:id', authenticate, authorize('reviewer'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { comments, photos } = req.body;

        const result = await pool.query(
            `UPDATE review_comments
       SET comments = $1, photos = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
            [comments, JSON.stringify(photos || []), id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Review not found' });
        }

        res.json({ review: result.rows[0] });
    } catch (error: any) {
        console.error('Update review error:', error);
        res.status(500).json({ error: 'Failed to update review' });
    }
});

// Get all reviews for a survey
router.get('/:surveyId', authenticate, authorize('reviewer', 'admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { surveyId } = req.params;

        const result = await pool.query(
            `SELECT rc.*, ai.asset_id, u.full_name as reviewer_name
       FROM review_comments rc
       JOIN asset_inspections ai ON rc.asset_inspection_id = ai.id
       JOIN users u ON rc.reviewer_id = u.id
       WHERE ai.survey_id = $1
       ORDER BY rc.created_at DESC`,
            [surveyId]
        );

        res.json({ reviews: result.rows });
    } catch (error: any) {
        console.error('Get survey reviews error:', error);
        res.status(500).json({ error: 'Failed to get reviews' });
    }
});

export default router;
