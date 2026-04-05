/**
 * Shared validation utilities — import from here instead of re-declaring in every route file.
 */

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Type guard: returns true and narrows the type to `string` when `id` is a
 * valid UUID string. Rejects arrays (Express 5 types req.params as string | string[]).
 */
export const isValidUUID = (id: string | string[]): id is string =>
    !Array.isArray(id) && UUID_REGEX.test(id);

/** Valid service-line trades used across surveys and asset registers. */
export const VALID_TRADES = new Set([
    'MECHANICAL', 'FLS', 'ELECTRICAL', 'CIVIL', 'PLUMBING', 'HVAC',
    'SOFT SERVICES', // For cleaning, security, landscaping, housekeeping
]);

/** Valid survey lifecycle statuses. */
export const VALID_SURVEY_STATUSES = new Set([
    'draft', 'in_progress', 'submitted', 'approved', 'rejected',
]);

/** Valid condition ratings for asset inspections. */
export const VALID_CONDITION_RATINGS = new Set([
    'A >> NEW', 'B >> Excellent', 'C >> Good', 'D >> Average',
    'E >> Poor', 'F >> Very Poor', 'G >> T.B.D',
]);

/** Valid overall condition values for asset inspections. */
export const VALID_OVERALL_CONDITIONS = new Set([
    'Satisfactory', 'Unsatisfactory', 'Satisfactory with Comment',
]);

/** Max items allowed in a single batch upload request. */
export const BATCH_LIMIT = 500;

/** 
 * Sanitizes an array of photo identifiers to include ONLY local 'uploads/' paths.
 * Filters out browser URLs, API URLs, and Blob strings.
 */
export const sanitizePhotoPaths = (photos: any): string[] => {
    if (!Array.isArray(photos)) return [];
    return photos.filter((p): p is string => 
        typeof p === 'string' && 
        (p.startsWith('uploads/') || p.startsWith('uploads\\'))
    );
};
