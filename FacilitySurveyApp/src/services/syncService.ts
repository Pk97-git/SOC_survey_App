import NetInfo from '@react-native-community/netinfo';
import { DeviceEventEmitter, Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { storage } from './storage';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
import { surveyService } from './surveyService';
import { assetService } from './assetService';
import { photoService } from './photoService';
import { sitesApi, assetsApi, surveysApi, inspectionsApi, syncApi } from './api';

export interface SyncStatus {
    isOnline: boolean;
    lastSync: string | null;
    pendingUploads: number;
    isSyncing: boolean;
}

class SyncService {
    private syncStatus: SyncStatus = {
        isOnline: false,
        lastSync: null,
        pendingUploads: 0,
        isSyncing: false,
    };

    private isAuthenticated: boolean = false; // Controlled by AuthContext
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
     * Generic helper: iterate `items`, call `syncOne` for each, count transient failures.
     * 401 errors are treated as permanent (credentials expired) and not counted as retryable failures.
     */
    private async syncItems<T extends { id: string }>(
        items: T[],
        syncOne: (item: T) => Promise<void>
    ): Promise<number> {
        let failures = 0;
        for (const item of items) {
            try {
                await syncOne(item);
            } catch (error: any) {
                if (error?.response?.status === 401) {
                    console.warn(`⚠️ Item ${item.id} sync skipped: credentials expired`);
                } else {
                    console.error(`Failed to sync item ${item.id}:`, error);
                    failures++;
                }
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

                // 3. Upload pending photos
                const photoFailures = await this.uploadPendingPhotos();

                totalFailures = surveyFailures + inspectionFailures + photoFailures;
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
        // Fetch surveys once outside the loop — avoids N+1 DB reads
        const allSurveys = await storage.getSurveys();

        return this.syncItems(inspections, async (inspection) => {
            const survey = allSurveys.find(s => s.id === inspection.survey_id);

            if (!(survey as any)?.server_id) {
                console.log(`Skipping inspection ${inspection.id}: Survey not synced yet`);
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
                    }
                );
                await storage.updateInspectionServerId(inspection.id, serverInspection.id);
            }

            await storage.markInspectionSynced(inspection.id);
        });
    }

    private async uploadPendingPhotos(): Promise<number> {
        const photos = await storage.getPendingPhotos();
        // Fetch inspections once outside the loop — avoids N+1 DB reads
        const allInspections = await storage.getPendingInspections();

        return this.syncItems(photos, async (photo) => {
            const inspection = allInspections.find(i => i.id === photo.asset_inspection_id);

            if (!inspection?.server_id) {
                console.log(`Skipping photo ${photo.id}: Inspection not synced yet`);
                return;
            }

            const serverPhoto = await photoService.uploadPhoto(
                inspection.server_id,
                photo.survey_id,
                photo.file_path,
                photo.caption
            );

            await storage.updatePhotoServerId(photo.id, serverPhoto.id);
            await storage.markPhotoSynced(photo.id);
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
            console.log(`[SyncService] 🔄 Explicitly downloading data for Site ID: ${siteId}`);
            DeviceEventEmitter.emit('syncStatus', { status: 'syncing', message: 'Downloading Site Data...' });

            // 1. Download Surveys for this site
            const surveys = await surveysApi.getAll(siteId);
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
            const assets = await assetsApi.getAll(siteId);
            console.log(`[SyncService] 📥 Downloaded ${assets.length} assets for Site ${siteId}`);
            if (assets.length > 0) {
                await storage.saveAssetsBulk(assets);
            }

            // 3. Download Inspections for these surveys
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

            console.log(`[SyncService] ✅ Download complete for Site ${siteId}`);
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
