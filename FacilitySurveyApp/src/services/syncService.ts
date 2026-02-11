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
        // Similar logic for inspections
        // TODO: Implement based on your storage structure
    }

    private async uploadPendingPhotos(): Promise<void> {
        // Similar logic for photos
        // TODO: Implement based on your storage structure
    }

    private async downloadUpdates(): Promise<void> {
        // Download surveys, inspections, and photos updated since last sync
        // TODO: Implement based on your requirements
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
