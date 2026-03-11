import { InspectionService } from '../inspection.service';
import { InspectionRepository } from '../../repositories/inspection.repository';

// Mock the repository so the test executes in isolation from the live Postgres DB.
jest.mock('../../repositories/inspection.repository');

describe('InspectionService', () => {
    let service: InspectionService;
    let mockRepository: jest.Mocked<InspectionRepository>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Instantiate the mocked repository
        mockRepository = new InspectionRepository({} as any) as jest.Mocked<InspectionRepository>;

        // Inject the mocked repo into the service
        service = new InspectionService(mockRepository);
    });

    describe('updateInspection', () => {
        it('should delegate to updateWithLock for a draft survey', async () => {
            // updateWithLock handles check + update atomically inside a transaction
            mockRepository.updateWithLock.mockResolvedValue({ id: 'insp-123' } as any);

            const result = await service.updateInspection('insp-123', { condition_rating: 'A >> NEW' }, 'surveyor');

            expect(mockRepository.updateWithLock).toHaveBeenCalledWith('insp-123', { condition_rating: 'A >> NEW' }, 'surveyor');
            expect(result).toHaveProperty('id', 'insp-123');
        });

        it('should propagate Unauthorized error from updateWithLock when survey is submitted', async () => {
            // Simulate the transactional method throwing an auth error
            mockRepository.updateWithLock.mockRejectedValue(
                new Error('Unauthorized: Only admins can edit inspections of submitted surveys')
            );

            await expect(service.updateInspection('insp-123', { condition_rating: 'A >> NEW' }, 'surveyor'))
                .rejects
                .toThrow('Unauthorized: Only admins can edit inspections of submitted surveys');
        });

        it('should allow an admin to update via updateWithLock even when survey is submitted', async () => {
            mockRepository.updateWithLock.mockResolvedValue({ id: 'insp-123' } as any);

            const result = await service.updateInspection('insp-123', { condition_rating: 'A >> NEW' }, 'admin');

            expect(mockRepository.updateWithLock).toHaveBeenCalledWith('insp-123', { condition_rating: 'A >> NEW' }, 'admin');
            expect(result).toHaveProperty('id', 'insp-123');
        });

        it('should reject invalid condition ratings before hitting the DB', async () => {
            await expect(service.updateInspection('insp-123', { condition_rating: 'INVALID_RATING' }, 'surveyor'))
                .rejects
                .toThrow('Invalid condition rating');

            // updateWithLock should never be called if validation fails
            expect(mockRepository.updateWithLock).not.toHaveBeenCalled();
        });

        it('should throw "Inspection not found" when updateWithLock returns null', async () => {
            mockRepository.updateWithLock.mockResolvedValue(null as any);

            await expect(service.updateInspection('insp-123', { condition_rating: 'A >> NEW' }, 'surveyor'))
                .rejects
                .toThrow('Inspection not found');
        });
    });
});
