export interface Site {
    id: string;
    name: string;
    location: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface CreateSiteDTO {
    name: string;
    location?: string;
}

export interface UpdateSiteDTO {
    name?: string;
    location?: string;
}
