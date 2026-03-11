import { Router, Response } from 'express';
import pool from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Get dashboard statistics
router.get('/stats', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
    try {
        // Total surveys
        const totalSurveys = await pool.query('SELECT COUNT(*) FROM surveys');

        // Pending reviews
        const pendingReviews = await pool.query(
            "SELECT COUNT(*) FROM surveys WHERE status = 'submitted'"
        );

        // Active surveyors (logged in last 30 days)
        const activeSurveyors = await pool.query(
            `SELECT COUNT(*) FROM users 
       WHERE role = 'surveyor' 
       AND last_login > NOW() - INTERVAL '30 days'`
        );

        // Completed today
        const completedToday = await pool.query(
            `SELECT COUNT(*) FROM surveys 
       WHERE status = 'completed' 
       AND DATE(submitted_at) = CURRENT_DATE`
        );

        res.json({
            totalSurveys: parseInt(totalSurveys.rows[0].count),
            pendingReviews: parseInt(pendingReviews.rows[0].count),
            activeSurveyors: parseInt(activeSurveyors.rows[0].count),
            completedToday: parseInt(completedToday.rows[0].count),
        });
    } catch (error: any) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
});

// Get per-site survey status breakdown
router.get('/site-stats', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { siteId } = req.query;

        if (!siteId) {
            return res.status(400).json({ error: 'Site ID is required' });
        }

        const result = await pool.query(
            `SELECT 
                status,
                COUNT(*) as count
            FROM surveys
            WHERE site_id = $1
            GROUP BY status`,
            [siteId]
        );

        // Initialize all statuses with 0
        const statusCounts = {
            draft: 0,
            in_progress: 0,
            submitted: 0,
            under_review: 0,
            completed: 0,
            total: 0
        };

        // Fill in actual counts
        result.rows.forEach((row: any) => {
            statusCounts[row.status as keyof typeof statusCounts] = parseInt(row.count);
            statusCounts.total += parseInt(row.count);
        });

        res.json(statusCounts);
    } catch (error: any) {
        console.error('Site stats error:', error);
        res.status(500).json({ error: 'Failed to fetch site statistics' });
    }
});

// Get all surveys with filters (admin view)
router.get('/surveys', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { status, surveyorId, siteId, startDate, endDate } = req.query;

        let query = `
      SELECT s.*, u.full_name as surveyor_name, si.name as site_name
      FROM surveys s
      LEFT JOIN users u ON s.surveyor_id = u.id
      LEFT JOIN sites si ON s.site_id = si.id
      WHERE 1=1
    `;
        const params: any[] = [];
        let paramCount = 1;

        if (status) {
            query += ` AND s.status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }

        if (surveyorId) {
            query += ` AND s.surveyor_id = $${paramCount}`;
            params.push(surveyorId);
            paramCount++;
        }

        if (siteId) {
            query += ` AND s.site_id = $${paramCount}`;
            params.push(siteId);
            paramCount++;
        }

        if (startDate) {
            query += ` AND s.created_at >= $${paramCount}`;
            params.push(startDate);
            paramCount++;
        }

        if (endDate) {
            query += ` AND s.created_at <= $${paramCount}`;
            params.push(endDate);
            paramCount++;
        }

        query += ' ORDER BY s.created_at DESC';

        const result = await pool.query(query, params);
        res.json({ surveys: result.rows });
    } catch (error: any) {
        console.error('Dashboard surveys error:', error);
        res.status(500).json({ error: 'Failed to fetch surveys' });
    }
});

// Get user activity
router.get('/users', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.full_name, u.email, u.role, u.last_login,
              COUNT(s.id) as survey_count
       FROM users u
       LEFT JOIN surveys s ON u.id = s.surveyor_id
       GROUP BY u.id
       ORDER BY u.last_login DESC`
        );

        res.json({ users: result.rows });
    } catch (error: any) {
        console.error('Dashboard users error:', error);
        res.status(500).json({ error: 'Failed to fetch user activity' });
    }
});

export default router;
