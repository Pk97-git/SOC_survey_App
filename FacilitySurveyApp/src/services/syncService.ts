import NetInfo from '@react-native-community/netinfo';
import { DeviceEventEmitter } from 'react-native';
import { storage } from './storage';
import { surveyService } from './surveyService';
import { assetService } from './assetService';
import { photoService } from './photoService';
import { sitesApi, assetsApi, surveysApi, inspectionsApi } from './api';

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

    private listeners: ((status: SyncStatus) => void)[] = [];
    private unsubscribe: (() => void) | null = null; // To store the NetInfo listener unsubscribe function

    get isOnline(): boolean {
        return this.syncStatus.isOnline;
    }

    constructor() {
        this.initNetworkListener();
    }

    // Initialize network listener
    private initNetworkListener() {
        // Initial check
        NetInfo.fetch().then(state => {
            this.handleConnectivityChange(state.isConnected);
        });

        // Listen for changes
        this.unsubscribe = NetInfo.addEventListener(state => {
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
        } catch (error) {
            console.warn('Failed to log sync event:', error);
        }
    }

    // Sync all pending data
    async syncAll(): Promise<void> {
        if (this.syncStatus.isSyncing || !this.syncStatus.isOnline) {
            return;
        }

        this.syncStatus.isSyncing = true;
        console.log('🔄 Starting sync...');
        DeviceEventEmitter.emit('syncStatus', { status: 'syncing', message: 'Syncing data...' });
        this.notifyListeners();

        await this.logSyncEvent('started');

        try {
            // 1. Upload pending surveys
            await this.uploadPendingSurveys();

            // 2. Upload pending inspections
            await this.uploadPendingInspections();

            // 3. Upload pending photos
            await this.uploadPendingPhotos();

            // 4. Download updates from server
            await this.downloadUpdates();

            this.syncStatus.lastSync = new Date().toISOString();
            this.syncStatus.pendingUploads = 0;

            console.log('✅ Sync complete');
            DeviceEventEmitter.emit('syncStatus', { status: 'synced', message: 'Sync Complete' });
            await this.logSyncEvent('completed', { lastSync: this.syncStatus.lastSync });

        } catch (error: any) {
            console.error('Sync failed:', error);
            DeviceEventEmitter.emit('syncStatus', { status: 'error', message: 'Sync Failed' });
            await this.logSyncEvent('failed', { error: error.message || String(error) });
            throw error;
        } finally {
            this.syncStatus.isSyncing = false;
            this.notifyListeners();
        }
    }

    private async uploadPendingSurveys(): Promise<void> {
        // Get surveys that haven't been synced
        const surveys = await storage.getSurveys();
        const pendingSurveys = surveys.filter(s => !(s as any).synced && s.status === 'submitted');

        for (const survey of pendingSurveys) {
            try {
                // Check if survey exists on server (by local ID or server ID)
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
                    serverSurvey = await surveyService.createSurvey(
                        (survey as any).site_id!,
                        survey.trade
                    );

                    // Save server ID to local record
                    await storage.updateSurveyServerId(survey.id, serverSurvey.id);
                }

                // Mark as synced
                await storage.markSurveySynced(survey.id);
            } catch (error) {
                console.error(`Failed to sync survey ${survey.id}:`, error);
            }
        }
    }

    private async uploadPendingInspections(): Promise<void> {
        const inspections = await storage.getPendingInspections();

        for (const inspection of inspections) {
            try {
                // Use the survey's server_id to upload inspection
                const survey = await storage.getSurveys().then(surveys =>
                    surveys.find(s => s.id === inspection.survey_id)
                );

                if (!(survey as any)?.server_id) {
                    console.log(`Skipping inspection ${inspection.id}: Survey not synced yet`);
                    continue;
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

                    // Save server ID
                    await storage.updateInspectionServerId(inspection.id, serverInspection.id);
                }

                // Mark as synced
                await storage.markInspectionSynced(inspection.id);
            } catch (error) {
                console.error(`Failed to sync inspection ${inspection.id}:`, error);
            }
        }
    }

    private async uploadPendingPhotos(): Promise<void> {
        const photos = await storage.getPendingPhotos();

        for (const photo of photos) {
            try {
                // Get the inspection's server_id
                const inspections = await storage.getPendingInspections();
                const inspection = inspections.find(i => i.id === photo.asset_inspection_id);

                if (!inspection?.server_id) {
                    console.log(`Skipping photo ${photo.id}: Inspection not synced yet`);
                    continue;
                }

                // Upload photo
                const serverPhoto = await photoService.uploadPhoto(
                    inspection.server_id,
                    photo.survey_id,
                    photo.file_path,
                    photo.caption
                );

                // Save server ID
                await storage.updatePhotoServerId(photo.id, serverPhoto.id);

                // Mark as synced
                await storage.markPhotoSynced(photo.id);
            } catch (error) {
                console.error(`Failed to sync photo ${photo.id}:`, error);
            }
        }
    }

    private async downloadUpdates(): Promise<void> {
        try {
            console.log('🔄 Downloading updates from server...');

            // 1. Download Sites
            const sites = await sitesApi.getAll();
            console.log(`📥 Downloaded ${sites.length} sites`);
            for (const site of sites) {
                await storage.saveSite(site);
            }

            // 2. Download Assets
            const assets = await assetsApi.getAll();
            console.log(`📥 Downloaded ${assets.length} assets`);
            for (const asset of assets) {
                await storage.saveAsset(asset);
            }

            // 3. Download Surveys
            const surveys = await surveysApi.getAll();
            console.log(`📥 Downloaded ${surveys.length} surveys`);
            for (const survey of surveys) {
                // Save survey to local storage. 
                await storage.saveSurvey({
                    ...survey,
                    id: survey.id, // Ensure ID matches
                    synced: 1,
                    server_id: survey.id
                });

                // 4. Download Inspections for this Survey
                try {
                    const inspections = await inspectionsApi.getBySurvey(survey.id);
                    for (const inspection of inspections) {
                        await storage.saveAssetInspection({
                            ...inspection,
                            survey_id: survey.id,
                            server_id: inspection.id,
                            synced: 1,
                            asset_inspection_id: inspection.id
                        });
                    }
                } catch (e) {
                    // Inspections might not exist or fail
                    console.warn(`Failed to get inspections for survey ${survey.id}`, e);
                }
            }

            console.log('✅ Download sync complete');
        } catch (error) {
            console.error('Failed to download updates:', error);
            // Don't throw, partial sync is better than none
        }
    }

    // Manual sync trigger
    async manualSync(): Promise<void> {
        if (!this.syncStatus.isOnline) {
            throw new Error('No internet connection');
        }

        await this.syncAll();
    }
}

export const syncService = new SyncService();
