export interface Survey {
    id: string;
    site_id: string;
    surveyor_id: string;
    trade: string | null;
    status: 'draft' | 'in_progress' | 'submitted' | 'under_review' | 'completed';
    created_at: Date;
    updated_at: Date;
    submitted_at: Date | null;
    site_name?: string;     // Joined field
    surveyor_name?: string; // Joined field
}

export interface CreateSurveyDTO {
    siteId: string;
    surveyorId: string;
    trade?: string;
}

export interface UpdateSurveyDTO {
    trade?: string;
    status?: 'draft' | 'in_progress' | 'submitted' | 'under_review' | 'completed';
}

export interface SurveyFilter {
    status?: string;
    siteId?: string;
    surveyorId?: string;
    limit?: number;
    offset?: number;
}
