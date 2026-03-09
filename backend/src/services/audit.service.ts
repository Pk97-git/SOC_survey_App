import pool from '../config/database';
import { Request } from 'express';

export enum AuditAction {
    // User Management
    USER_LOGIN = 'user.login',
    USER_LOGOUT = 'user.logout',
    USER_REGISTER = 'user.register',
    USER_UPDATE = 'user.update',
    USER_DELETE = 'user.delete',
    USER_ACTIVATE = 'user.activate',
    USER_DEACTIVATE = 'user.deactivate',
    PASSWORD_CHANGE = 'user.password_change',

    // Site Management
    SITE_CREATE = 'site.create',
    SITE_UPDATE = 'site.update',
    SITE_DELETE = 'site.delete',

    // Asset Management
    ASSET_CREATE = 'asset.create',
    ASSET_UPDATE = 'asset.update',
    ASSET_DELETE = 'asset.delete',

    // Survey Management
    SURVEY_CREATE = 'survey.create',
    SURVEY_UPDATE = 'survey.update',
    SURVEY_DELETE = 'survey.delete',
    SURVEY_SUBMIT = 'survey.submit',
    SURVEY_REVIEW = 'survey.review',
    SURVEY_APPROVE = 'survey.approve',

    // Access Control
    ACCESS_DENIED = 'access.denied',
    PERMISSION_DENIED = 'permission.denied',
}

interface AuditLogEntry {
    userId?: string;
    action: AuditAction;
    resourceType?: string;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
}

/**
 * Log an audit event
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
    try {
        await pool.query(
            `INSERT INTO audit_log
             (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                entry.userId || null,
                entry.action,
                entry.resourceType || null,
                entry.resourceId || null,
                entry.details ? JSON.stringify(entry.details) : null,
                entry.ipAddress || null,
                entry.userAgent || null
            ]
        );
    } catch (error) {
        console.error('Failed to log audit entry:', error);
        // Don't throw error - audit logging failure shouldn't break the application
    }
}

/**
 * Extract IP address from request
 */
export function getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'unknown';
}

/**
 * Log authentication event
 */
export async function logAuth(
    action: AuditAction.USER_LOGIN | AuditAction.USER_LOGOUT,
    userId: string,
    req: Request,
    success: boolean,
    details?: any
): Promise<void> {
    await logAudit({
        userId,
        action,
        resourceType: 'user',
        resourceId: userId,
        details: {
            success,
            ...details
        },
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent']
    });
}

/**
 * Log user management event
 */
export async function logUserManagement(
    action: AuditAction,
    performedBy: string,
    targetUserId: string,
    req: Request,
    details?: any
): Promise<void> {
    await logAudit({
        userId: performedBy,
        action,
        resourceType: 'user',
        resourceId: targetUserId,
        details,
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent']
    });
}

/**
 * Log access denied event
 */
export async function logAccessDenied(
    userId: string | undefined,
    action: string,
    resourceType: string,
    req: Request,
    reason?: string
): Promise<void> {
    await logAudit({
        userId,
        action: AuditAction.ACCESS_DENIED,
        resourceType,
        details: {
            attemptedAction: action,
            reason
        },
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent']
    });
}

/**
 * Get audit logs for a user
 */
export async function getUserAuditLogs(
    userId: string,
    limit: number = 100,
    offset: number = 0
): Promise<any[]> {
    const result = await pool.query(
        `SELECT id, action, resource_type, resource_id, details, ip_address, created_at
         FROM audit_log
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
    );
    return result.rows;
}

/**
 * Get all audit logs (admin only)
 */
export async function getAllAuditLogs(
    limit: number = 100,
    offset: number = 0,
    filters?: {
        userId?: string;
        action?: string;
        startDate?: Date;
        endDate?: Date;
    }
): Promise<any[]> {
    let query = `
        SELECT al.*, u.email, u.full_name
        FROM audit_log al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 0;

    if (filters?.userId) {
        paramCount++;
        query += ` AND al.user_id = $${paramCount}`;
        params.push(filters.userId);
    }

    if (filters?.action) {
        paramCount++;
        query += ` AND al.action = $${paramCount}`;
        params.push(filters.action);
    }

    if (filters?.startDate) {
        paramCount++;
        query += ` AND al.created_at >= $${paramCount}`;
        params.push(filters.startDate);
    }

    if (filters?.endDate) {
        paramCount++;
        query += ` AND al.created_at <= $${paramCount}`;
        params.push(filters.endDate);
    }

    query += ` ORDER BY al.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
}
