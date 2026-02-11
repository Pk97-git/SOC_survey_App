import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sitesApi, assetsApi, surveysApi, inspectionsApi } from './api';
import { storage as localStorage } from './storage';

// syncService handles background sync
import { syncService } from './syncService';

// Feature flag removed: Always offline-first for core field operations
// Admin operations (Sites, Assets) might still be online-dependent for now until full sync is implemented.
// However, standard survey flow is now: Local Write -> Background Sync.

// ==================== Sites ====================

export const getSites = async () => {
    try {
        if (await syncService.getStatus().isOnline) {
            const sites = await sitesApi.getAll();
            await cacheData('sites_cache', sites);
            // Also update local storage if possible?
            // For now, cache is fine for read-heavy sites.
            return sites;
        }
    } catch (error) {
        console.error('Failed to fetch sites from backend, using cache:', error);
    }
    return await getCachedData('sites_cache') || await localStorage.getSites();
};

export const saveSite = async (site: any) => {
    try {
        const savedSite = await sitesApi.create({
            name: site.name,
            location: site.location,
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

export const getAssets = async (siteId?: string) => {
    try {
        if (await syncService.getStatus().isOnline) {
            const assets = await assetsApi.getAll(siteId);
            // Update local storage
            // Note: bulk save might be needed for efficiency, but let's iterate for now
            // or better yet, just return the assets and let background sync handle it?
            // "Offline First" implies we read local.
            // But for Admin view, we often want fresh data.
            // Let's cache it to local storage.
            // We don't have a bulk save in storage.ts yet.
            // We'll stick to returning backend data and trying to cache it via cacheData (AsyncStorage) 
            // OR iterate saveAsset? Iterate is slow.
            // For now, let's keep the cacheData mechanism for read performance, 
            // but ideally we should move everything to SQLite.
            // Given the task scope, let's stick to the existing cache mechanism for reads 
            // but ensure we try backend first.
            await cacheData(`assets_cache_${siteId || 'all'}`, assets);
            return assets;
        }
    } catch (error) {
        console.error('Failed to fetch assets from backend, using cache:', error);
    }
    return await getCachedData(`assets_cache_${siteId || 'all'}`) || await localStorage.getAssets(siteId);
};

export const saveAsset = async (asset: any) => {
    try {
        const savedAsset = await assetsApi.create({
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

export const getSurveys = async () => {
    try {
        if (await syncService.getStatus().isOnline) {
            console.log('Fetching surveys from backend...');
            const surveys = await surveysApi.getAll();
            // Optional: Update local storage with fresh data
            // For now, we return backend data directly to ensure latest view
            return surveys;
        }
    } catch (error) {
        console.error('Failed to fetch surveys from backend:', error);
    }
    return await localStorage.getSurveys();
};

export const saveSurvey = async (survey: any) => {
    // Always save locally first
    await localStorage.saveSurvey(survey);
    // Trigger background sync
    syncService.syncAll().catch(console.error);
    return survey;
};

export const updateSurvey = async (id: string, data: any) => {
    // Always local first
    await localStorage.updateSurveyStatus(id, data.status);
    // Background sync
    syncService.syncAll().catch(console.error);
    return { id, ...data }; // Return optimistic result
};

export const deleteSurvey = async (id: string) => {
    try {
        if (await syncService.getStatus().isOnline) {
            await surveysApi.delete(id);
        }
    } catch (error) {
        console.error('Failed to delete survey from backend:', error);
        // Fallback? If backend fails, we might still want to delete locally 
        // but it creates sync issue. For now, log and proceed to local delete feels "safer" for UI 
        // but risks data reappearing. 
    }
    await localStorage.deleteSurvey(id);
};

// ==================== Inspections ====================

export const saveAssetInspection = async (inspection: any) => {
    // Always save locally first
    await localStorage.saveAssetInspection(inspection);
    // Trigger background sync
    syncService.syncAll().catch(console.error);
    return inspection;
};

export const getInspectionsForSurvey = async (surveyId: string) => {
    try {
        if (await syncService.getStatus().isOnline) {
            const inspections = await inspectionsApi.getBySurvey(surveyId);
            return inspections;
        }
    } catch (error) {
        console.error('Failed to fetch inspections from backend:', error);
    }
    return await localStorage.getInspectionsForSurvey(surveyId);
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
