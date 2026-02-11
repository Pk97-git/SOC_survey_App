import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDb } from '../db';
import { SurveyTemplate } from './configService';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export interface SurveyRecord {
    id: string;
    site_name: string;
    trade?: string;
    location?: string;
    surveyor_name?: string;
    status: string;
    gps_lat?: number;
    gps_lng?: number;
    created_at: string;
    updated_at?: string;
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
            const existing = await this.getSurveys();
            existing.unshift(survey);
            await AsyncStorage.setItem(WEB_SURVEYS_KEY, JSON.stringify(existing));
        } else {
            const db = await getDb();
            await db.runAsync(
                'INSERT INTO surveys (id, site_name, trade, location, surveyor_name, status, gps_lat, gps_lng, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                survey.id, survey.site_name, survey.trade || '', survey.location || '', survey.surveyor_name || '', survey.status, survey.gps_lat || null, survey.gps_lng || null, survey.created_at, survey.updated_at || survey.created_at
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
            const jwt = await AsyncStorage.getItem(WEB_SURVEYS_KEY);
            return jwt ? JSON.parse(jwt) : [];
        } else {
            const db = await getDb();
            // Assuming schema has created_at default, but we might have missed it in INSERT above if not explicit.
            // Let's use flexible query.
            return await db.getAllAsync('SELECT * FROM surveys ORDER BY rowid DESC');
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
            existing.unshift(asset);
            await AsyncStorage.setItem('assets_data', JSON.stringify(existing));
        } else {
            const db = await getDb();
            await db.runAsync(
                'INSERT INTO assets (id, name, type, project_site, location_lat, location_lng, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
                asset.id, asset.name, asset.type, asset.project_site, asset.location_lat, asset.location_lng, asset.description
            );
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
            return assets.filter((a: any) => a.site_id === siteId || a.siteId === siteId);
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
            await db.runAsync(
                `INSERT OR REPLACE INTO asset_inspections 
                (id, survey_id, asset_id, condition_rating, overall_condition, quantity_installed, quantity_working, remarks, gps_lat, gps_lng, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                inspection.id, inspection.survey_id, inspection.asset_id, inspection.condition_rating,
                inspection.overall_condition, inspection.quantity_installed, inspection.quantity_working,
                inspection.remarks, inspection.gps_lat, inspection.gps_lng, new Date().toISOString()
            );
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
        const surveys = await this.getSurveys();
        return surveys.filter((s: any) =>
            s.status === 'submitted' && (!s.synced || s.synced === false)
        );
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
        const siteAssets = allAssets.filter((a: any) => a.site_id === siteId);
        const serviceLines = [...new Set(siteAssets.map((a: any) => a.service_line))].filter(Boolean);
        return serviceLines as string[];
    },

    async getSitesWithAssetCounts() {
        const allAssets = await this.getAssets();
        const sitesMap: { [key: string]: { name: string; count: number; serviceLines: Set<string> } } = {};

        allAssets.forEach((asset: any) => {
            const siteId = asset.site_id || asset.site_name;
            if (!siteId) return;

            if (!sitesMap[siteId]) {
                sitesMap[siteId] = { name: siteId, count: 0, serviceLines: new Set() };
            }
            sitesMap[siteId].count++;
            if (asset.service_line) {
                sitesMap[siteId].serviceLines.add(asset.service_line);
            }
        });

        return Object.values(sitesMap).map(site => ({
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
            existing.unshift(site);
            await AsyncStorage.setItem('sites_data', JSON.stringify(existing));
        } else {
            const db = await getDb();
            await db.runAsync(
                'INSERT INTO sites (id, name, location, client, created_at) VALUES (?, ?, ?, ?, ?)',
                site.id, site.name, site.location || '', site.client || '', site.created_at
            );
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
