import api from './api';

export interface Site {
    id: string;
    name: string;
    location?: string;
    created_by?: string;
    created_by_name?: string;
    created_at: string;
}

export const siteService = {
    // Get all sites
    async getSites(): Promise<Site[]> {
        const response = await api.get('/sites');
        return response.data.sites;
    },

    // Get site by ID
    async getSiteById(id: string): Promise<Site> {
        const response = await api.get(`/sites/${id}`);
        return response.data.site;
    },

    // Create site
    async createSite(name: string, location?: string): Promise<Site> {
        const response = await api.post('/sites', { name, location });
        return response.data.site;
    },

    // Update site
    async updateSite(id: string, name?: string, location?: string): Promise<Site> {
        const response = await api.put(`/sites/${id}`, { name, location });
        return response.data.site;
    },

    // Delete site
    async deleteSite(id: string): Promise<void> {
        await api.delete(`/sites/${id}`);
    },
};
