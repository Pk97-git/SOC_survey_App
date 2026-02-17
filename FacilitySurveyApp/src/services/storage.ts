import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDb } from '../db';
import { SurveyTemplate } from './configService';
import Constants, { ExecutionEnvironment } from 'expo-constants';

// Helper functions to safely convert values for SQLite
// iOS SQLite is VERY strict about type conversions - floats cannot go into INTEGER columns
const safeInt = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    const num = Number(value);
    if (isNaN(num) || !isFinite(num)) return 0;
    return Math.floor(num); // Always round down to ensure it's an integer
};

const safeFloat = (value: any): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    if (isNaN(num) || !isFinite(num)) return null;
    return num;
};

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

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
    synced?: number;         // 0 = pending upload, 1 = synced with backend
    server_id?: string;      // Backend UUID if this was created locally and synced
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
            const idx = existing.findIndex((s: any) => s.id === survey.id);
            if (idx >= 0) {
                existing[idx] = survey;
            } else {
                existing.unshift(survey);
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
                (survey as any).site_id || null,
                survey.site_name || '',
                survey.trade || '',
                survey.location || '',
                (survey as any).surveyor_id || null,
                survey.surveyor_name || '',
                survey.status,
                survey.gps_lat ? Number(survey.gps_lat) : null,
                survey.gps_lng ? Number(survey.gps_lng) : null,
                survey.created_at,
                survey.updated_at || survey.created_at,
                (survey as any).synced ?? 0,
                (survey as any).server_id || null
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

    async getSurveys(): Promise<SurveyRecord[]> {
        if (Platform.OS === 'web' || isExpoGo) {
            const data = await AsyncStorage.getItem(WEB_SURVEYS_KEY);
            return data ? JSON.parse(data) : [];
        } else {
            const db = await getDb();
            return await db.getAllAsync('SELECT * FROM surveys ORDER BY rowid DESC');
        }
    },

    async getSurveyById(id: string): Promise<SurveyRecord | null> {
        if (Platform.OS === 'web' || isExpoGo) {
            const surveys = await this.getSurveys();
            return surveys.find((s: any) => s.id === id) || null;
        } else {
            const db = await getDb();
            const result = await db.getFirstAsync<SurveyRecord>(
                'SELECT * FROM surveys WHERE id = ? LIMIT 1', [id]
            );
            return result || null;
        }
    },

    async getSurveysBySiteAndTrade(siteId: string, trade: string): Promise<SurveyRecord[]> {
        if (Platform.OS === 'web' || isExpoGo) {
            const surveys = await this.getSurveys();
            return surveys.filter((s: any) =>
                s.site_id === siteId && (!trade || s.trade === trade)
            );
        } else {
            const db = await getDb();
            return await db.getAllAsync<SurveyRecord>(
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
            const existing = existingStr ? JSON.parse(existingStr) : [];
            const index = existing.findIndex((a: any) => a.id === asset.id);
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
                    (id, name, type, project_site, site_name, service_line, location_lat, location_lng, description, building, location) VALUES 
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    String(asset.id),
                    String(asset.name || ''),
                    String(asset.type || asset.service_line || ''),
                    String(asset.project_site || asset.site_id || asset.siteId || ''),
                    String(asset.site_name || asset.siteName || ''),
                    String(asset.service_line || asset.serviceLine || asset.type || ''),
                    safeLatValue,
                    safeLngValue,
                    String(asset.description || ''),
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
            const existingStr = await AsyncStorage.getItem('assets_data');
            const existing = existingStr ? JSON.parse(existingStr) : [];
            const assetMap = new Map(existing.map((a: any) => [a.id, a]));
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
                            (id, name, type, project_site, site_name, service_line, location_lat, location_lng, description, building, location) VALUES 
                            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            String(asset.id),
                            String(asset.name || ''),
                            String(asset.type || asset.service_line || ''),
                            String(asset.project_site || asset.site_id || asset.siteId || ''),
                            String(asset.site_name || asset.siteName || ''),
                            String(asset.service_line || asset.serviceLine || asset.type || ''),
                            safeLatValue,
                            safeLngValue,
                            String(asset.description || ''),
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
        let assets = [];
        if (Platform.OS === 'web' || isExpoGo) {
            const str = await AsyncStorage.getItem('assets_data');
            assets = str ? JSON.parse(str) : [];
        } else {
            const db = await getDb();
            assets = await db.getAllAsync('SELECT * FROM assets ORDER BY created_at DESC');
        }

        if (siteId) {
            // Check both project_site (ID) and legacy site_id
            return assets.filter((a: any) =>
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
            const existingStr = await AsyncStorage.getItem('asset_inspections_data');
            const existing = existingStr ? JSON.parse(existingStr) : [];
            const index = existing.findIndex((i: any) => i.id === inspection.id);
            if (index >= 0) {
                existing[index] = inspection;
            } else {
                existing.unshift(inspection);
            }
            await AsyncStorage.setItem('asset_inspections_data', JSON.stringify(existing));
        } else {
            const db = await getDb();
            try {
                // Strictly sanitize inputs before using them
                const qtyInstalled = inspection.quantity_installed ? parseInt(String(inspection.quantity_installed), 10) : 0;
                const qtyWorking = inspection.quantity_working ? parseInt(String(inspection.quantity_working), 10) : 0;
                const gpsLat = inspection.gps_lat ? parseFloat(String(inspection.gps_lat)) : null;
                const gpsLng = inspection.gps_lng ? parseFloat(String(inspection.gps_lng)) : null;

                // Log distinct values to debug precision issues
                console.log('[saveAssetInspection] Saving:', {
                    id: inspection.id,
                    raw_installed: inspection.quantity_installed,
                    sanitized_installed: qtyInstalled,
                    raw_lat: inspection.gps_lat,
                    sanitized_lat: gpsLat
                });

                await db.runAsync(
                    `INSERT OR REPLACE INTO asset_inspections 
                    (id, survey_id, asset_id, condition_rating, overall_condition, quantity_installed, quantity_working, remarks, gps_lat, gps_lng, updated_at) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    inspection.id,
                    inspection.survey_id,
                    inspection.asset_id,
                    inspection.condition_rating,
                    inspection.overall_condition,
                    qtyInstalled, // Use sanitized int
                    qtyWorking,   // Use sanitized int
                    inspection.remarks,
                    gpsLat,       // Use sanitized float
                    gpsLng,       // Use sanitized float
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
            const str = await AsyncStorage.getItem('asset_inspections_data');
            const all: any[] = str ? JSON.parse(str) : [];
            const inspections = all.filter(i => i.survey_id === surveyId);

            // Load photos for each inspection
            for (const inspection of inspections) {
                inspection.photos = await this.getPhotosForInspection(inspection.id);
            }

            return inspections;
        } else {
            const db = await getDb();
            const inspections = await db.getAllAsync(
                `SELECT ai.*, a.name as asset_name, a.ref_code, a.service_line, a.floor, a.area 
                FROM asset_inspections ai 
                LEFT JOIN assets a ON ai.asset_id = a.id 
                WHERE ai.survey_id = ?`,
                [surveyId]
            );

            // Load photos for each inspection
            for (const inspection of inspections) {
                inspection.photos = await this.getPhotosForInspection(inspection.id);
            }

            return inspections;
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
            const str = await AsyncStorage.getItem('photos_data');
            const all: any[] = str ? JSON.parse(str) : [];
            return all.filter(p => p.asset_inspection_id === inspectionId);
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

    async claimSurvey(surveyId: string, surveyorId: string, status: string = 'in_progress') {
        if (Platform.OS === 'web' || isExpoGo) {
            const surveys = await this.getSurveys();
            const index = surveys.findIndex((s: any) => s.id === surveyId);
            if (index >= 0) {
                (surveys[index] as any).surveyor_id = surveyorId;
                surveys[index].status = status;
                surveys[index].updated_at = new Date().toISOString();
                await AsyncStorage.setItem(WEB_SURVEYS_KEY, JSON.stringify(surveys));
            }
        } else {
            const db = await getDb();
            await db.runAsync(
                'UPDATE surveys SET surveyor_id = ?, status = ?, updated_at = ?, synced = 0 WHERE id = ?',
                surveyorId, status, new Date().toISOString(), surveyId
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

            // Get all inspections for this survey
            const inspections = await db.getAllAsync(
                'SELECT id FROM asset_inspections WHERE survey_id = ?',
                [surveyId]
            );

            // Delete photos for each inspection
            for (const inspection of inspections as any[]) {
                await db.runAsync('DELETE FROM photos WHERE asset_inspection_id = ?', [inspection.id]);
            }

            // Delete all photos linked to survey
            await db.runAsync('DELETE FROM photos WHERE survey_id = ?', [surveyId]);

            // Delete inspections
            await db.runAsync('DELETE FROM asset_inspections WHERE survey_id = ?', [surveyId]);

            // Delete survey
            await db.runAsync('DELETE FROM surveys WHERE id = ?', [surveyId]);
        }
    },

    // --- SYNC METHODS (Phase 2) ---

    async markSurveySynced(surveyId: string) {
        if (Platform.OS === 'web' || isExpoGo) {
            const surveys = await this.getSurveys();
            const index = surveys.findIndex((s: any) => s.id === surveyId);
            if (index >= 0) {
                (surveys[index] as any).synced = true;
                (surveys[index] as any).last_synced_at = new Date().toISOString();
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
            const index = surveys.findIndex((s: any) => s.id === localId);
            if (index >= 0) {
                (surveys[index] as any).server_id = serverId;
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
            return surveys.filter((s: any) =>
                s.status === 'submitted' && (!s.synced || s.synced === false)
            );
        } else {
            const db = await getDb();
            // Ensure we only sync final surveys
            return await db.getAllAsync(
                "SELECT * FROM surveys WHERE status = 'submitted' AND (synced = 0 OR synced IS NULL)"
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
            return inspections.filter((i: any) => !i.synced || i.synced === false);
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
            return photos.filter((p: any) => !p.synced || p.synced === false);
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
        return allAssets.filter((a: any) =>
            a.site_id === siteId && a.service_line === serviceLine
        );
    },

    async getServiceLinesBySite(siteId: string) {
        const allAssets = await this.getAssets();
        const siteAssets = allAssets.filter((a: any) => a.site_id === siteId || a.project_site === siteId);
        const serviceLines = [...new Set(siteAssets.map((a: any) => a.service_line || a.type))].filter(Boolean);
        return serviceLines as string[];
    },

    // Phase 9: Location Filtering
    async getLocationsBySite(siteId: string) {
        const allAssets = await this.getAssets(siteId);

        // Extract distinct building + location combinations
        // Formats: "Building (Location)" or just "Location"
        const locations = new Set<string>();

        allAssets.forEach((a: any) => {
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
            assets = assets.filter((a: any) => {
                const loc = a.location;
                const bldg = a.building;
                const combined = bldg && loc ? `${bldg} - ${loc}` : (bldg || loc || '');
                return combined === locationFilter;
            });
        }

        const serviceLines = [...new Set(assets.map((a: any) => a.service_line || a.type))].filter(Boolean);
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
        const serviceLines = [...new Set(allAssets.map((a: any) => a.service_line))].filter(Boolean);
        return serviceLines as string[];
    },

    // --- SITES (Phase 3) ---
    async saveSite(site: SiteRecord) {
        if (Platform.OS === 'web' || isExpoGo) {
            const existingStr = await AsyncStorage.getItem('sites_data');
            const existing = existingStr ? JSON.parse(existingStr) : [];
            const index = existing.findIndex((s: any) => s.id === site.id);
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
                // Table might not exist yet
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
