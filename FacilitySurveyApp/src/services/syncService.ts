import NetInfo from '@react-native-community/netinfo';
import { storage } from './storage';
import { surveyService } from './surveyService';
import { assetService } from './assetService';
import { photoService } from './photoService';

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

    constructor() {
        this.initNetworkListener();
    }

    // Initialize network listener
    private initNetworkListener() {
        NetInfo.addEventListener(state => {
            this.syncStatus.isOnline = state.isConnected || false;
            this.notifyListeners();

            // Auto-sync when coming online
            if (state.isConnected) {
                this.syncAll();
            }
        });
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

    // Sync all pending data
    async syncAll(): Promise<void> {
        if (this.syncStatus.isSyncing || !this.syncStatus.isOnline) {
            return;
        }

        this.syncStatus.isSyncing = true;
        this.notifyListeners();

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
        } catch (error) {
            console.error('Sync error:', error);
            throw error;
        } finally {
            this.syncStatus.isSyncing = false;
            this.notifyListeners();
        }
    }

    private async uploadPendingSurveys(): Promise<void> {
        // Get surveys that haven't been synced
        const surveys = await storage.getSurveys();
        const pendingSurveys = surveys.filter(s => !s.synced && s.status === 'submitted');

        for (const survey of pendingSurveys) {
            try {
                // Check if survey exists on server (by local ID or server ID)
                let serverSurvey;

                if (survey.server_id) {
                    // Update existing
                    serverSurvey = await surveyService.updateSurvey(
                        survey.server_id,
                        survey.trade,
                        survey.status
                    );
                } else {
                    // Create new
                    serverSurvey = await surveyService.createSurvey(
                        survey.site_id!,
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

                if (!survey?.server_id) {
                    console.log(`Skipping inspection ${inspection.id}: Survey not synced yet`);
                    continue;
                }

                let serverInspection;
                if (inspection.server_id) {
                    // Update existing
                    serverInspection = await assetService.updateInspection(
                        inspection.server_id,
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
                        survey.server_id,
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
            // Download sites and assets that might have been updated
            // This is useful for getting latest asset data before going offline
            const sites = await storage.getSites();

            // For now, we focus on upload sync
            // Download sync can be implemented when needed for collaborative editing
            console.log('Download sync - sites available:', sites.length);
        } catch (error) {
            console.error('Failed to download updates:', error);
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
