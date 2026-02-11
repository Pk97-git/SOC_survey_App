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
        caption?: string
    ): Promise<Photo> {
        const formData = new FormData();

        // Create file object from URI
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

        const response = await api.post('/photos/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data.photo;
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
