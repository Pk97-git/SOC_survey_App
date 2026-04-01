import NetInfo from '@react-native-community/netinfo';
import { DeviceEventEmitter, Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { storage } from './storage';

// Configure NetInfo to use the correct subfolder for reachability checks on Web.
// By default, it hits window.location.origin (which redirects to /cit-os/ and causes 502 errors).
if (Platform.OS === 'web') {
    NetInfo.configure({
        reachabilityUrl: '/socsurvey/',
        reachabilityTest: async (response) => response.status === 200,
        reachabilityLongTimeout: 60 * 1000, // 60s
        reachabilityShortTimeout: 5 * 1000, // 5s
        reachabilityRequestTimeout: 15 * 1000, // 15s
    });
}


const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function safeJsonParse(jsonString: string | null | undefined, fallback: any = undefined): any {
    if (!jsonString) return fallback;
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.warn('Failed to parse JSON safely, returning fallback:', jsonString);
        return fallback;
    }
}

import { surveyService } from './surveyService';
import { assetService } from './assetService';
import { photoService } from './photoService';
import { sitesApi, assetsApi, surveysApi, inspectionsApi, syncApi } from './api';

export type SyncStatus = {
    isOnline: boolean;
    lastSync: string | null;
    pendingUploads: number;
    isSyncing: boolean;
}

class SyncService {
    public syncStatus: SyncStatus = {
        isOnline: false,
        lastSync: null,
        pendingUploads: 0,
        isSyncing: false,
    };

    public isAuthenticated: boolean = false; // Controlled by AuthContext
    private isAdminUser: boolean = false; // Managed by AuthContext
    private listeners: ((status: SyncStatus) => void)[] = [];
    private netInfoUnsubscribe: (() => void) | null = null;

    get isOnline(): boolean {
        return this.syncStatus.isOnline;
    }

    constructor() {
        this.initNetworkListener();
    }

    // Initialize network listener
    private initNetworkListener() {
        // Listen for changes — addEventListener fires immediately with current state,
        // so no need for a separate NetInfo.fetch() call (which would double-trigger syncAll)
        this.netInfoUnsubscribe = NetInfo.addEventListener(state => {
            this.handleConnectivityChange(state.isConnected);
        });
    }

    private handleConnectivityChange(isConnected: boolean | null) {
        this.syncStatus.isOnline = !!isConnected;
        console.log(`Network status changed: ${this.syncStatus.isOnline ? 'Online' : 'Offline'}`);

        DeviceEventEmitter.emit('syncStatus', {
            status: this.syncStatus.isOnline ? 'online' : 'offline',
            message: this.syncStatus.isOnline ? 'Back Online' : 'You are Offline'
        });
        this.notifyListeners();

        if (this.syncStatus.isOnline) {
            this.syncAll();
        }
    }

    // Subscribe to sync status changes
    subscribe(listener: (status: SyncStatus) => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners() {
        this.listeners.forEach(listener => listener(this.syncStatus));
    }

    // Get current sync status
    getStatus(): SyncStatus {
        return { ...this.syncStatus };
    }

    // Update pending uploads count
    async updatePendingCount(): Promise<void> {
        try {
            const pendingSurveys = await storage.getPendingSurveys();
            const pendingInspections = await storage.getPendingInspections();
            const pendingPhotos = await storage.getPendingPhotos();

            this.syncStatus.pendingUploads =
                pendingSurveys.length +
                pendingInspections.length +
                pendingPhotos.length;

            this.notifyListeners();
        } catch (error) {
            console.error('Failed to update pending count:', error);
        }
    }

    // Log sync event to backend
    private async logSyncEvent(status: string, details?: any) {
        if (!this.syncStatus.isOnline) return;
        try {
            await syncApi.logEvent('sync', status, details);
        } catch (error: any) {
            if (error.response?.status !== 401) {
                console.warn('Failed to log sync event:', error);
            }
        }
    }

    /**
     * Generic helper: iterate `items`, call `syncOne` for each with up to MAX_RETRIES attempts.
     * 401 errors are treated as permanent (credentials expired) and not retried.
     */
    private async syncItems<T extends { id: string }>(
        items: T[],
        syncOne: (item: T) => Promise<void>
    ): Promise<number> {
        let failures = 0;
        for (const item of items) {
            let lastError: any;
            let succeeded = false;

            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    await syncOne(item);
                    succeeded = true;
                    break;
                } catch (error: any) {
                    if (error?.response?.status === 401) {
                        console.warn(`⚠️ Item ${item.id} sync skipped: credentials expired`);
                        succeeded = true; // Don't count as retryable failure
                        break;
                    }
                    lastError = error;
                    if (attempt < MAX_RETRIES) {
                        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                    }
                }
            }

            if (!succeeded) {
                console.error(`Failed to sync item ${item.id} after ${MAX_RETRIES} attempts:`, lastError);
                failures++;
            }
        }
        return failures;
    }

    // Called by AuthContext when the user logs in or out
    setAuthenticated(value: boolean, isAdminUser: boolean = false) {
        this.isAuthenticated = value;
        this.isAdminUser = isAdminUser;
    }

    // Sync all pending data
    async syncAll(): Promise<void> {
        // Hard gate: don't sync if user is not authenticated or is an admin (Admins manage via live API)
        if (!this.isAuthenticated || this.isAdminUser || this.syncStatus.isSyncing || !this.syncStatus.isOnline) {
            return;
        }

        this.syncStatus.isSyncing = true;
        console.log('🔄 Starting sync...');
        DeviceEventEmitter.emit('syncStatus', { status: 'syncing', message: 'Syncing data...' });
        this.notifyListeners();

        await this.logSyncEvent('started');

        try {
            let totalFailures = 0;

            // Web/ExpoGo is API-first. Only native platforms use Offline Storage pushing.
            if (Platform.OS !== 'web' && !isExpoGo) {
                // 1. Upload pending surveys
                const surveyFailures = await this.uploadPendingSurveys();

                // 2. Upload pending inspections
                const inspectionFailures = await this.uploadPendingInspections();

                totalFailures = surveyFailures + inspectionFailures;
                this.syncStatus.pendingUploads = totalFailures;
            }

            // 4. Download updates from server (All Platforms need updated Catalogs)
            await this.downloadUpdates();

            this.syncStatus.lastSync = new Date().toISOString();

            if (totalFailures > 0) {
                console.warn(`⚠️ Sync completed with ${totalFailures} item(s) that could not be uploaded`);
                DeviceEventEmitter.emit('syncStatus', { status: 'partial', message: `Sync complete — ${totalFailures} item(s) pending` });
                await this.logSyncEvent('completed_partial', { lastSync: this.syncStatus.lastSync, failedItems: totalFailures });
            } else {
                console.log('✅ Sync complete');
                DeviceEventEmitter.emit('syncStatus', { status: 'synced', message: 'Sync Complete' });
                await this.logSyncEvent('completed', { lastSync: this.syncStatus.lastSync });
            }

        } catch (error: any) {
            if (error.response?.status !== 401) {
                console.error('Sync failed:', error);
            }
            DeviceEventEmitter.emit('syncStatus', { status: 'error', message: 'Sync Failed' });
            await this.logSyncEvent('failed', { error: error.message || String(error) });
        } finally {
            this.syncStatus.isSyncing = false;
            this.notifyListeners();
        }
    }

    private async uploadPendingSurveys(): Promise<number> {
        // Get surveys that haven't been synced (synced=0 means locally created, not yet uploaded)
        const surveys = await storage.getSurveys();
        const pendingSurveys = surveys.filter(s => !(s as any).synced || (s as any).synced === 0);

        console.log(`📤 Uploading ${pendingSurveys.length} pending surveys...`);

        let failures = 0;
        for (const survey of pendingSurveys) {
            try {
                let serverSurvey;

                if ((survey as any).server_id) {
                    // Update existing
                    serverSurvey = await surveyService.updateSurvey(
                        (survey as any).server_id,
                        survey.trade,
                        survey.status
                    );
                } else {
                    // Create new
                    console.log(`Creating survey on backend: ${survey.id} (trade: ${survey.trade})`);

                    serverSurvey = await surveyService.createSurvey(
                        (survey as any).site_id!,
                        survey.trade
                    );

                    // Save server ID to local record
                    await storage.updateSurveyServerId(survey.id, serverSurvey.id);
                    console.log(`✅ Survey ${survey.id} created with server ID: ${serverSurvey.id}`);
                }

                // Mark as synced
                await storage.markSurveySynced(survey.id);
            } catch (error: any) {
                const status = error?.response?.status;
                if (status === 401) {
                    // Permanent auth failure — mark as dead-letter to stop retrying
                    const reason = `401 Unauthorized — credentials expired. Created at: ${survey.created_at}`;
                    console.warn(`⚠️ Survey ${survey.id} marked as permanently failed: ${reason}`);
                    await storage.markSurveyFailed(survey.id, reason);
                } else {
                    // Transient error — will retry on next sync cycle
                    console.error(`Failed to sync survey ${survey.id}:`, error);
                    failures++;
                }
            }
        }
        return failures;
    }

    private async uploadPendingInspections(): Promise<number> {
        const inspections = await storage.getPendingInspections();

        return this.syncItems(inspections, async (inspection) => {
            // Look up the survey fresh per-inspection to avoid a TOCTOU race:
            // a single getSurveys() snapshot taken before the loop would become
            // stale if a survey is deleted or de-synced during iteration,
            // silently producing orphaned inspections.
            const survey = await storage.getSurveyById(inspection.survey_id);

            if (!(survey as any)?.server_id) {
                console.log(`Skipping inspection ${inspection.id}: Survey not synced yet or no longer exists`);
                return;
            }

            let serverInspection;
            if ((inspection as any).server_id) {
                // Update existing
                serverInspection = await assetService.updateInspection(
                    (inspection as any).server_id,
                    {
                        conditionRating: inspection.condition_rating,
                        overallCondition: inspection.overall_condition,
                        quantityInstalled: inspection.quantity_installed,
                        quantityWorking: inspection.quantity_working,
                        remarks: inspection.remarks,
                        gpsLat: inspection.gps_lat,
                        gpsLng: inspection.gps_lng,
                        magReview: safeJsonParse(inspection.mag_review),
                        citReview: safeJsonParse(inspection.cit_review),
                        dgdaReview: safeJsonParse(inspection.dgda_review),
                    }
                );
            } else {
                // Create new
                serverInspection = await assetService.createInspection(
                    (survey as any).server_id,
                    {
                        assetId: inspection.asset_id,
                        conditionRating: inspection.condition_rating,
                        overallCondition: inspection.overall_condition,
                        quantityInstalled: inspection.quantity_installed,
                        quantityWorking: inspection.quantity_working,
                        remarks: inspection.remarks,
                        gpsLat: inspection.gps_lat,
                        gpsLng: inspection.gps_lng,
                        magReview: safeJsonParse(inspection.mag_review),
                        citReview: safeJsonParse(inspection.cit_review),
                        dgdaReview: safeJsonParse(inspection.dgda_review),
                    }
                );
                await storage.updateInspectionServerId(inspection.id, serverInspection.id);
            }

            await storage.markInspectionSynced(inspection.id);

            // --- Upload photos stored inside the inspection record ---
            // On mobile, PhotoPicker saves local file:// URIs inside the inspection.
            // We upload them now, and if successful, we *replace* the local file URI
            // with the remote backend path in SQLite to prevent duplicate uploads later.
            const serverInspectionId = serverInspection?.id || (inspection as any).server_id;
            const surveyServerId = (survey as any).server_id;
            
            if (serverInspectionId && surveyServerId) {
                let updatedInspection = { ...inspection, server_id: serverInspectionId };
                let anyPhotoFailed = false;

                const uploadAndStep = async (rawPhotos: any, label: string) => {
                    let uris: string[] = [];
                    if (typeof rawPhotos === 'string') {
                        try { uris = JSON.parse(rawPhotos); } catch { /* ignore */ }
                    } else if (Array.isArray(rawPhotos)) {
                        uris = rawPhotos;
                    }
                    
                    const hasLocal = (photos: string[]) => (photos || []).some(p => p.startsWith('blob:') || p.startsWith('data:') || p.startsWith('file:') || p.startsWith('content:'));
                    if (!hasLocal(uris)) return uris;
                    
                    const result: string[] = [];
                    for (const uri of uris) {
                        if (uri.startsWith('blob:') || uri.startsWith('file:') || uri.startsWith('data:') || uri.startsWith('content:')) {
                            try {
                                const uploaded = await photoService.uploadPhoto(serverInspectionId, surveyServerId, uri);
                                // Save the full API URL (e.g., .../api/photos/UUID) into the inspection's photo array.
                                // This ensures that when the app reloads this record from SQLite, it has a valid URL.
                                const photoUrl = photoService.getPhotoUrl(uploaded.id);
                                result.push(photoUrl);
                            } catch (err) {
                                console.error(`[SyncService] Failed to upload ${label} photo:`, err);
                                result.push(uri); // Keep local for retry on next sync cycle
                                anyPhotoFailed = true;
                            }
                        } else {
                            result.push(uri);
                        }
                    }
                    return result;
                };

                updatedInspection.photos = await uploadAndStep(inspection.photos, 'Surveyor');

                if (inspection.mag_review) {
                    const parsed = typeof inspection.mag_review === 'string' ? safeJsonParse(inspection.mag_review) : inspection.mag_review;
                    if (parsed?.photos) {
                        parsed.photos = await uploadAndStep(parsed.photos, 'MAG');
                        updatedInspection.mag_review = parsed;
                    }
                }
                if (inspection.cit_review) {
                    const parsed = typeof inspection.cit_review === 'string' ? safeJsonParse(inspection.cit_review) : inspection.cit_review;
                    if (parsed?.photos) {
                        parsed.photos = await uploadAndStep(parsed.photos, 'CIT');
                        updatedInspection.cit_review = parsed;
                    }
                }
                if (inspection.dgda_review) {
                    const parsed = typeof inspection.dgda_review === 'string' ? safeJsonParse(inspection.dgda_review) : inspection.dgda_review;
                    if (parsed?.photos) {
                        parsed.photos = await uploadAndStep(parsed.photos, 'DGDA');
                        updatedInspection.dgda_review = parsed;
                    }
                }

                // Save back progress (new server paths) regardless of failure,
                // but ONLY mark as synced: true if 100% of photos succeeded.
                await storage.saveAssetInspection({ ...updatedInspection, synced: !anyPhotoFailed });
            }
        });
    }

    private async downloadUpdates(): Promise<void> {
        try {
            console.log('🔄 Downloading updates from server...');

            // 1. Download Sites (Lightweight, needed for search/selection)
            const sites = await sitesApi.getAll();
            console.log(`📥 Downloaded ${sites.length} sites`);
            for (const site of sites) {
                await storage.saveSite(site);
            }

            console.log('✅ Download sync complete (Base Master Data Only)');
        } catch (error: any) {
            if (error.response?.status !== 401) {
                console.error('Failed to download updates:', error);
            }
            // Don't throw, partial sync is better than none
        }
    }

    // Explicitly download all Surveys, Assets, and Inspections for a single specific site
    async downloadSiteData(siteId: string): Promise<void> {
        if (!this.syncStatus.isOnline) {
            throw new Error('Must be online to download site data');
        }

        try {
            const since = await storage.getSiteLastSyncTime(siteId);
            const syncType = since ? 'Incremental' : 'Full';

            console.log(`[SyncService] 🔄 ${syncType} download for Site ID: ${siteId}${(since ? ` since ${since}` : '')}`);
            DeviceEventEmitter.emit('syncStatus', { status: 'syncing', message: `${syncType} Sync...` });

            // 1. Download Surveys for this site
            const surveys = await surveysApi.getAll(siteId, since);
            console.log(`[SyncService] 📥 Downloaded ${surveys.length} surveys for Site ${siteId}`);
            for (const survey of surveys) {
                await storage.saveSurvey({
                    ...survey,
                    created_at: survey.created_at ? new Date(survey.created_at).toISOString() : new Date().toISOString(),
                    updated_at: survey.updated_at ? new Date(survey.updated_at).toISOString() : new Date().toISOString(),
                    synced: 1,
                    server_id: survey.id,
                } as any);
            }

            // 2. Download Assets for this site
            const assets = await assetsApi.getAll(siteId, since);
            console.log(`[SyncService] 📥 Downloaded ${assets.length} assets for Site ${siteId}`);
            if (assets.length > 0) {
                await storage.saveAssetsBulk(assets);
            }

            // 3. Download Inspections ONLY for the newly fetched surveys
            // (Inspections don't have their own updated_at top-level endpoint yet, so we sync them
            // whenever their parent survey has been updated, which covers edits effectively)
            if (surveys.length > 0) {
                try {
                    const surveyIds = surveys.map((s: any) => s.id);
                    const allInspections = await inspectionsApi.getBulk(surveyIds);
                    console.log(`[SyncService] 📥 Downloaded ${allInspections.length} inspections for Site ${siteId}`);
                    for (const inspection of allInspections) {
                        await storage.saveAssetInspection({
                            ...inspection,
                            server_id: (inspection as any).id,
                            synced: 1,
                            asset_inspection_id: (inspection as any).id,
                        });
                    }
                } catch (e) {
                    console.warn('[SyncService] Failed to bulk-download inspections', e);
                }
            }

            console.log(`[SyncService] ✅ ${syncType} download complete for Site ${siteId}`);
            DeviceEventEmitter.emit('syncStatus', { status: 'synced', message: 'Site Ready for Offline Use' });

        } catch (error) {
            console.error(`[SyncService] Failed to download site data for ${siteId}:`, error);
            DeviceEventEmitter.emit('syncStatus', { status: 'error', message: 'Download Failed' });
            throw error;
        }
    }

    // Manual sync trigger
    async manualSync(): Promise<void> {
        if (!this.syncStatus.isOnline) {
            throw new Error('No internet connection');
        }

        await this.syncAll();
    }

    // Release the NetInfo listener — call this on app teardown to prevent leaks
    destroy(): void {
        this.netInfoUnsubscribe?.();
        this.netInfoUnsubscribe = null;
        this.listeners = [];
    }
}

export const syncService = new SyncService();
