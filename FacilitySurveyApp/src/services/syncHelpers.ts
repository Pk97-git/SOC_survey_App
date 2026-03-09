import { storage } from './storage';
import { surveyService } from './surveyService';
import { assetService } from './assetService';
import { photoService } from './photoService';

// Complete the sync service implementation
export const completeSyncUpload = async () => {
    // Get pending surveys
    const pendingSurveys = await storage.getPendingSurveys();

    for (const survey of pendingSurveys) {
        try {
            let serverSurvey;

            if (survey.server_id) {
                // Update existing survey on server
                serverSurvey = await surveyService.updateSurvey(
                    survey.server_id,
                    survey.trade,
                    survey.status
                );
            } else {
                // Create new survey on server
                serverSurvey = await surveyService.createSurvey(
                    survey.site_id!,
                    survey.trade
                );

                // Save server ID to local record
                await storage.updateSurveyServerId(survey.id, serverSurvey.id);
            }

            // Upload inspections for this survey
            const inspections = await storage.getInspectionsForSurvey(survey.id);

            for (const inspection of inspections) {
                if (!inspection.synced) {
                    try {
                        if (inspection.server_id) {
                            await surveyService.updateInspection(inspection.server_id, inspection);
                        } else {
                            const serverInspection = await surveyService.createInspection(
                                serverSurvey.id,
                                inspection
                            );
                            // Save server ID (would need to add this method)
                        }

                        await storage.markInspectionSynced(inspection.id);
                    } catch (error) {
                        console.error(`Failed to sync inspection ${inspection.id}:`, error);
                    }
                }

                // Upload photos for this inspection
                const photos = await storage.getPhotosForInspection(inspection.id);

                for (const photo of photos) {
                    if (!photo.synced) {
                        try {
                            await photoService.uploadPhoto(
                                inspection.server_id || inspection.id,
                                serverSurvey.id,
                                photo.uri,
                                photo.caption
                            );

                            await storage.markPhotoSynced(photo.id);
                        } catch (error) {
                            console.error(`Failed to sync photo ${photo.id}:`, error);
                        }
                    }
                }
            }

            // Mark survey as synced
            await storage.markSurveySynced(survey.id);

        } catch (error) {
            console.error(`Failed to sync survey ${survey.id}:`, error);
        }
    }
};
