import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Dynamic import for getDb to avoid loading SQLite on web
let getDbInstance: any = null;
const getDb = async () => {
    if (!getDbInstance) {
        const dbModule = await import('../db');
        getDbInstance = dbModule.getDb;
    }
    return getDbInstance();
};

export interface SurveyRecord {
    id: string;
    site_id?: string;        // Backend UUID — required for sync to work correctly
    site_name: string;
    trade?: string;
    location?: string;
    surveyor_id?: string;    // NULL = unassigned admin survey; set when surveyor claims it
    surveyor_name?: string;
    status: string;
    gps_lat?: number;
    gps_lng?: number;
    created_at: string;
    updated_at?: string;
    synced?: number;          // 0 = pending upload, 1 = synced with backend
    server_id?: string;       // Backend UUID if this was created locally and synced
    last_synced_at?: string;  // ISO timestamp of last successful sync
    sync_failed?: number;     // 1 = permanently failed (dead-letter), won't retry automatically
    sync_error?: string;      // Last error message for display
}

export interface SiteRecord {
    id: string;
    name: string;
    location?: string;
    client?: string;
    created_at: string;
}

export interface ResponseRecord {
    id: string;
    survey_id: string;
    question_id: string;
    answer: string;
    notes?: string;
}

// Helper for Web Storage
const WEB_SURVEYS_KEY = 'surveys_data';
const WEB_RESPONSES_KEY = 'responses_data';

export const storage = {
    async saveSurvey(survey: SurveyRecord) {
        if (Platform.OS === 'web' || isExpoGo) {
            // Upsert: replace existing survey with same id if it exists
            const existing = await this.getSurveys();
            const idx = existing.findIndex(s => s.id === survey.id);
            const surveyToSave = {
                ...survey,
                synced: survey.synced ?? 0,
                server_id: survey.server_id || undefined
            };
            if (idx >= 0) {
                existing[idx] = surveyToSave;
            } else {
                existing.unshift(surveyToSave);
            }
            await AsyncStorage.setItem(WEB_SURVEYS_KEY, JSON.stringify(existing));
        } else {
            const db = await getDb();
            // INSERT OR REPLACE handles upsert — critical for sync downloads which may re-save the same survey
            await db.runAsync(
                `INSERT OR REPLACE INTO surveys
                 (id, site_id, site_name, trade, location, surveyor_id, surveyor_name, status, gps_lat, gps_lng, created_at, updated_at, synced, server_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                survey.id,
                survey.site_id || null,
                survey.site_name || '',
                survey.trade || '',
                survey.location || '',
                survey.surveyor_id || null,
                survey.surveyor_name || '',
                survey.status,
                survey.gps_lat ? Number(survey.gps_lat) : null,
                survey.gps_lng ? Number(survey.gps_lng) : null,
                survey.created_at,
                survey.updated_at || survey.created_at,
                survey.synced ?? 0,
                survey.server_id || null
            );
        }
    },

    async saveResponses(responses: ResponseRecord[]) {
        if (Platform.OS === 'web' || isExpoGo) {
            const existingStr = await AsyncStorage.getItem(WEB_RESPONSES_KEY);
            const existing = existingStr ? JSON.parse(existingStr) : [];
            const updated = [...existing, ...responses];
            await AsyncStorage.setItem(WEB_RESPONSES_KEY, JSON.stringify(updated));
        } else {
            const db = await getDb();
            for (const r of responses) {
                await db.runAsync(
                    'INSERT INTO responses (id, survey_id, question_id, answer, notes) VALUES (?, ?, ?, ?, ?)',
                    r.id, r.survey_id, r.question_id, r.answer, r.notes || ''
                );
            }
        }
    },

    async getSurveys(siteId?: string): Promise<SurveyRecord[]> {
        if (Platform.OS === 'web' || isExpoGo) {
            try {
                const { surveysApi } = require('./api');
                return await surveysApi.getAll(siteId);
            } catch (e) {
                console.warn('Web fetch surveys failed, falling back to local:', e);
                const data = await AsyncStorage.getItem(WEB_SURVEYS_KEY);
                return data ? JSON.parse(data) : [];
            }
        } else {
            const db = await getDb();
            return await db.getAllAsync('SELECT * FROM surveys ORDER BY rowid DESC');
        }
    },

    /**
     * Finds the most recent updated_at timestamp across all local data for a site.
     * Used as the 'since' cursor for incremental sync.
     */
    async getSiteLastSyncTime(siteId: string): Promise<string | undefined> {
        if (Platform.OS === 'web' || isExpoGo) return undefined;

        try {
            const db = await getDb();
            // Get the max updated_at from both surveys and assets for this site
            const result = await db.getFirstAsync(`
                SELECT MAX(max_time) as last_sync FROM (
                    SELECT MAX(updated_at) as max_time FROM surveys WHERE site_id = ?
                    UNION ALL
                    SELECT MAX(updated_at) as max_time FROM assets WHERE site_id = ?
                )
            `, [siteId, siteId]);

            return (result as any)?.last_sync || undefined;
        } catch (e) {
            console.warn('Failed to get last sync time, defaulting to full sync', e);
            return undefined;
        }
    },

    async getSurveyById(id: string): Promise<SurveyRecord | null> {
        if (Platform.OS === 'web' || isExpoGo) {
            try {
                const { surveysApi } = require('./api');
                return await surveysApi.getById(id);
            } catch (e) {
                return null;
            }
        } else {
            const db = await getDb();
            const result = await db.getFirstAsync(
                'SELECT * FROM surveys WHERE id = ? LIMIT 1', [id]
            );
            return result || null;
        }
    },

    async getSurveysBySiteAndTrade(siteId: string, trade: string): Promise<SurveyRecord[]> {
        if (Platform.OS === 'web' || isExpoGo) {
            const surveys = await this.getSurveys(siteId);
            return surveys.filter(s =>
                s.site_id === siteId && (!trade || s.trade === trade)
            );
        } else {
            const db = await getDb();
            return await db.getAllAsync(
                'SELECT * FROM surveys WHERE site_id = ? AND trade = ? ORDER BY created_at DESC',
                [siteId, trade]
            );
        }
    },

    // For Excel Generation on Web (fetch all responses for a survey)
    async getResponsesForSurvey(surveyId: string): Promise<ResponseRecord[]> {
        if (Platform.OS === 'web' || isExpoGo) {
            const str = await AsyncStorage.getItem(WEB_RESPONSES_KEY);
            const all: ResponseRecord[] = str ? JSON.parse(str) : [];
            return all.filter(r => r.survey_id === surveyId);
        } else {
            const db = await getDb();
            return await db.getAllAsync('SELECT * FROM responses WHERE survey_id = ?', [surveyId]);
        }
    },

    // --- ASSETS ---
    async saveAsset(asset: any) {
        if (Platform.OS === 'web' || isExpoGo) {
            const existingStr = await AsyncStorage.getItem('assets_data');
            const existing: any[] = existingStr ? JSON.parse(existingStr) : [];
            const index = existing.findIndex(a => a.id === asset.id);
            if (index >= 0) {
                existing[index] = asset;
            } else {
                existing.unshift(asset);
            }
            await AsyncStorage.setItem('assets_data', JSON.stringify(existing));
        } else {
            const db = await getDb();
            // TODO: Update schema to match backend fields (service_line etc)
            // For now, assume backend fields are passed but only core ones saved?
            // Actually, we should save as JSON or update schema
            try {
                // Ensure GPS coordinates are proper numbers or null
                const lat = asset.location_lat || asset.gps_lat;
                const lng = asset.location_lng || asset.gps_lng;
                const safeLatValue = lat ? Number(lat) : null;
                const safeLngValue = lng ? Number(lng) : null;

                // Validate that numbers are actually numbers
                if (safeLatValue !== null && (isNaN(safeLatValue) || !isFinite(safeLatValue))) {
                    console.warn(`Invalid latitude for asset ${asset.id}: ${lat}`);
                }
                if (safeLngValue !== null && (isNaN(safeLngValue) || !isFinite(safeLngValue))) {
                    console.warn(`Invalid longitude for asset ${asset.id}: ${lng}`);
                }

                await db.runAsync(
                    `INSERT OR REPLACE INTO assets 
                    (id, name, type, project_site, site_name, service_line, location_lat, location_lng, description, zone, building, location) VALUES 
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    String(asset.id),
                    String(asset.name || ''),
                    String(asset.type || asset.service_line || ''),
                    String(asset.project_site || asset.site_id || asset.siteId || ''),
                    String(asset.site_name || asset.siteName || ''),
                    String(asset.service_line || asset.serviceLine || asset.type || ''),
                    safeLatValue,
                    safeLngValue,
                    String(asset.description || ''),
                    String(asset.zone || ''),
                    String(asset.building || ''),
                    String(asset.location || '')
                );
            } catch (e: any) {
                console.error('Failed to save asset natively:', e.message);
                console.error('Asset ID:', asset.id, 'Name:', asset.name);
                console.error('GPS values:', asset.location_lat, asset.gps_lat, asset.location_lng, asset.gps_lng);
                throw e; // Re-throw so sync service can catch it
            }
        }
    },

    async saveAssetsBulk(assets: any[]) {
        if (assets.length === 0) return;

        if (Platform.OS === 'web' || isExpoGo) {
            // localStorage is limited to ~5 MB. Asset registers with thousands of rows
            // blow past that limit and throw QuotaExceededError. On web the app always
            // fetches assets live from the API, so local caching is not needed.
            const WEB_CACHE_LIMIT = 500;
            if (assets.length > WEB_CACHE_LIMIT) {
                // Too large to safely cache — skip silently. Data will be fetched from API.
                return;
            }
            const existingStr = await AsyncStorage.getItem('assets_data');
            const existing: any[] = existingStr ? JSON.parse(existingStr) : [];
            const assetMap = new Map(existing.map(a => [a.id, a]));
            assets.forEach(a => assetMap.set(a.id, a));
            await AsyncStorage.setItem('assets_data', JSON.stringify(Array.from(assetMap.values())));
        } else {
            const db = await getDb();
            try {
                await db.withTransactionAsync(async () => {
                    for (const asset of assets) {
                        const lat = asset.location_lat || asset.gps_lat;
                        const lng = asset.location_lng || asset.gps_lng;
                        const safeLatValue = lat ? Number(lat) : null;
                        const safeLngValue = lng ? Number(lng) : null;

                        await db.runAsync(
                            `INSERT OR REPLACE INTO assets 
                            (id, name, type, project_site, site_name, service_line, location_lat, location_lng, description, zone, building, location) VALUES 
                            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            String(asset.id),
                            String(asset.name || ''),
                            String(asset.type || asset.service_line || ''),
                            String(asset.project_site || asset.site_id || asset.siteId || ''),
                            String(asset.site_name || asset.siteName || ''),
                            String(asset.service_line || asset.serviceLine || asset.type || ''),
                            safeLatValue,
                            safeLngValue,
                            String(asset.description || ''),
                            String(asset.zone || ''),
                            String(asset.building || ''),
                            String(asset.location || '')
                        );
                    }
                });
                console.log(`✅ Bulk saved ${assets.length} assets`);
            } catch (e: any) {
                console.error('Failed to bulk save assets:', e);
                throw e;
            }
        }
    },

    async getAssets(siteId?: string): Promise<any[]> {
        let assets: any[] = [];
        if (Platform.OS === 'web' || isExpoGo) {
            // Web ignores localStorage completely and makes a live API call
            try {
                // To avoid circular dependency, require it dynamically
                const { assetsApi } = require('./api');
                assets = await assetsApi.getAll(siteId);
                return assets; // API already filters by siteId if passed
            } catch (error) {
                console.warn('Web could not fetch assets, falling back to empty:', error);
                return [];
            }
        } else {
            const db = await getDb();
            assets = await db.getAllAsync('SELECT * FROM assets ORDER BY created_at DESC');
        }

        if (siteId) {
            // Check both project_site (ID) and legacy site_id
            return assets.filter(a =>
                a.project_site === siteId ||
                a.site_id === siteId ||
                a.siteId === siteId
            );
        }
        return assets;
    },

    // --- TEMPLATES ---
    async getTemplates(): Promise<any[]> {
        if (Platform.OS === 'web' || isExpoGo) {
            const str = await AsyncStorage.getItem('templates_data');
            return str ? JSON.parse(str) : [];
        } else {
            const db = await getDb();
            return await db.getAllAsync('SELECT * FROM templates ORDER BY created_at DESC');
        }
    },

    async getTemplate(templateId: string): Promise<any | null> {
        if (Platform.OS === 'web' || isExpoGo) {
            const templates = await this.getTemplates();
            return templates.find(t => t.id === templateId) || null;
        } else {
            const db = await getDb();
            return await db.getFirstAsync('SELECT * FROM templates WHERE id = ?', [templateId]);
        }
    },

    async saveTemplate(template: any) {
        if (Platform.OS === 'web' || isExpoGo) {
            const existing = await this.getTemplates();
            const index = existing.findIndex(t => t.id === template.id);
            if (index >= 0) {
                existing[index] = template;
            } else {
                existing.unshift(template);
            }
            await AsyncStorage.setItem('templates_data', JSON.stringify(existing));
        } else {
            const db = await getDb();
            // Upsert: try insert, if exists update
            await db.runAsync(
                'INSERT OR REPLACE INTO templates (id, name, file_path, parsed_structure_json, created_at) VALUES (?, ?, ?, ?, ?)',
                template.id, template.name, template.file_path || '', template.parsed_structure_json, template.created_at
            );
        }
    },

    async deleteTemplate(templateId: string) {
        if (Platform.OS === 'web' || isExpoGo) {
            const existing = await this.getTemplates();
            const filtered = existing.filter(t => t.id !== templateId);
            await AsyncStorage.setItem('templates_data', JSON.stringify(filtered));
        } else {
            const db = await getDb();
            await db.runAsync('DELETE FROM templates WHERE id = ?', [templateId]);
        }
    },

    // --- ASSET INSPECTIONS ---
    async saveAssetInspection(inspection: any) {
        if (Platform.OS === 'web' || isExpoGo) {
            const str = await AsyncStorage.getItem('asset_inspections_data');
            const inspections: any[] = str ? JSON.parse(str) : [];
            const index = inspections.findIndex(i => i.id === inspection.id);
            if (index >= 0) {
                inspections[index] = { ...inspections[index], ...inspection, synced: false };
            } else {
                inspections.push({ ...inspection, synced: false });
            }
            await AsyncStorage.setItem('asset_inspections_data', JSON.stringify(inspections));
        } else {
            const db = await getDb();
            try {
                // Determine status logic (simple version for now)
                let status = 'Good';
                const installed = inspection.quantity_installed ? Number(inspection.quantity_installed) : 0;
                const working = inspection.quantity_working ? Number(inspection.quantity_working) : 0;

                if (working < installed) status = 'Repair';
                if (working === 0 && installed > 0) status = 'Replace';

                // DEFENSIVE CODING: Ensure integer values are integers
                // The error "Loss of precision" happens when passing 5.88... to an INTEGER column.
                const safeInstalled = Math.round(installed);
                const safeWorking = Math.round(working);

                if (safeInstalled !== installed) {
                    console.warn(`[saveAssetInspection] Sanitized quantity_installed from ${installed} to ${safeInstalled}`);
                }

                console.log('[saveAssetInspection] Saving:', {
                    id: inspection.id,
                    asset_id: inspection.asset_id,
                    survey_id: inspection.survey_id,
                    installed: safeInstalled,
                    working: safeWorking
                });

                await db.runAsync(
                    `INSERT OR REPLACE INTO asset_inspections
                    (id, asset_id, survey_id, surveyor_id, status,
                     quantity_installed, quantity_working, remarks,
                     mag_review, cit_review, dgda_review,
                     gps_lat, gps_lng,
                     created_at, updated_at, synced)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
                    String(inspection.id),
                    String(inspection.asset_id),
                    String(inspection.survey_id),
                    String(inspection.surveyor_id || 'system'),
                    String(status),
                    safeInstalled,
                    safeWorking,
                    String(inspection.remarks || ''),
                    inspection.mag_review ? JSON.stringify(inspection.mag_review) : null,
                    inspection.cit_review ? JSON.stringify(inspection.cit_review) : null,
                    inspection.dgda_review ? JSON.stringify(inspection.dgda_review) : null,
                    inspection.gps_lat ? Number(inspection.gps_lat) : null,
                    inspection.gps_lng ? Number(inspection.gps_lng) : null,
                    new Date().toISOString(),
                    new Date().toISOString()
                );
            } catch (error: any) {
                console.error('[saveAssetInspection] CRASH! Full inspection object:', JSON.stringify(inspection, null, 2));
                console.error('[saveAssetInspection] Error:', error.message);
                throw error;
            }
        }
    },

    async getInspectionsForSurvey(surveyId: string): Promise<any[]> {
        if (Platform.OS === 'web' || isExpoGo) {
            try {
                const { inspectionsApi } = require('./api');
                return await inspectionsApi.getBySurvey(surveyId);
            } catch (e) {
                console.warn('Web fetch inspections failed, falling back to local:', e);
                const [inspStr, photosStr] = await Promise.all([
                    AsyncStorage.getItem('asset_inspections_data'),
                    AsyncStorage.getItem('photos_data'),
                ]);
                const inspections: any[] = ((inspStr ? JSON.parse(inspStr) : []) as any[]).filter(
                    i => i.survey_id === surveyId
                );
                const allPhotos: any[] = photosStr ? JSON.parse(photosStr) : [];

                // Build a lookup map — one pass over photos instead of one read per inspection
                const photosByInspection = new Map<string, any[]>();
                for (const photo of allPhotos) {
                    if (photo.asset_inspection_id) {
                        const list = photosByInspection.get(photo.asset_inspection_id) ?? [];
                        list.push(photo);
                        photosByInspection.set(photo.asset_inspection_id, list);
                    }
                }
                for (const inspection of inspections) {
                    inspection.photos = photosByInspection.get(inspection.id) ?? [];
                }
                return inspections;
            }
        } else {
            const db = await getDb();
            // Two queries instead of 1 + N: one for inspections, one for all their photos
            const [inspections, photos] = await Promise.all([
                db.getAllAsync(
                    `SELECT ai.*, a.name as asset_name, a.ref_code, a.service_line, a.floor, a.area
                     FROM asset_inspections ai
                     LEFT JOIN assets a ON ai.asset_id = a.id
                     WHERE ai.survey_id = ?`,
                    [surveyId]
                ),
                db.getAllAsync('SELECT * FROM photos WHERE survey_id = ?', [surveyId]),
            ]);

            const photosByInspection = new Map<string, any[]>();
            for (const photo of photos as any[]) {
                const list = photosByInspection.get(photo.asset_inspection_id) ?? [];
                list.push(photo);
                photosByInspection.set(photo.asset_inspection_id, list);
            }
            for (const inspection of inspections as any[]) {
                inspection.photos = photosByInspection.get(inspection.id) ?? [];
            }
            return inspections as any[];
        }
    },

    // --- PHOTOS ---
    async savePhoto(photo: any) {
        if (Platform.OS === 'web' || isExpoGo) {
            const existingStr = await AsyncStorage.getItem('photos_data');
            const existing = existingStr ? JSON.parse(existingStr) : [];
            existing.unshift(photo);
            await AsyncStorage.setItem('photos_data', JSON.stringify(existing));
        } else {
            const db = await getDb();
            await db.runAsync(
                'INSERT INTO photos (id, asset_inspection_id, survey_id, file_path, caption) VALUES (?, ?, ?, ?, ?)',
                photo.id, photo.asset_inspection_id, photo.survey_id, photo.file_path, photo.caption || ''
            );
        }
    },

    async getPhotosForInspection(inspectionId: string): Promise<any[]> {
        if (Platform.OS === 'web' || isExpoGo) {
            try {
                const { photosApi } = require('./api');
                const photos = await photosApi.getByInspection(inspectionId);
                return photos;
            } catch (e) {
                console.warn('Web fetch photos failed, falling back to local:', e);
                const str = await AsyncStorage.getItem('photos_data');
                const all: any[] = str ? JSON.parse(str) : [];
                return all.filter(p => p.asset_inspection_id === inspectionId);
            }
        } else {
            const db = await getDb();
            return await db.getAllAsync('SELECT * FROM photos WHERE asset_inspection_id = ?', [inspectionId]);
        }
    },

    async updateSurveyStatus(surveyId: string, status: string) {
        if (Platform.OS === 'web' || isExpoGo) {
            const surveys = await this.getSurveys();
            const index = surveys.findIndex(s => s.id === surveyId);
            if (index >= 0) {
                surveys[index].status = status;
                await AsyncStorage.setItem(WEB_SURVEYS_KEY, JSON.stringify(surveys));
            }
        } else {
            const db = await getDb();
            await db.runAsync(
                'UPDATE surveys SET status = ?, updated_at = ? WHERE id = ?',
                status, new Date().toISOString(), surveyId
            );
        }
    },

    async deleteSurvey(surveyId: string) {
        if (Platform.OS === 'web' || isExpoGo) {
            // Delete from web storage
            const surveys = await this.getSurveys();
            const filtered = surveys.filter(s => s.id !== surveyId);
            await AsyncStorage.setItem(WEB_SURVEYS_KEY, JSON.stringify(filtered));

            // Delete inspections
            const inspectionsStr = await AsyncStorage.getItem('asset_inspections_data');
            const inspections: any[] = inspectionsStr ? JSON.parse(inspectionsStr) : [];
            const filteredInspections = inspections.filter(i => i.survey_id !== surveyId);
            await AsyncStorage.setItem('asset_inspections_data', JSON.stringify(filteredInspections));

            // Delete photos
            const photosStr = await AsyncStorage.getItem('photos_data');
            const photos: any[] = photosStr ? JSON.parse(photosStr) : [];
            const filteredPhotos = photos.filter(p => p.survey_id !== surveyId);
            await AsyncStorage.setItem('photos_data', JSON.stringify(filteredPhotos));
        } else {
            const db = await getDb();

            // Delete photos, inspections, then survey in dependency order.
            // A single survey-scoped delete covers all photos (both survey_id and
            // asset_inspection_id links), so no per-inspection loop is needed.
            await db.runAsync('DELETE FROM photos WHERE survey_id = ?', [surveyId]);
            await db.runAsync('DELETE FROM asset_inspections WHERE survey_id = ?', [surveyId]);
            await db.runAsync('DELETE FROM surveys WHERE id = ?', [surveyId]);
        }
    },

    // --- SYNC METHODS (Phase 2) ---

    async markSurveySynced(surveyId: string) {
        if (Platform.OS === 'web' || isExpoGo) {
            const surveys = await this.getSurveys();
            const index = surveys.findIndex(s => s.id === surveyId);
            if (index >= 0) {
                surveys[index].synced = 1;
                surveys[index].last_synced_at = new Date().toISOString();
                await AsyncStorage.setItem(WEB_SURVEYS_KEY, JSON.stringify(surveys));
            }
        } else {
            const db = await getDb();
            await db.runAsync(
                'UPDATE surveys SET synced = 1, last_synced_at = ? WHERE id = ?',
                new Date().toISOString(), surveyId
            );
        }
    },

    async updateSurveyServerId(localId: string, serverId: string) {
        if (Platform.OS === 'web' || isExpoGo) {
            const surveys = await this.getSurveys();
            const index = surveys.findIndex(s => s.id === localId);
            if (index >= 0) {
                surveys[index].server_id = serverId;
                await AsyncStorage.setItem(WEB_SURVEYS_KEY, JSON.stringify(surveys));
            }
        } else {
            const db = await getDb();
            await db.runAsync(
                'UPDATE surveys SET server_id = ? WHERE id = ?',
                serverId, localId
            );
        }
    },

    async getPendingSurveys(): Promise<any[]> {
        if (Platform.OS === 'web' || isExpoGo) {
            const surveys = await this.getSurveys();
            return surveys.filter(s =>
                s.status === 'submitted' && !s.synced && !s.sync_failed
            );
        } else {
            const db = await getDb();
            // Exclude dead-letter (sync_failed) surveys — they need manual intervention
            return await db.getAllAsync(
                "SELECT * FROM surveys WHERE status = 'submitted' AND (synced = 0 OR synced IS NULL) AND (sync_failed = 0 OR sync_failed IS NULL)"
            );
        }
    },

    /** Mark a survey as permanently failed so it stops retrying on every sync cycle. */
    async markSurveyFailed(surveyId: string, reason: string) {
        if (Platform.OS === 'web' || isExpoGo) {
            const surveys = await this.getSurveys();
            const index = surveys.findIndex(s => s.id === surveyId);
            if (index >= 0) {
                surveys[index].sync_failed = 1;
                surveys[index].sync_error = reason;
                await AsyncStorage.setItem('surveys_data', JSON.stringify(surveys));
            }
        } else {
            const db = await getDb();
            await db.runAsync(
                'UPDATE surveys SET sync_failed = 1, sync_error = ? WHERE id = ?',
                reason, surveyId
            );
        }
    },

    /** Clear the dead-letter flag so the survey will be retried on the next sync. */
    async clearSurveyFailed(surveyId: string) {
        if (Platform.OS === 'web' || isExpoGo) {
            const surveys = await this.getSurveys();
            const index = surveys.findIndex(s => s.id === surveyId);
            if (index >= 0) {
                surveys[index].sync_failed = 0;
                surveys[index].sync_error = undefined;
                await AsyncStorage.setItem('surveys_data', JSON.stringify(surveys));
            }
        } else {
            const db = await getDb();
            await db.runAsync(
                'UPDATE surveys SET sync_failed = 0, sync_error = NULL WHERE id = ?',
                surveyId
            );
        }
    },

    async markInspectionSynced(inspectionId: string) {
        if (Platform.OS === 'web' || isExpoGo) {
            const str = await AsyncStorage.getItem('asset_inspections_data');
            const inspections: any[] = str ? JSON.parse(str) : [];
            const index = inspections.findIndex(i => i.id === inspectionId);
            if (index >= 0) {
                inspections[index].synced = true;
                await AsyncStorage.setItem('asset_inspections_data', JSON.stringify(inspections));
            }
        } else {
            const db = await getDb();
            await db.runAsync(
                'UPDATE asset_inspections SET synced = 1 WHERE id = ?',
                inspectionId
            );
        }
    },

    async markPhotoSynced(photoId: string) {
        if (Platform.OS === 'web' || isExpoGo) {
            const str = await AsyncStorage.getItem('photos_data');
            const photos: any[] = str ? JSON.parse(str) : [];
            const index = photos.findIndex(p => p.id === photoId);
            if (index >= 0) {
                photos[index].synced = true;
                await AsyncStorage.setItem('photos_data', JSON.stringify(photos));
            }
        } else {
            const db = await getDb();
            await db.runAsync(
                'UPDATE photos SET synced = 1 WHERE id = ?',
                photoId
            );
        }
    },

    async getPendingInspections(): Promise<any[]> {
        if (Platform.OS === 'web' || isExpoGo) {
            const str = await AsyncStorage.getItem('asset_inspections_data');
            const inspections: any[] = str ? JSON.parse(str) : [];
            return inspections.filter(i => !i.synced);
        } else {
            const db = await getDb();
            return await db.getAllAsync(
                'SELECT * FROM asset_inspections WHERE synced = 0 OR synced IS NULL'
            );
        }
    },

    async getPendingPhotos(): Promise<any[]> {
        if (Platform.OS === 'web' || isExpoGo) {
            const str = await AsyncStorage.getItem('photos_data');
            const photos: any[] = str ? JSON.parse(str) : [];
            return photos.filter(p => !p.synced);
        } else {
            const db = await getDb();
            return await db.getAllAsync(
                'SELECT * FROM photos WHERE synced = 0 OR synced IS NULL'
            );
        }
    },

    async updateInspectionServerId(localId: string, serverId: string) {
        if (Platform.OS === 'web' || isExpoGo) {
            const str = await AsyncStorage.getItem('asset_inspections_data');
            const inspections: any[] = str ? JSON.parse(str) : [];
            const index = inspections.findIndex(i => i.id === localId);
            if (index >= 0) {
                inspections[index].server_id = serverId;
                await AsyncStorage.setItem('asset_inspections_data', JSON.stringify(inspections));
            }
        } else {
            const db = await getDb();
            await db.runAsync(
                'UPDATE asset_inspections SET server_id = ? WHERE id = ?',
                serverId, localId
            );
        }
    },

    async updatePhotoServerId(localId: string, serverId: string) {
        if (Platform.OS === 'web' || isExpoGo) {
            const str = await AsyncStorage.getItem('photos_data');
            const photos: any[] = str ? JSON.parse(str) : [];
            const index = photos.findIndex(p => p.id === localId);
            if (index >= 0) {
                photos[index].server_id = serverId;
                await AsyncStorage.setItem('photos_data', JSON.stringify(photos));
            }
        } else {
            const db = await getDb();
            await db.runAsync(
                'UPDATE photos SET server_id = ? WHERE id = ?',
                serverId, localId
            );
        }
    },

    async deleteAsset(assetId: string) {
        if (Platform.OS === 'web' || isExpoGo) {
            const str = await AsyncStorage.getItem('assets_data');
            const assets: any[] = str ? JSON.parse(str) : [];
            const filtered = assets.filter(a => a.id !== assetId);
            await AsyncStorage.setItem('assets_data', JSON.stringify(filtered));
        } else {
            const db = await getDb();
            await db.runAsync('DELETE FROM assets WHERE id = ?', [assetId]);
        }
    },

    // Phase 3: Query methods for central asset register
    async getAssetsBySiteAndServiceLine(siteId: string, serviceLine: string) {
        const allAssets = await this.getAssets();
        return allAssets.filter(a =>
            a.site_id === siteId && a.service_line === serviceLine
        );
    },

    async getServiceLinesBySite(siteId: string) {
        const allAssets = await this.getAssets();
        const siteAssets = allAssets.filter(a => a.site_id === siteId || a.project_site === siteId);
        const serviceLines = [...new Set(siteAssets.map(a => a.service_line || a.type))].filter(Boolean);
        return serviceLines as string[];
    },

    // Phase 9: Location Filtering
    async getLocationsBySite(siteId: string) {
        const allAssets = await this.getAssets(siteId);

        // Extract distinct building + location combinations
        // Formats: "Building (Location)" or just "Location"
        const locations = new Set<string>();

        allAssets.forEach(a => {
            const loc = a.location;
            const bldg = a.building;

            if (bldg && loc) {
                locations.add(`${bldg} - ${loc}`);
            } else if (bldg) {
                locations.add(bldg);
            } else if (loc) {
                locations.add(loc);
            }
        });

        return Array.from(locations).sort();
    },

    async getServiceLinesBySiteAndLocation(siteId: string, locationFilter: string) {
        let assets = await this.getAssets(siteId);

        if (locationFilter) {
            assets = assets.filter(a => {
                const loc = a.location;
                const bldg = a.building;
                const combined = bldg && loc ? `${bldg} - ${loc}` : (bldg || loc || '');
                return combined === locationFilter;
            });
        }

        const serviceLines = [...new Set(assets.map(a => a.service_line || a.type))].filter(Boolean);
        return serviceLines as string[];
    },

    async getSitesWithAssetCounts() {
        const allAssets = await this.getAssets();
        const sitesMap: { [key: string]: { id: string; name: string; count: number; serviceLines: Set<string> } } = {};

        allAssets.forEach((asset: any) => {
            // Priority: project_site (ID) -> site_name
            // In our schema, project_site stores the site_id.
            const siteId = asset.project_site || asset.site_id;
            const siteName = asset.site_name; // Might be empty if not saved

            if (!siteId && !siteName) return;

            const key = siteId || siteName; // Use ID as key if available

            if (!sitesMap[key]) {
                sitesMap[key] = {
                    id: siteId,
                    name: siteName || siteId, // Fallback name to ID if missing 
                    count: 0,
                    serviceLines: new Set()
                };
            }
            sitesMap[key].count++;

            const sl = asset.service_line || asset.type; // type is often used as service line
            if (sl) {
                sitesMap[key].serviceLines.add(sl);
            }
        });

        return Object.values(sitesMap).map(site => ({
            id: site.id,
            name: site.name,
            count: site.count,
            serviceLines: Array.from(site.serviceLines)
        }));
    },

    async getUniqueServiceLines() {
        const allAssets = await this.getAssets();
        const serviceLines = [...new Set(allAssets.map(a => a.service_line))].filter(Boolean);
        return serviceLines as string[];
    },

    // --- SITES (Phase 3) ---
    async saveSite(site: SiteRecord) {
        if (Platform.OS === 'web' || isExpoGo) {
            const existingStr = await AsyncStorage.getItem('sites_data');
            const existing: SiteRecord[] = existingStr ? JSON.parse(existingStr) : [];
            const index = existing.findIndex(s => s.id === site.id);
            if (index >= 0) {
                existing[index] = site;
            } else {
                existing.unshift(site);
            }
            await AsyncStorage.setItem('sites_data', JSON.stringify(existing));
        } else {
            const db = await getDb();
            await db.runAsync(
                'INSERT OR REPLACE INTO sites (id, name, location, client, created_at) VALUES (?, ?, ?, ?, ?)',
                site.id, site.name, site.location || '', site.client || '', site.created_at
            );
        }
    },

    // --- USER PREFERENCES ---
    async saveLastSelectedSite(siteId: string) {
        try {
            await AsyncStorage.setItem('last_selected_site', siteId);
        } catch (e) {
            console.error('Failed to save last selected site', e);
        }
    },

    async getLastSelectedSite(): Promise<string | null> {
        try {
            return await AsyncStorage.getItem('last_selected_site');
        } catch (e) {
            console.error('Failed to get last selected site', e);
            return null;
        }
    },

    async getSites(): Promise<SiteRecord[]> {
        if (Platform.OS === 'web' || isExpoGo) {
            const str = await AsyncStorage.getItem('sites_data');
            return str ? JSON.parse(str) : [];
        } else {
            const db = await getDb();
            // Fallback for transition: if no sites in DB, derive from assets to avoid data loss
            try {
                const sites = await db.getAllAsync('SELECT * FROM sites ORDER BY created_at DESC');
                if (sites.length === 0) {
                    // Migration: Check assets for implicit sites
                    const assets = await this.getAssets();
                    const implicitSites = [...new Set(assets.map(a => a.site_name || a.site_id))].filter(Boolean);
                    if (implicitSites.length > 0) {
                        return implicitSites.map(name => ({
                            id: `site_${name}`,
                            name: name as string,
                            created_at: new Date().toISOString()
                        }));
                    }
                }
                return sites;
            } catch (e) {
                console.error('Failed to get sites from local DB:', e);
                return [];
            }
        }
    },

    async deleteSite(siteId: string) {
        if (Platform.OS === 'web' || isExpoGo) {
            const existingStr = await AsyncStorage.getItem('sites_data');
            const existing: SiteRecord[] = existingStr ? JSON.parse(existingStr) : [];
            const filtered = existing.filter(s => s.id !== siteId);
            await AsyncStorage.setItem('sites_data', JSON.stringify(filtered));
        } else {
            const db = await getDb();
            await db.runAsync('DELETE FROM sites WHERE id = ?', [siteId]);
        }
    }
};
