import { Router, Response } from 'express';
import pool from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import {
    isValidUUID,
    VALID_TRADES,
    VALID_SURVEY_STATUSES,
    VALID_CONDITION_RATINGS,
    VALID_OVERALL_CONDITIONS,
    BATCH_LIMIT,
} from '../utils/validation.utils';

const router = Router();

// Batch upload surveys
router.post('/batch/surveys', authenticate, async (req: AuthRequest, res: Response) => {
    const client = await pool.connect();
    try {
        const { surveys } = req.body;

        if (!Array.isArray(surveys) || surveys.length === 0) {
            return res.status(400).json({ error: 'surveys array is required' });
        }
        if (surveys.length > BATCH_LIMIT) {
            return res.status(400).json({ error: `Cannot batch more than ${BATCH_LIMIT} surveys at once` });
        }

        // Validate all items upfront — fail fast before touching the DB
        const errors: string[] = [];
        for (let i = 0; i < surveys.length; i++) {
            const { localId, siteId, trade, status } = surveys[i];
            if (!isValidUUID(localId)) errors.push(`surveys[${i}].localId: invalid UUID`);
            if (!isValidUUID(siteId)) errors.push(`surveys[${i}].siteId: invalid UUID`);
            if (trade !== undefined && trade !== null && !VALID_TRADES.has(String(trade).toUpperCase()))
                errors.push(`surveys[${i}].trade: must be one of ${[...VALID_TRADES].join(', ')}`);
            if (status !== undefined && status !== null && !VALID_SURVEY_STATUSES.has(status))
                errors.push(`surveys[${i}].status: must be one of ${[...VALID_SURVEY_STATUSES].join(', ')}`);
        }
        if (errors.length > 0) {
            return res.status(400).json({ error: 'Validation failed', details: errors });
        }

        await client.query('BEGIN');

        const results = [];
        for (const survey of surveys) {
            const { localId, siteId, trade, location, status, submittedAt } = survey;

            const existing = await client.query(
                'SELECT id, status FROM surveys WHERE id = $1',
                [localId]
            );

            if (existing.rows.length > 0) {
                const isLocked = existing.rows[0].status === 'approved' || existing.rows[0].status === 'completed';
                if (isLocked && req.user!.role !== 'admin') {
                    // Locked. Return synced: true to clear client sync queue.
                    results.push({ localId, serverId: existing.rows[0].id, synced: true });
                    continue;
                }
            }

            const result = await (existing.rows.length > 0
                ? client.query(
                    `UPDATE surveys
                     SET site_id = $1, trade = $2, location = $3, status = $4, submitted_at = $5, updated_at = NOW()
                     WHERE id = $6
                     RETURNING *`,
                    [siteId, trade, location, status, submittedAt, localId]
                )
                : client.query(
                    `INSERT INTO surveys (id, site_id, surveyor_id, trade, location, status, submitted_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)
                     RETURNING *`,
                    [localId, siteId, req.user!.userId, trade, location, status, submittedAt]
                ));

            results.push({
                localId,
                serverId: result.rows[0].id,
                synced: true
            });
        }

        await client.query('COMMIT');
        res.json({ message: 'Surveys synced successfully', results });
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
        if (inspections.length > BATCH_LIMIT) {
            return res.status(400).json({ error: `Cannot batch more than ${BATCH_LIMIT} inspections at once` });
        }

        // Validate all items upfront
        const errors: string[] = [];
        for (let i = 0; i < inspections.length; i++) {
            const { localId, surveyId, assetId, conditionRating, overallCondition } = inspections[i];
            if (!isValidUUID(localId)) errors.push(`inspections[${i}].localId: invalid UUID`);
            if (!isValidUUID(surveyId)) errors.push(`inspections[${i}].surveyId: invalid UUID`);
            if (!isValidUUID(assetId)) errors.push(`inspections[${i}].assetId: invalid UUID`);
            if (conditionRating !== undefined && conditionRating !== null && !VALID_CONDITION_RATINGS.has(conditionRating))
                errors.push(`inspections[${i}].conditionRating: invalid value`);
            if (overallCondition !== undefined && overallCondition !== null && !VALID_OVERALL_CONDITIONS.has(overallCondition))
                errors.push(`inspections[${i}].overallCondition: invalid value`);
        }
        if (errors.length > 0) {
            return res.status(400).json({ error: 'Validation failed', details: errors });
        }

        await client.query('BEGIN');

        const results = [];
        for (const inspection of inspections) {
            const {
                localId, surveyId, assetId,
                conditionRating, overallCondition,
                quantityInstalled, quantityWorking,
                remarks, gpsLat, gpsLng
            } = inspection;

            const existing = await client.query(
                'SELECT id FROM asset_inspections WHERE id = $1',
                [localId]
            );

            const parentSurvey = await client.query(
                'SELECT status FROM surveys WHERE id = $1',
                [surveyId]
            );
            if (parentSurvey.rows.length > 0) {
                const isLocked = parentSurvey.rows[0].status === 'approved' || parentSurvey.rows[0].status === 'completed';
                if (isLocked && req.user!.role !== 'admin') {
                    // Locked. Return synced: true to clear client sync queue.
                    results.push({ localId, serverId: existing.rows.length > 0 ? existing.rows[0].id : localId, synced: true });
                    continue;
                }
            }

            const result = await (existing.rows.length > 0
                ? client.query(
                    `UPDATE asset_inspections
                     SET condition_rating = $1, overall_condition = $2,
                         quantity_installed = $3, quantity_working = $4,
                         remarks = $5, gps_lat = $6, gps_lng = $7, updated_at = NOW()
                     WHERE id = $8
                     RETURNING *`,
                    [conditionRating, overallCondition, quantityInstalled, quantityWorking,
                        remarks, gpsLat, gpsLng, localId]
                )
                : client.query(
                    `INSERT INTO asset_inspections (
                        id, survey_id, asset_id, condition_rating, overall_condition,
                        quantity_installed, quantity_working, remarks, gps_lat, gps_lng
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    RETURNING *`,
                    [localId, surveyId, assetId, conditionRating, overallCondition,
                        quantityInstalled, quantityWorking, remarks, gpsLat, gpsLng]
                ));

            results.push({
                localId,
                serverId: result.rows[0].id,
                synced: true
            });
        }

        await client.query('COMMIT');
        res.json({ message: 'Inspections synced successfully', results });
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

        // Count pending surveys (submitted by anyone but not yet reviewed/synced further, depending on business logic - currently just counting all submitted globally)
        const surveysResult = await pool.query(
            'SELECT COUNT(*) FROM surveys WHERE status = $1',
            ['submitted']
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
        // Coerce to string — Express 5 types req.query values as string | string[] | ParsedQs | ParsedQs[]
        const lastSync = typeof req.query.lastSync === 'string' ? req.query.lastSync : undefined;
        if (lastSync !== undefined && isNaN(Date.parse(lastSync))) {
            return res.status(400).json({ error: 'Invalid lastSync: must be an ISO date string' });
        }

        // Get sites
        const sitesResult = await pool.query(
            lastSync ? 'SELECT * FROM sites WHERE updated_at > $1' : 'SELECT * FROM sites',
            lastSync ? [lastSync] : []
        );

        // Get assets
        const assetsResult = await pool.query(
            lastSync ? 'SELECT * FROM assets WHERE updated_at > $1' : 'SELECT * FROM assets',
            lastSync ? [lastSync] : []
        );

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
        // Frontend sends: { type, status, details }
        // DB expects: sync_type IN ('upload','download'), status IN ('pending','success','failed')
        const { type, status, details, deviceId, syncType, entityType, entityId, errorMessage } = req.body;

        // Map sync_type — accept either 'syncType' (old) or 'type' (new frontend format)
        const rawType = syncType || type || 'upload';
        const dbSyncType = ['upload', 'download'].includes(rawType) ? rawType : 'upload';

        // Map status to allowed DB values
        const rawStatus = status || 'pending';
        let dbStatus: string;
        if (rawStatus === 'completed' || rawStatus === 'success') {
            dbStatus = 'success';
        } else if (rawStatus === 'failed' || rawStatus === 'error') {
            dbStatus = 'failed';
        } else {
            dbStatus = 'pending'; // 'started', 'in_progress', etc.
        }

        // Combine details/errorMessage into error_message field
        const dbErrorMessage = errorMessage || (details ? JSON.stringify(details) : null);

        await pool.query(
            `INSERT INTO sync_log (user_id, device_id, sync_type, entity_type, entity_id, status, error_message)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [req.user!.userId, deviceId || null, dbSyncType, entityType || null, entityId || null, dbStatus, dbErrorMessage]
        );

        res.json({ message: 'Sync event logged' });
    } catch (error: any) {
        console.error('Log sync error:', error);
        res.status(500).json({ error: 'Failed to log sync event' });
    }
});

export default router;
