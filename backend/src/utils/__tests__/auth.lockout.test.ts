import { isAccountLocked, lockoutMinutesRemaining, computeFailureState, MAX_FAILED_ATTEMPTS, maskEmail } from '../../utils/auth.lockout';

describe('Auth Lockout Utilities', () => {
    describe('isAccountLocked()', () => {
        it('returns false when locked_until is null', () => {
            expect(isAccountLocked(null)).toBe(false);
        });

        it('returns false when locked_until is undefined', () => {
            expect(isAccountLocked(undefined)).toBe(false);
        });

        it('returns false when lockout has expired', () => {
            const pastDate = new Date(Date.now() - 1000).toISOString(); // 1 second ago
            expect(isAccountLocked(pastDate)).toBe(false);
        });

        it('returns true when lockout is still active', () => {
            const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes ahead
            expect(isAccountLocked(futureDate)).toBe(true);
        });
    });

    describe('lockoutMinutesRemaining()', () => {
        it('returns the correct number of minutes remaining (rounded up)', () => {
            const futureDate = new Date(Date.now() + 9.5 * 60 * 1000).toISOString(); // 9.5 minutes
            const remaining = lockoutMinutesRemaining(futureDate);
            expect(remaining).toBe(10); // ceil(9.5) = 10
        });

        it('returns 1 if less than 1 minute remains', () => {
            const futureDate = new Date(Date.now() + 30 * 1000).toISOString(); // 30 seconds
            const remaining = lockoutMinutesRemaining(futureDate);
            expect(remaining).toBe(1); // ceil(0.5) = 1
        });
    });

    describe('computeFailureState()', () => {
        it('increments the counter but does not lock on first failure', () => {
            const { newFailCount, shouldLock, lockedUntil } = computeFailureState(0);
            expect(newFailCount).toBe(1);
            expect(shouldLock).toBe(false);
            expect(lockedUntil).toBeNull();
        });

        it('increments counter and does not lock on 4th failure', () => {
            const { newFailCount, shouldLock, lockedUntil } = computeFailureState(3);
            expect(newFailCount).toBe(4);
            expect(shouldLock).toBe(false);
            expect(lockedUntil).toBeNull();
        });

        it(`locks the account on the ${MAX_FAILED_ATTEMPTS}th failure`, () => {
            const { newFailCount, shouldLock, lockedUntil } = computeFailureState(MAX_FAILED_ATTEMPTS - 1);
            expect(newFailCount).toBe(MAX_FAILED_ATTEMPTS);
            expect(shouldLock).toBe(true);
            expect(lockedUntil).not.toBeNull();
        });

        it('sets locked_until approximately 15 minutes in the future', () => {
            const before = Date.now();
            const { lockedUntil } = computeFailureState(MAX_FAILED_ATTEMPTS - 1);
            const after = Date.now();

            const lockedMs = new Date(lockedUntil!).getTime();
            expect(lockedMs).toBeGreaterThanOrEqual(before + 15 * 60 * 1000);
            expect(lockedMs).toBeLessThanOrEqual(after + 15 * 60 * 1000 + 100); // allow 100ms slack
        });

        it('handles undefined/null current attempts gracefully', () => {
            const { newFailCount } = computeFailureState(undefined as any);
            expect(newFailCount).toBe(1);
        });
    });

    describe('maskEmail()', () => {
        it('masks the local part, keeping first char and domain', () => {
            expect(maskEmail('john.doe@company.com')).toBe('j***@company.com');
        });

        it('works with a single-character local part', () => {
            expect(maskEmail('a@example.com')).toBe('a***@example.com');
        });

        it('returns *** for a string with no @ symbol', () => {
            expect(maskEmail('notanemail')).toBe('***');
        });

        it('masks even if the email has subdomains', () => {
            expect(maskEmail('user@mail.corp.internal')).toBe('u***@mail.corp.internal');
        });

        it('handles an empty local part gracefully', () => {
            const result = maskEmail('@domain.com');
            expect(result).toMatch(/\*\*\*@domain\.com/);
        });
    });
});
