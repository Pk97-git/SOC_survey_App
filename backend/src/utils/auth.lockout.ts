/**
 * Pure business-logic functions extracted from auth.routes.ts login handler.
 * These are unit-testable without any database, express, or JWT dependencies.
 */

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Masks an email address for GDPR-safe audit logging.
 * e.g. "john.doe@company.com" → "j***@company.com"
 */
export function maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    return `${local[0] ?? '*'}***@${domain}`;
}

/**
 * Returns true if the account is currently locked (locked_until is in the future).
 */
export function isAccountLocked(lockedUntil: string | null | undefined): boolean {
    if (!lockedUntil) return false;
    return new Date() < new Date(lockedUntil);
}

/**
 * Returns how many minutes are remaining on a lockout (rounded up).
 */
export function lockoutMinutesRemaining(lockedUntil: string): number {
    return Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 60000);
}

/**
 * Given the current failed attempt count, computes the new count and
 * whether the account should now be locked.
 */
export function computeFailureState(currentFailedAttempts: number): {
    newFailCount: number;
    shouldLock: boolean;
    lockedUntil: string | null;
} {
    const newFailCount = (currentFailedAttempts || 0) + 1;
    const shouldLock = newFailCount >= MAX_FAILED_ATTEMPTS;
    const lockedUntil = shouldLock
        ? new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString()
        : null;

    return { newFailCount, shouldLock, lockedUntil };
}
