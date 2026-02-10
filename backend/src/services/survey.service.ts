import { SurveyRepository } from '../repositories/survey.repository';
import { Survey, CreateSurveyDTO, UpdateSurveyDTO, SurveyFilter } from '../models/survey.model';

export class SurveyService {
    private repo: SurveyRepository;

    constructor() {
        this.repo = new SurveyRepository();
    }

    async getAll(user: any, filter: SurveyFilter): Promise<Survey[]> {
        // Apply role-based filtering
        if (user.role === 'surveyor') {
            filter.surveyorId = user.userId;
        }
        // Admin sees all

        return this.repo.findAll(filter);
    }

    async getById(user: any, id: string): Promise<Survey | null> {
        const survey = await this.repo.findById(id);
        if (!survey) return null;

        // Authorization check
        if (user.role === 'surveyor' && survey.surveyor_id !== user.userId) {
            return null; // Or throw specialized error
        }

        return survey;
    }

    async create(user: any, data: CreateSurveyDTO): Promise<Survey> {
        // Force surveyor ID to be current user for surveyors
        // Admin could potentially create for others (not implemented yet, but flexible)
        if (user.role === 'surveyor') {
            data.surveyorId = user.userId;
        }
        return this.repo.create(data);
    }

    async update(user: any, id: string, data: UpdateSurveyDTO): Promise<Survey | null> {
        const survey = await this.repo.findById(id);
        if (!survey) return null;

        if (user.role === 'surveyor' && survey.surveyor_id !== user.userId) {
            throw new Error('Unauthorized'); // Using generic error for now, should use AppError
        }

        return this.repo.update(id, data);
    }

    async submit(user: any, id: string): Promise<Survey | null> {
        const survey = await this.repo.findById(id);
        if (!survey) return null;

        if (user.role === 'surveyor' && survey.surveyor_id !== user.userId) {
            throw new Error('Unauthorized');
        }

        return this.repo.submit(id);
    }

    async delete(user: any, id: string): Promise<boolean> {
        const survey = await this.repo.findById(id);
        if (!survey) return false;

        // Admin or Owner can delete
        if (user.role !== 'admin' && survey.surveyor_id !== user.userId) {
            throw new Error('Unauthorized');
        }

        return this.repo.delete(id);
    }
}
