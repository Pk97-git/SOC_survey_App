import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { sitesApi, assetsApi, surveysApi, inspectionsApi, ApiAsset } from './api';
import { storage as localStorage, SiteRecord, SurveyRecord } from './storage';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// syncService handles background sync
import { syncService } from './syncService';
import { photoService } from './photoService';
export { syncService };

// Feature flag removed: Always offline-first for core field operations
// Admin operations (Sites, Assets) might still be online-dependent for now until full sync is implemented.
// However, standard survey flow is now: Local Write -> Background Sync.

// ==================== Sites ====================

export const getSites = async (): Promise<SiteRecord[]> => {
    try {
        if (await syncService.getStatus().isOnline) {
            const sites = await sitesApi.getAll();
            await cacheData('sites_cache', sites);
            // Also update local storage if possible?
            // For now, cache is fine for read-heavy sites.
            return sites;
        }
    } catch (error: any) {
        if (error.response?.status !== 401) {
            console.error('Failed to fetch sites from backend, using cache:', error);
        }
    }
    return await getCachedData('sites_cache') || await localStorage.getSites();
};

export const saveSite = async (site: any) => {
    try {
        const savedSite = await sitesApi.create({
            name: site.name,
            location: site.location,
            client: site.client,
        });
        // Update cache
        const cached = await getCachedData('sites_cache') || [];
        cached.unshift(savedSite);
        await cacheData('sites_cache', cached);
        // Also save to local storage
        await localStorage.saveSite(savedSite);
        return savedSite;
    } catch (error) {
        console.error('Failed to save site to backend:', error);
        throw error;
    }
};

export const updateSite = async (id: string, data: any) => {
    try {
        const updatedSite = await sitesApi.update(id, data);
        // Update cache
        const cached = await getCachedData('sites_cache') || [];
        const index = cached.findIndex((s: any) => s.id === id);
        if (index >= 0) {
            cached[index] = updatedSite;
            await cacheData('sites_cache', cached);
        }
        return updatedSite;
    } catch (error) {
        console.error('Failed to update site:', error);
        throw error;
    }
};

export const deleteSite = async (id: string) => {
    try {
        await sitesApi.delete(id);
        // Update cache
        const cached = await getCachedData('sites_cache') || [];
        const filtered = cached.filter((s: any) => s.id !== id);
        await cacheData('sites_cache', filtered);
        // Update local storage
        await localStorage.deleteSite(id);
    } catch (error) {
        console.error('Failed to delete site:', error);
        throw error;
    }
};

// ==================== Assets ====================

// ==================== Assets ====================

export const getAssets = async (siteId?: string): Promise<ApiAsset[]> => {
    // 1. Web / Expo Go never caches. Always fresh from API.
    if (Platform.OS === 'web' || isExpoGo) {
        try {
            return await assetsApi.getAll(siteId);
        } catch (error) {
            console.error('Web: Failed to fetch assets from backend:', error);
            return []; // No fallback for web
        }
    }

    // 2. Native Mobile Offline-First Flow
    try {
        if (await syncService.getStatus().isOnline) {
            const assets = await assetsApi.getAll(siteId);
            // Optionally cache to SQLite here if we want native to have latest, 
            // but normally syncAll() handles pulling.
            // For now just return fresh if online.
            return assets;
        }
    } catch (error: any) {
        if (error.response?.status !== 401) {
            console.error('Failed to fetch assets from backend:', error);
        }
    }

    // 3. Fallback to Native SQLite
    return await localStorage.getAssets(siteId) as unknown as ApiAsset[];
};

export const saveAsset = async (asset: any): Promise<ApiAsset> => {
    try {
        const savedAsset = await assetsApi.create({
            siteId: asset.site_id,
            refCode: asset.ref_code,
            name: asset.name,
            serviceLine: asset.service_line,
            status: asset.status,
            assetTag: asset.asset_tag,
            zone: asset.zone,
            building: asset.building,
            location: asset.location,
            description: asset.description,
        });
        // Update local
        await localStorage.saveAsset(savedAsset);
        return savedAsset;
    } catch (error) {
        console.error('Failed to save asset to backend:', error);
        // Fallback to local
        await localStorage.saveAsset(asset); // Might need ID generation?
        // Queue sync? Admin create usually expects online.
        throw error; // Admin create expects online for now based on Plan Phase 8
    }
};

export const updateAsset = async (id: string, asset: any) => {
    try {
        const updatedAsset = await assetsApi.update(id, {
            siteId: asset.site_id,
            refCode: asset.ref_code,
            name: asset.name,
            serviceLine: asset.service_line,
            status: asset.status,
            assetTag: asset.asset_tag,
            building: asset.building,
            location: asset.location,
            description: asset.description,
        });
        await localStorage.saveAsset(updatedAsset);
        return updatedAsset;
    } catch (error) {
        console.error('Failed to update asset:', error);
        throw error;
    }
};

export const bulkImportAssets = async (siteId: string, assets: any[]) => {
    try {
        // Map frontend asset format to backend format
        const backendAssets = assets.map(asset => ({
            refCode: asset.ref_code || asset.asset_code,
            name: asset.name,
            serviceLine: asset.service_line,
            status: asset.status,
            assetTag: asset.asset_tag,
            building: asset.building,
            location: asset.location,
            description: asset.description,
        }));

        const savedAssets = await assetsApi.bulkImport(siteId, backendAssets);

        // Cache locally?
        // We really should save to SQLite.
        // await cacheData(`assets_cache_${siteId}`, savedAssets); // Legacy cache
        // For import, maybe just rely on backend fetch next time?
        return savedAssets;
    } catch (error) {
        console.error('Failed to bulk import assets to backend:', error);
        throw error;
    }
};

export const uploadAssetFile = async (siteId: string, fileUri: string, onProgress?: (progress: number) => void) => {
    try {
        return await assetsApi.uploadExcel(siteId, fileUri, onProgress);
    } catch (error) {
        console.error('Failed to upload asset file:', error);
        throw error;
    }
};

export const deleteAsset = async (id: string) => {
    try {
        await assetsApi.delete(id);
        await localStorage.deleteAsset(id);
    } catch (error) {
        console.error('Failed to delete asset:', error);
        throw error;
    }
};

// ==================== Surveys ====================

export const getSurveys = async (siteId?: string): Promise<SurveyRecord[]> => {
    let remoteSurveys: SurveyRecord[] = [];
    let isOnline = false;

    try {
        isOnline = await syncService.getStatus().isOnline;
        if (isOnline) {
            console.log('Fetching surveys from backend...');
            remoteSurveys = await surveysApi.getAll(siteId) as SurveyRecord[];
        }
    } catch (error: any) {
        if (error.response?.status !== 401) {
            console.error('Failed to fetch surveys from backend:', error);
        }
    }

    if (Platform.OS === 'web' || isExpoGo) {
        return remoteSurveys;
    }

    // Native: Merge local and remote
    const localSurveys = await localStorage.getSurveys(siteId);
    const mergedMap = new Map<string, SurveyRecord>();

    // 1. Add remote surveys
    remoteSurveys.forEach(remote => {
        mergedMap.set(remote.id, remote);
    });

    // 2. Override with local data if unsynced or if local is "more advanced"
    localSurveys.forEach(local => {
        const serverId = (local as any).server_id;
        const key = serverId || local.id;
        const existing = mergedMap.get(key);

        if (!existing) {
            // Local-only survey (not yet uploaded)
            mergedMap.set(local.id, local);
        } else if (!(local as any).synced || (local as any).synced === 0) {
            // Local has unsynced changes (e.g. status changed to 'in_progress' or 'submitted')
            // Prefer the local status but keep other server-side fields
            mergedMap.set(key, { ...existing, ...local, id: existing.id });
        }
    });

    return Array.from(mergedMap.values());
};

export const saveSurvey = async (survey: any): Promise<SurveyRecord> => {
    if (Platform.OS === 'web' || isExpoGo) {
        // Web: Directly push to API, bypass Sync
        try {
            const result = await surveysApi.create({
                siteId: survey.site_id,
                trade: survey.trade,
                location: survey.location,
                surveyorId: survey.surveyor_id
            });
            return result as SurveyRecord; // RETURN BACKEND UUID
        } catch (error) {
            console.error('Web: Failed to save survey to backend', error);
            throw error;
        }
    }

    // Native: Local DB first -> Background Sync
    await localStorage.saveSurvey(survey);
    syncService.syncAll().catch(console.error);
    return survey as SurveyRecord;
};

export const updateSurvey = async (id: string, data: any) => {
    const isSubmit = data.status === 'submitted';

    if (Platform.OS === 'web' || isExpoGo) {
        // Web: Directly push to API
        try {
            if (isSubmit) {
                // Use dedicated submit endpoint so submitted_at timestamp is set correctly
                const result = await surveysApi.submit(id);
                return result;
            }
            const mappedData: any = { status: data.status };
            if (data.surveyor_id !== undefined) mappedData.surveyorId = data.surveyor_id;
            const result = await surveysApi.update(id, mappedData);
            return result;
        } catch (error) {
            console.error('Web: Failed to update survey on backend', error);
            throw error;
        }
    }

    // Native: Try to push to backend directly first (same as web), then update local cache
    if (syncService.isOnline) {
        try {
            if (isSubmit) {
                await surveysApi.submit(id);
            } else {
                const mappedData: any = { status: data.status };
                if (data.surveyor_id !== undefined) mappedData.surveyorId = data.surveyor_id;
                await surveysApi.update(id, mappedData);
            }
        } catch (error) {
            console.error('Native: Failed to push survey update to backend — will save locally', error);
        }
    }
    // Always update local storage (source of truth for offline-first)
    await localStorage.updateSurveyStatus(id, data.status);
    return { id, ...data };
};

export const deleteSurvey = async (id: string) => {
    if (Platform.OS === 'web' || isExpoGo) {
        try {
            await surveysApi.delete(id);
        } catch (error) {
            console.error('Web: Failed to delete survey', error);
            throw error;
        }
        return;
    }

    // Native
    try {
        if (await syncService.getStatus().isOnline) {
            await surveysApi.delete(id);
        }
    } catch (error) {
        console.error('Failed to delete survey from backend:', error);
    }
    await localStorage.deleteSurvey(id);
};

// ==================== Inspections ====================
// Helper: a "real" server UUID looks like xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
const isRealUUID = (id: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export const saveAssetInspection = async (inspection: any) => {
    if (Platform.OS === 'web' || isExpoGo) {
        // Build the common payload (photos included to persist server paths after upload)
        const payload = {
            assetId: inspection.asset_id,
            conditionRating: inspection.condition_rating,
            overallCondition: inspection.overall_condition,
            quantityInstalled: inspection.quantity_installed,
            quantityWorking: inspection.quantity_working,
            remarks: inspection.remarks,
            gpsLat: inspection.gps_lat,
            gpsLng: inspection.gps_lng,
            magReview: inspection.mag_review || undefined,
            citReview: inspection.cit_review || undefined,
            dgdaReview: inspection.dgda_review || undefined,
            photos: inspection.photos || undefined,
        };

        try {
            if (inspection.id && isRealUUID(inspection.id)) {
                try {
                    // Already exists based on ID format — try update first
                    const updated = await inspectionsApi.update(inspection.id, payload);
                    return updated;
                } catch (updateError: any) {
                    // If 404, it's a new record with a pre-generated UUID (typical on Web)
                    if (updateError.response?.status === 404) {
                        const created = await inspectionsApi.create(inspection.survey_id, { 
                            id: inspection.id, 
                            ...payload 
                        });
                        return created;
                    }
                    throw updateError;
                }
            } else {
                // No ID or not a UUID — standard backend create
                const created = await inspectionsApi.create(inspection.survey_id, payload);
                return created;
            }
        } catch (error) {
            console.error('Web: Failed to save inspection to backend', error);
            throw error;
        }
    } else {
        // Native flow unchanged
        await localStorage.saveAssetInspection(inspection);
        syncService.syncAll().catch(console.error);
        return inspection;
    }
};

export const getInspectionsForSurvey = async (surveyId: string): Promise<Record<string, any>[]> => {
    let remoteInspections: any[] = [];
    let isOnline = false;

    try {
        isOnline = await syncService.getStatus().isOnline;
        if (isOnline) {
            remoteInspections = await inspectionsApi.getBySurvey(surveyId);
        }
    } catch (error: any) {
        if (error.response?.status !== 401) {
            console.error('Failed to fetch inspections from backend:', error);
        }
    }

    if (Platform.OS === 'web' || isExpoGo) {
        return remoteInspections;
    }

    // Native: Merge local and remote
    const localInspections = await localStorage.getInspectionsForSurvey(surveyId);
    const mergedMap = new Map<string, any>();

    // 1. Add remote inspections
    remoteInspections.forEach(remote => {
        mergedMap.set(remote.id, remote);
    });

    // 2. Override with local data if unsynced
    localInspections.forEach(local => {
        const serverId = (local as any).server_id;
        const key = serverId || local.id;
        const existing = mergedMap.get(key);

        if (!existing) {
            // Local-only inspection (not yet uploaded)
            mergedMap.set(local.id, local);
        } else if (!(local as any).synced || (local as any).synced === 0) {
            // Local has unsynced changes
            mergedMap.set(key, { ...existing, ...local, id: existing.id });
        }
    });

    return Array.from(mergedMap.values());
};

// ==================== Photos ====================

export const savePhoto = async (photo: any) => {
    await localStorage.savePhoto(photo);
    syncService.syncAll().catch(console.error);
};
export const getPhotosForInspection = localStorage.getPhotosForInspection.bind(localStorage);
export const deletePhoto = async (photoId: string) => {
    // TODO: Mark as deleted in local db and sync delete
    console.warn('Delete photo not fully implemented');
};

// ==================== Caching ====================

const cacheData = async (key: string, data: any) => {
    try {
        await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Failed to cache data:', error);
    }
};

const getCachedData = async (key: string) => {
    try {
        const data = await AsyncStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Failed to get cached data:', error);
        return null;
    }
};

export const clearCache = async () => {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(key => key.includes('assets_cache') || key.includes('sites_cache'));
        await AsyncStorage.multiRemove(cacheKeys);
        console.log('Main cache cleared');
    } catch (error) {
        console.error('Failed to clear cache:', error);
    }
};
