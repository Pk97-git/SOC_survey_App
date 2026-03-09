/**
 * Field-name transform utilities
 *
 * The frontend sends camelCase JSON; PostgreSQL returns snake_case rows.
 * These helpers provide a single, tested conversion layer so individual
 * routes don't need ad-hoc `a.refCode || a.ref_code` fallbacks.
 */

/** Convert a single camelCase key to snake_case. */
export const toSnakeCaseKey = (key: string): string =>
    key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

/** Convert a single snake_case key to camelCase. */
export const toCamelCaseKey = (key: string): string =>
    key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

/**
 * Shallow-convert all keys of a plain object from camelCase → snake_case.
 * Values are left untouched.
 */
export const toSnakeCase = <T extends Record<string, unknown>>(
    obj: T
): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        result[toSnakeCaseKey(key)] = value;
    }
    return result;
};

/**
 * Shallow-convert all keys of a plain object from snake_case → camelCase.
 * Values are left untouched.
 */
export const toCamelCase = <T extends Record<string, unknown>>(
    obj: T
): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        result[toCamelCaseKey(key)] = value;
    }
    return result;
};

/**
 * Resolve a field value that may arrive under either a camelCase or
 * snake_case key (e.g. from mixed client sources or legacy imports).
 *
 * Usage: resolveField(row, 'refCode', 'ref_code')
 */
export const resolveField = (
    obj: Record<string, unknown>,
    camelKey: string,
    snakeKey?: string
): unknown =>
    obj[camelKey] !== undefined
        ? obj[camelKey]
        : obj[snakeKey ?? toSnakeCaseKey(camelKey)];
