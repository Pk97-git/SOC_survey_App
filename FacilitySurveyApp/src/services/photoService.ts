import { Platform } from 'react-native';
import api from './api';

export interface Photo {
    id: string;
    asset_inspection_id: string;
    survey_id: string;
    file_path: string;
    file_size?: number;
    caption?: string;
    uploaded_at: string;
}

export const photoService = {
    // Upload photo
    async uploadPhoto(
        assetInspectionId: string,
        surveyId: string,
        photoUri: string,
        caption?: string,
        assetId?: string
    ): Promise<Photo> {
        const formData = new FormData();

        if (Platform.OS === 'web') {
            // On web, we need to convert the blob URI to a real Blob object
            try {
                const response = await fetch(photoUri);
                const blob = await response.blob();
                
                // On web, blob URIs don't have extensions. Derive from MIME type.
                const type = blob.type || 'image/jpeg';
                const extension = type.split('/')[1] || 'jpg';
                const filename = `photo_${Date.now()}.${extension}`;
                
                formData.append('photo', blob, filename);
                formData.append('assetInspectionId', assetInspectionId);
                formData.append('surveyId', surveyId);
                if (caption) formData.append('caption', caption);
                if (assetId) formData.append('assetId', assetId);

                // Use fetch directly on web to avoid Axios boundary issues with FormData
                const uploadResponse = await fetch(`${api.defaults.baseURL}/photos/upload`, {
                    method: 'POST',
                    body: formData,
                    // Note: Credentials 'include' is crucial for cookie-based auth on web
                    credentials: 'include',
                });

                if (!uploadResponse.ok) {
                    const errorData = await uploadResponse.json().catch(() => ({}));
                    throw new Error(errorData.error || `Upload failed with status ${uploadResponse.status}`);
                }

                const result = await uploadResponse.json();
                return result.photo;
            } catch (error) {
                console.error('Error in web photo upload:', error);
                throw error;
            }
        } else {
            // Native (React Native)...
            const filename = photoUri.split('/').pop() || 'photo.jpg';
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : 'image/jpeg';

            formData.append('photo', {
                uri: photoUri,
                name: filename,
                type,
            } as any);

            formData.append('assetInspectionId', assetInspectionId);
            formData.append('surveyId', surveyId);
            if (caption) {
                formData.append('caption', caption);
            }
            if (assetId) {
                formData.append('assetId', assetId);
            }

            const response = await api.post('/photos/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            return response.data.photo;
        }
    },

    // Upload multiple photos and return server filenames/paths
    async processPhotos(
        assetInspectionId: string,
        surveyId: string,
        photos: string[],
        caption?: string,
        assetId?: string
    ): Promise<string[]> {
        if (!photos || photos.length === 0) return [];

        const processedPhotos: string[] = [];
        for (const uri of photos) {
            // If it's already a server path (starts with uploads/ or is a UUID)
            if (!uri.startsWith('blob:') && !uri.startsWith('file:') && !uri.startsWith('content:')) {
                processedPhotos.push(uri);
                continue;
            }

            try {
                console.log(`Uploading photo: ${uri}`);
                const uploaded = await this.uploadPhoto(assetInspectionId, surveyId, uri, caption, assetId);
                // Use the file_path returned by server
                processedPhotos.push(uploaded.file_path);
            } catch (error) {
                console.error(`Failed to upload photo ${uri}:`, error);
                // Keep the local URI for now, though it won't work on other devices
                processedPhotos.push(uri);
            }
        }
        return processedPhotos;
    },

    // Get photos for an inspection
    async getPhotosForInspection(inspectionId: string): Promise<Photo[]> {
        const response = await api.get(`/photos/inspection/${inspectionId}`);
        return response.data.photos;
    },

    // Get photo URL
    getPhotoUrl(photoId: string): string {
        return `${api.defaults.baseURL}/photos/${photoId}`;
    },

    // Delete photo
    async deletePhoto(id: string): Promise<void> {
        await api.delete(`/photos/${id}`);
    },
};
