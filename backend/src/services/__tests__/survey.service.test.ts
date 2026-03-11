import { SurveyService } from '../survey.service';
import { SurveyRepository } from '../../repositories/survey.repository';

jest.mock('../../repositories/survey.repository');

const mockUser = (role: 'admin' | 'surveyor' | 'reviewer') => ({
    userId: 'user-aaa',
    email: `test@example.com`,
    role,
});

const mockSurvey = (status: string) => ({
    id: 'survey-111',
    site_id: 'site-222',
    surveyor_id: 'user-aaa',
    status,
    trade: 'MECHANICAL',
});

describe('SurveyService', () => {
    let service: SurveyService;
    let mockRepo: jest.Mocked<SurveyRepository>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRepo = new SurveyRepository() as jest.Mocked<SurveyRepository>;
        (service as any) = new SurveyService();
        (service as any).repo = mockRepo;
    });

    // ---- update() ----
    describe('update()', () => {
        it('allows a surveyor to update a draft survey', async () => {
            mockRepo.findById.mockResolvedValue(mockSurvey('draft') as any);
            mockRepo.update.mockResolvedValue({ ...mockSurvey('draft'), trade: 'ELECTRICAL' } as any);

            const result = await service.update(mockUser('surveyor'), 'survey-111', { trade: 'ELECTRICAL' });

            expect(mockRepo.update).toHaveBeenCalledWith('survey-111', { trade: 'ELECTRICAL' });
            expect(result).toHaveProperty('trade', 'ELECTRICAL');
        });

        it('blocks a surveyor from updating a submitted survey', async () => {
            mockRepo.findById.mockResolvedValue(mockSurvey('submitted') as any);

            await expect(service.update(mockUser('surveyor'), 'survey-111', { trade: 'ELECTRICAL' }))
                .rejects.toThrow('Unauthorized: Only admins can edit submitted surveys');

            expect(mockRepo.update).not.toHaveBeenCalled();
        });

        it('allows an admin to update a submitted survey', async () => {
            mockRepo.findById.mockResolvedValue(mockSurvey('submitted') as any);
            mockRepo.update.mockResolvedValue({ ...mockSurvey('submitted'), trade: 'ELECTRICAL' } as any);

            const result = await service.update(mockUser('admin'), 'survey-111', { trade: 'ELECTRICAL' });

            expect(mockRepo.update).toHaveBeenCalledWith('survey-111', { trade: 'ELECTRICAL' });
            expect(result).toHaveProperty('trade', 'ELECTRICAL');
        });

        it('returns null if survey does not exist', async () => {
            mockRepo.findById.mockResolvedValue(null);

            const result = await service.update(mockUser('surveyor'), 'nonexistent', {});
            expect(result).toBeNull();
            expect(mockRepo.update).not.toHaveBeenCalled();
        });
    });

    // ---- submit() ----
    describe('submit()', () => {
        it('submits a draft survey', async () => {
            mockRepo.findById.mockResolvedValue(mockSurvey('draft') as any);
            mockRepo.submit.mockResolvedValue({ ...mockSurvey('submitted') } as any);

            const result = await service.submit(mockUser('surveyor'), 'survey-111');

            expect(mockRepo.submit).toHaveBeenCalledWith('survey-111');
            expect(result).toHaveProperty('status', 'submitted');
        });

        it('returns null if survey does not exist', async () => {
            mockRepo.findById.mockResolvedValue(null);

            const result = await service.submit(mockUser('surveyor'), 'nonexistent');
            expect(result).toBeNull();
            expect(mockRepo.submit).not.toHaveBeenCalled();
        });
    });

    // ---- create() ----
    describe('create()', () => {
        it('assigns surveyor_id to creator if not provided', async () => {
            mockRepo.create.mockResolvedValue(mockSurvey('draft') as any);

            await service.create(mockUser('surveyor'), { siteId: 'site-222', surveyorId: undefined } as any);

            expect(mockRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ surveyorId: 'user-aaa' })
            );
        });

        it('preserves an explicitly provided surveyorId', async () => {
            mockRepo.create.mockResolvedValue(mockSurvey('draft') as any);

            await service.create(mockUser('admin'), { siteId: 'site-222', surveyorId: 'other-uuu' } as any);

            expect(mockRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ surveyorId: 'other-uuu' })
            );
        });
    });

    // ---- delete() ----
    describe('delete()', () => {
        it('allows surveyor to delete a survey', async () => {
            mockRepo.findById.mockResolvedValue(mockSurvey('draft') as any);
            mockRepo.delete.mockResolvedValue(true);

            const result = await service.delete(mockUser('surveyor'), 'survey-111');
            expect(result).toBe(true);
        });

        it('blocks a reviewer from deleting a survey', async () => {
            mockRepo.findById.mockResolvedValue(mockSurvey('draft') as any);

            await expect(service.delete(mockUser('reviewer'), 'survey-111'))
                .rejects.toThrow('Unauthorized');
        });
    });
});
