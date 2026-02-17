export interface Site {
    id: string;
    name: string;
    location: string | null;
    client: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface CreateSiteDTO {
    name: string;
    location?: string;
    client?: string;
}

export interface UpdateSiteDTO {
    name?: string;
    location?: string;
    client?: string;
}
