/**
 * Validate JWT_SECRET strength
 * Requirements:
 * - At least 32 characters long
 * - Not a common/default value
 */
export function validateJwtSecretStrength(secret: string | undefined): { isValid: boolean; error?: string } {
    if (!secret) {
        return { isValid: false, error: 'JWT_SECRET is missing in environment variables' };
    }

    if (secret.length < 32) {
        return { isValid: false, error: 'JWT_SECRET is too short. It should be at least 32 characters long.' };
    }

    const weakSecrets = ['secret', 'password', 'development', '1234567890', 'facility_survey_secret'];
    if (weakSecrets.includes(secret.toLowerCase())) {
        return { isValid: false, error: 'JWT_SECRET is too weak/common. Please use a complex random string.' };
    }

    return { isValid: true };
}
