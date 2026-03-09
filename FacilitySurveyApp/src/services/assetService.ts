import api from './api';

export interface Asset {
    id: string;
    site_id?: string;
    site_name?: string;
    ref_code?: string;
    name: string;
    service_line?: string;
    floor?: string;
    area?: string;
    age?: string;
    description?: string;
    created_at: string;
}

export const assetService = {
    // Get all assets (with optional site filter)
    async getAssets(siteId?: string): Promise<Asset[]> {
        const params = siteId ? { siteId } : {};
        const response = await api.get('/assets', { params });
        return response.data.assets;
    },

    // Get asset by ID
    async getAssetById(id: string): Promise<Asset> {
        const response = await api.get(`/assets/${id}`);
        return response.data.asset;
    },

    // Create asset
    async createAsset(asset: Partial<Asset>): Promise<Asset> {
        const response = await api.post('/assets', {
            siteId: asset.site_id,
            refCode: asset.ref_code,
            name: asset.name,
            serviceLine: asset.service_line,
            floor: asset.floor,
            area: asset.area,
            age: asset.age,
            description: asset.description,
        });
        return response.data.asset;
    },

    // Bulk import assets
    async bulkImportAssets(siteId: string, assets: Partial<Asset>[]): Promise<Asset[]> {
        const response = await api.post('/assets/bulk-import', {
            siteId,
            assets: assets.map(a => ({
                refCode: a.ref_code,
                name: a.name,
                serviceLine: a.service_line,
                floor: a.floor,
                area: a.area,
                age: a.age,
                description: a.description,
            })),
        });
        return response.data.assets;
    },

    // Update asset
    async updateAsset(id: string, asset: Partial<Asset>): Promise<Asset> {
        const response = await api.put(`/assets/${id}`, {
            refCode: asset.ref_code,
            name: asset.name,
            serviceLine: asset.service_line,
            floor: asset.floor,
            area: asset.area,
            age: asset.age,
            description: asset.description,
        });
        return response.data.asset;
    },

    // Delete asset
    async deleteAsset(id: string): Promise<void> {
        await api.delete(`/assets/${id}`);
    },

    // Create asset inspection
    async createInspection(surveyId: string, data: any): Promise<any> {
        const response = await api.post(`/surveys/${surveyId}/inspections`, data);
        return response.data.inspection;
    },

    // Update asset inspection
    async updateInspection(inspectionId: string, data: any): Promise<any> {
        const response = await api.put(`/surveys/inspections/${inspectionId}`, data);
        return response.data.inspection;
    },
};
