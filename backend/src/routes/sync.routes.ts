import { Router, Response } from 'express';
import pool from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Batch upload surveys
router.post('/batch/surveys', authenticate, async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();
    try {
        const { surveys } = req.body;

        if (!Array.isArray(surveys) || surveys.length === 0) {
            return res.status(400).json({ error: 'surveys array is required' });
        }

        await client.query('BEGIN');

        const results = [];
        for (const survey of surveys) {
            const { localId, siteId, trade, status, submittedAt } = survey;

            // Check if survey with this local ID was already synced
            const existing = await client.query(
                'SELECT id FROM surveys WHERE id = $1',
                [localId]
            );

            let result;
            if (existing.rows.length > 0) {
                // Update existing
                result = await client.query(
                    `UPDATE surveys
                     SET site_id = $1, trade = $2, status = $3, submitted_at = $4, updated_at = NOW()
                     WHERE id = $5
                     RETURNING *`,
                    [siteId, trade, status, submittedAt, localId]
                );
            } else {
                // Insert new with the local ID as server ID (to maintain consistency)
                result = await client.query(
                    `INSERT INTO surveys (id, site_id, surveyor_id, trade, status, submitted_at)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     RETURNING *`,
                    [localId, siteId, req.user!.userId, trade, status, submittedAt]
                );
            }

            results.push({
                localId,
                serverId: result.rows[0].id,
                synced: true
            });
        }

        await client.query('COMMIT');

        res.json({
            message: 'Surveys synced successfully',
            results
        });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Batch sync surveys error:', error);
        res.status(500).json({ error: 'Failed to sync surveys' });
    } finally {
        client.release();
    }
});

// Batch upload inspections
router.post('/batch/inspections', authenticate, async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();
    try {
        const { inspections } = req.body;

        if (!Array.isArray(inspections) || inspections.length === 0) {
            return res.status(400).json({ error: 'inspections array is required' });
        }

        await client.query('BEGIN');

        const results = [];
        for (const inspection of inspections) {
            const {
                localId,
                surveyId,
                assetId,
                conditionRating,
                overallCondition,
                quantityInstalled,
                quantityWorking,
                remarks,
                gpsLat,
                gpsLng
            } = inspection;

            // Check if inspection already exists
            const existing = await client.query(
                'SELECT id FROM asset_inspections WHERE id = $1',
                [localId]
            );

            let result;
            if (existing.rows.length > 0) {
                // Update existing
                result = await client.query(
                    `UPDATE asset_inspections
                     SET condition_rating = $1, overall_condition = $2,
                         quantity_installed = $3, quantity_working = $4,
                         remarks = $5, gps_lat = $6, gps_lng = $7, updated_at = NOW()
                     WHERE id = $8
                     RETURNING *`,
                    [conditionRating, overallCondition, quantityInstalled, quantityWorking,
                        remarks, gpsLat, gpsLng, localId]
                );
            } else {
                // Insert new
                result = await client.query(
                    `INSERT INTO asset_inspections (
                        id, survey_id, asset_id, condition_rating, overall_condition,
                        quantity_installed, quantity_working, remarks, gps_lat, gps_lng
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    RETURNING *`,
                    [localId, surveyId, assetId, conditionRating, overallCondition,
                        quantityInstalled, quantityWorking, remarks, gpsLat, gpsLng]
                );
            }

            results.push({
                localId,
                serverId: result.rows[0].id,
                synced: true
            });
        }

        await client.query('COMMIT');

        res.json({
            message: 'Inspections synced successfully',
            results
        });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Batch sync inspections error:', error);
        res.status(500).json({ error: 'Failed to sync inspections' });
    } finally {
        client.release();
    }
});

// Get sync status
router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;

        // Count pending surveys (submitted but not from this user's recent syncs)
        const surveysResult = await pool.query(
            'SELECT COUNT(*) FROM surveys WHERE surveyor_id = $1 AND status = $2',
            [userId, 'submitted']
        );

        // Get last sync time from sync_log
        const lastSyncResult = await pool.query(
            'SELECT MAX(synced_at) as last_sync FROM sync_log WHERE user_id = $1',
            [userId]
        );

        res.json({
            pendingSurveys: parseInt(surveysResult.rows[0].count),
            lastSync: lastSyncResult.rows[0]?.last_sync,
            serverTime: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('Get sync status error:', error);
        res.status(500).json({ error: 'Failed to get sync status' });
    }
});

// Download updates (sites and assets for offline use)
router.get('/download', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { lastSync } = req.query;

        // Get sites
        const sitesQuery = lastSync
            ? 'SELECT * FROM sites WHERE updated_at > $1'
            : 'SELECT * FROM sites';
        const sitesParams = lastSync ? [lastSync] : [];
        const sitesResult = await pool.query(sitesQuery, sitesParams);

        // Get assets
        const assetsQuery = lastSync
            ? 'SELECT * FROM assets WHERE updated_at > $1'
            : 'SELECT * FROM assets';
        const assetsParams = lastSync ? [lastSync] : [];
        const assetsResult = await pool.query(assetsQuery, assetsParams);

        res.json({
            sites: sitesResult.rows,
            assets: assetsResult.rows,
            syncedAt: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('Download updates error:', error);
        res.status(500).json({ error: 'Failed to download updates' });
    }
});

// Log sync event
router.post('/log', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { deviceId, syncType, entityType, entityId, status, errorMessage } = req.body;

        // Map status to allowed values if needed
        let dbStatus = status;
        if (status === 'started' || status === 'in_progress') {
            dbStatus = 'pending';
        }

        await pool.query(
            `INSERT INTO sync_log (user_id, device_id, sync_type, entity_type, entity_id, status, error_message)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [req.user!.userId, deviceId, syncType, entityType, entityId, dbStatus, errorMessage]
        );

        res.json({ message: 'Sync event logged' });
    } catch (error: any) {
        console.error('Log sync error:', error);
        res.status(500).json({ error: 'Failed to log sync event' });
    }
});

export default router;
