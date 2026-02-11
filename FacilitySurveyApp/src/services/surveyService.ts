import api from './api';

export interface Survey {
    id: string;
    site_id?: string;
    site_name?: string;
    surveyor_id?: string;
    surveyor_name?: string;
    trade?: string;
    status: 'draft' | 'in_progress' | 'submitted' | 'under_review' | 'completed';
    created_at: string;
    updated_at: string;
    submitted_at?: string;
}

export interface Inspection {
    id: string;
    survey_id: string;
    asset_id: string;
    asset_name?: string;
    ref_code?: string;
    service_line?: string;
    floor?: string;
    area?: string;
    condition_rating?: string;
    overall_condition?: string;
    quantity_installed?: number;
    quantity_working?: number;
    remarks?: string;
    gps_lat?: number;
    gps_lng?: number;
    created_at: string;
    updated_at: string;
}

export const surveyService = {
    // Get all surveys
    async getSurveys(status?: string, siteId?: string): Promise<Survey[]> {
        const params: any = {};
        if (status) params.status = status;
        if (siteId) params.siteId = siteId;

        const response = await api.get('/surveys', { params });
        return response.data.surveys;
    },

    // Get survey by ID
    async getSurveyById(id: string): Promise<Survey> {
        const response = await api.get(`/surveys/${id}`);
        return response.data.survey;
    },

    // Create survey
    async createSurvey(siteId: string, trade?: string): Promise<Survey> {
        const response = await api.post('/surveys', { siteId, trade });
        return response.data.survey;
    },

    // Update survey
    async updateSurvey(id: string, trade?: string, status?: string): Promise<Survey> {
        const response = await api.put(`/surveys/${id}`, { trade, status });
        return response.data.survey;
    },

    // Submit survey
    async submitSurvey(id: string): Promise<Survey> {
        const response = await api.post(`/surveys/${id}/submit`);
        return response.data.survey;
    },

    // Delete survey
    async deleteSurvey(id: string): Promise<void> {
        await api.delete(`/surveys/${id}`);
    },

    // Get inspections for a survey
    async getInspections(surveyId: string): Promise<Inspection[]> {
        const response = await api.get(`/surveys/${surveyId}/inspections`);
        return response.data.inspections;
    },

    // Create inspection
    async createInspection(surveyId: string, inspection: Partial<Inspection>): Promise<Inspection> {
        const response = await api.post(`/surveys/${surveyId}/inspections`, {
            assetId: inspection.asset_id,
            conditionRating: inspection.condition_rating,
            overallCondition: inspection.overall_condition,
            quantityInstalled: inspection.quantity_installed,
            quantityWorking: inspection.quantity_working,
            remarks: inspection.remarks,
            gpsLat: inspection.gps_lat,
            gpsLng: inspection.gps_lng,
        });
        return response.data.inspection;
    },

    // Update inspection
    async updateInspection(id: string, inspection: Partial<Inspection>): Promise<Inspection> {
        const response = await api.put(`/surveys/inspections/${id}`, {
            conditionRating: inspection.condition_rating,
            overallCondition: inspection.overall_condition,
            quantityInstalled: inspection.quantity_installed,
            quantityWorking: inspection.quantity_working,
            remarks: inspection.remarks,
            gpsLat: inspection.gps_lat,
            gpsLng: inspection.gps_lng,
        });
        return response.data.inspection;
    },
};
