export interface Survey {
    id: string;
    site_id: string;
    surveyor_id: string | null;   // NULL = unassigned (admin-created, not yet claimed)
    trade: string | null;
    location: string | null;
    status: 'draft' | 'in_progress' | 'submitted' | 'under_review' | 'completed';
    created_at: Date;
    updated_at: Date;
    submitted_at: Date | null;
    site_name?: string;     // Joined field
    surveyor_name?: string; // Joined field
}

export interface CreateSurveyDTO {
    siteId: string;
    surveyorId: string | null;  // NULL allowed for admin-created unassigned surveys
    trade?: string;
    location?: string;
}

export interface UpdateSurveyDTO {
    trade?: string;
    status?: 'draft' | 'in_progress' | 'submitted' | 'under_review' | 'completed';
    surveyorId?: string;   // For surveyor claim operation
    location?: string;
}

export interface SurveyFilter {
    status?: string;
    siteId?: string;
    surveyorId?: string;
    includeUnassigned?: boolean;  // When true: show surveyor's own + NULL surveyor_id surveys
    limit?: number;
    offset?: number;
}
