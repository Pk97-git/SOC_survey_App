import { InspectionRepository, InspectionData } from '../repositories/inspection.repository';
import { VALID_CONDITION_RATINGS, VALID_OVERALL_CONDITIONS } from '../utils/validation.utils';

export class InspectionService {
    private repository: InspectionRepository;

    constructor(repository: InspectionRepository) {
        this.repository = repository;
    }

    async getInspections(surveyId: string) {
        return this.repository.getBySurveyId(surveyId);
    }

    async getBulkInspections(surveyIds: string[]) {
        return this.repository.getBulkBySurveyIds(surveyIds);
    }

    async createInspection(data: InspectionData) {
        if (data.condition_rating && !VALID_CONDITION_RATINGS.has(data.condition_rating)) {
            throw new Error(`Invalid condition rating. Must be one of: ${[...VALID_CONDITION_RATINGS].join(', ')}`);
        }
        if (data.overall_condition && !VALID_OVERALL_CONDITIONS.has(data.overall_condition)) {
            throw new Error(`Invalid overall condition. Must be one of: ${[...VALID_OVERALL_CONDITIONS].join(', ')}`);
        }

        return this.repository.create(data);
    }

    async updateInspection(
        inspectionId: string,
        data: Partial<InspectionData>,
        userRole: string
    ) {
        // Validate inputs BEFORE hitting the DB
        if (data.condition_rating && !VALID_CONDITION_RATINGS.has(data.condition_rating)) {
            throw new Error(`Invalid condition rating. Must be one of: ${[...VALID_CONDITION_RATINGS].join(', ')}`);
        }
        if (data.overall_condition && !VALID_OVERALL_CONDITIONS.has(data.overall_condition)) {
            throw new Error(`Invalid overall condition. Must be one of: ${[...VALID_OVERALL_CONDITIONS].join(', ')}`);
        }

        // Delegate to transactional method that atomically checks parent status + updates
        // This eliminates the TOCTOU race condition between checking the survey status and updating the inspection
        const updated = await this.repository.updateWithLock(inspectionId, data, userRole);
        if (!updated) {
            throw new Error('Inspection not found');
        }
        return updated;
    }
}
