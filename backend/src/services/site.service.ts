import { SiteRepository } from '../repositories/site.repository';
import { Site, CreateSiteDTO, UpdateSiteDTO } from '../models/site.model';

export class SiteService {
    private repo: SiteRepository;

    constructor() {
        this.repo = new SiteRepository();
    }

    async getAll(): Promise<Site[]> {
        return this.repo.findAll();
    }

    async getById(id: string): Promise<Site | null> {
        return this.repo.findById(id);
    }

    async create(data: CreateSiteDTO): Promise<Site> {
        return this.repo.create(data);
    }

    async update(id: string, data: UpdateSiteDTO): Promise<Site | null> {
        // Validate existence
        const site = await this.repo.findById(id);
        if (!site) return null;

        return this.repo.update(id, data);
    }

    async delete(id: string): Promise<boolean> {
        // Check existence (optional, repo handles it but explicit check is nice)
        const site = await this.repo.findById(id);
        if (!site) return false;

        return this.repo.delete(id);
    }
}
