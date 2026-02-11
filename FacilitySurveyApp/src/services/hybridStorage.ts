import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sitesApi, assetsApi, surveysApi, inspectionsApi } from './api';
import { storage as localStorage } from './storage';

// Feature flag to enable/disable backend integration
const USE_BACKEND = true; // Set to false to use local storage only

/**
 * Hybrid Storage Service
 * - Admin operations (Sites, Assets, Surveys creation) use backend API
 * - Field operations (Inspections, Photos) use local storage with sync queue
 *   (Now updated to support direct backend access if online)
 */

// ==================== Sites ====================

export const getSites = async () => {
    if (USE_BACKEND) {
        try {
            const sites = await sitesApi.getAll();
            // Cache locally for offline access
            await cacheData('sites_cache', sites);
            return sites;
        } catch (error) {
            console.error('Failed to fetch sites from backend, using cache:', error);
            return await getCachedData('sites_cache') || [];
        }
    }
    return await localStorage.getSites();
};

export const saveSite = async (site: any) => {
    if (USE_BACKEND) {
        try {
            const savedSite = await sitesApi.create({
                name: site.name,
                location: site.location,
            });
            // Update cache
            const cached = await getCachedData('sites_cache') || [];
            cached.unshift(savedSite);
            await cacheData('sites_cache', cached);
            return savedSite;
        } catch (error) {
            console.error('Failed to save site to backend:', error);
            throw error;
        }
    }
    return await localStorage.saveSite(site);
};

export const updateSite = async (id: string, data: any) => {
    if (USE_BACKEND) {
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
    }
    // Local storage doesn't support update, would need to implement
    throw new Error('Update site not supported in local mode');
};

export const deleteSite = async (id: string) => {
    if (USE_BACKEND) {
        try {
            await sitesApi.delete(id);
            // Update cache
            const cached = await getCachedData('sites_cache') || [];
            const filtered = cached.filter((s: any) => s.id !== id);
            await cacheData('sites_cache', filtered);
        } catch (error) {
            console.error('Failed to delete site:', error);
            throw error;
        }
    } else {
        await localStorage.deleteSite(id);
    }
};

// ==================== Assets ====================

export const getAssets = async (siteId?: string) => {
    if (USE_BACKEND) {
        try {
            const assets = await assetsApi.getAll(siteId);
            // Cache locally
            await cacheData(`assets_cache_${siteId || 'all'}`, assets);
            return assets;
        } catch (error) {
            console.error('Failed to fetch assets from backend, using cache:', error);
            return await getCachedData(`assets_cache_${siteId || 'all'}`) || [];
        }
    }
    return await localStorage.getAssets();
};

export const saveAsset = async (asset: any) => {
    if (USE_BACKEND) {
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
            return savedAsset;
        } catch (error) {
            console.error('Failed to save asset to backend:', error);
            throw error;
        }
    }
    return await localStorage.saveAsset(asset);
};

export const updateAsset = async (id: string, asset: any) => {
    if (USE_BACKEND) {
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
            return updatedAsset;
        } catch (error) {
            console.error('Failed to update asset:', error);
            throw error;
        }
    }
    // Local storage update fallback
    return await localStorage.saveAsset({ ...asset, id });
};

export const bulkImportAssets = async (siteId: string, assets: any[]) => {
    if (USE_BACKEND) {
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
                // Ensure duplicate name logic if needed
            }));

            const savedAssets = await assetsApi.bulkImport(siteId, backendAssets);

            // Cache the imported assets
            await cacheData(`assets_cache_${siteId}`, savedAssets);

            return savedAssets;
        } catch (error) {
            console.error('Failed to bulk import assets to backend:', error);
            throw error;
        }
    }

    // Fallback to local storage
    for (const asset of assets) {
        await localStorage.saveAsset(asset);
    }
    return assets;
};

export const uploadAssetFile = async (siteId: string, fileUri: string, onProgress?: (progress: number) => void) => {
    if (USE_BACKEND) {
        try {
            return await assetsApi.uploadExcel(siteId, fileUri, onProgress);
        } catch (error) {
            console.error('Failed to upload asset file:', error);
            throw error;
        }
    }
    throw new Error('File upload not supported in local mode');
};

export const deleteAsset = async (id: string) => {
    if (USE_BACKEND) {
        try {
            await assetsApi.delete(id);
        } catch (error) {
            console.error('Failed to delete asset:', error);
            throw error;
        }
    } else {
        await localStorage.deleteAsset(id);
    }
};

// ==================== Surveys ====================

export const getSurveys = async () => {
    if (USE_BACKEND) {
        try {
            const surveys = await surveysApi.getAll();
            await cacheData('surveys_cache', surveys);
            return surveys;
        } catch (error) {
            console.error('Failed to fetch surveys from backend, using cache:', error);
            return await getCachedData('surveys_cache') || [];
        }
    }
    return await localStorage.getSurveys();
};

export const saveSurvey = async (survey: any) => {
    if (USE_BACKEND) {
        try {
            const savedSurvey = await surveysApi.create({
                siteId: survey.site_id,
                trade: survey.trade,
            });
            // Update cache (optional but recommended)
            return savedSurvey;
        } catch (error) {
            console.error('Failed to save survey to backend:', error);
            throw error;
        }
    }
    return await localStorage.saveSurvey(survey);
};

export const updateSurvey = async (id: string, data: any) => {
    if (USE_BACKEND) {
        try {
            return await surveysApi.update(id, data);
        } catch (error) {
            console.error('Failed to update survey:', error);
            throw error;
        }
    }
    // Use updateSurveyStatus for local storage
    return await localStorage.updateSurveyStatus(id, data.status);
};

export const deleteSurvey = async (id: string) => {
    if (USE_BACKEND) {
        try {
            await surveysApi.delete(id);
        } catch (error) {
            console.error('Failed to delete survey:', error);
            throw error;
        }
    } else {
        await localStorage.deleteSurvey(id);
    }
};

// ==================== Inspections ====================

export const saveAssetInspection = async (inspection: any) => {
    if (USE_BACKEND) {
        try {
            // Check if update or create
            // If id starts with 'inspection_', it's local.
            // But if we are in backend mode, we assume we have backend IDs.
            if (inspection.id && !String(inspection.id).startsWith('inspection_')) {
                return await inspectionsApi.update(inspection.id, {
                    conditionRating: inspection.condition_rating,
                    overallCondition: inspection.overall_condition,
                    quantityInstalled: inspection.quantity_installed,
                    quantityWorking: inspection.quantity_working,
                    remarks: inspection.remarks,
                    gpsLat: inspection.gps_lat,
                    gpsLng: inspection.gps_lng
                });
            } else {
                return await inspectionsApi.create(inspection.survey_id, {
                    assetId: inspection.asset_id,
                    conditionRating: inspection.condition_rating,
                    overallCondition: inspection.overall_condition,
                    quantityInstalled: inspection.quantity_installed,
                    quantityWorking: inspection.quantity_working,
                    remarks: inspection.remarks,
                    gpsLat: inspection.gps_lat,
                    gpsLng: inspection.gps_lng
                });
            }
        } catch (error) {
            console.error('Failed to save inspection to backend:', error);
            throw error;
        }
    }
    return await localStorage.saveAssetInspection(inspection);
};

export const getInspectionsForSurvey = async (surveyId: string) => {
    if (USE_BACKEND) {
        try {
            const inspections = await inspectionsApi.getBySurvey(surveyId);
            return inspections;
        } catch (error) {
            console.error('Failed to fetch inspections from backend:', error);
            return await localStorage.getInspectionsForSurvey(surveyId);
        }
    }
    return await localStorage.getInspectionsForSurvey(surveyId);
};

// ==================== Photos ====================

export const savePhoto = localStorage.savePhoto.bind(localStorage);
// TODO: Implement backend photo upload
export const getPhotosForInspection = localStorage.getPhotosForInspection.bind(localStorage);
export const deletePhoto = async (photoId: string) => {
    console.warn('Delete photo not implemented');
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
