import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

// Define permission system
export enum Permission {
    // User Management
    CREATE_USER = 'create:user',
    READ_USER = 'read:user',
    UPDATE_USER = 'update:user',
    DELETE_USER = 'delete:user',

    // Site Management
    CREATE_SITE = 'create:site',
    READ_SITE = 'read:site',
    UPDATE_SITE = 'update:site',
    DELETE_SITE = 'delete:site',

    // Asset Management
    CREATE_ASSET = 'create:asset',
    READ_ASSET = 'read:asset',
    UPDATE_ASSET = 'update:asset',
    DELETE_ASSET = 'delete:asset',

    // Survey Management
    CREATE_SURVEY = 'create:survey',
    READ_SURVEY = 'read:survey',
    UPDATE_SURVEY = 'update:survey',
    DELETE_SURVEY = 'delete:survey',
    SUBMIT_SURVEY = 'submit:survey',

    // Reports
    VIEW_REPORTS = 'view:reports',
    EXPORT_REPORTS = 'export:reports',

    // Analytics
    VIEW_ANALYTICS = 'view:analytics',
}

// Role-based permission matrix (Admin and Surveyor only)
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
    admin: [
        // Full access to everything
        Permission.CREATE_USER,
        Permission.READ_USER,
        Permission.UPDATE_USER,
        Permission.DELETE_USER,
        Permission.CREATE_SITE,
        Permission.READ_SITE,
        Permission.UPDATE_SITE,
        Permission.DELETE_SITE,
        Permission.CREATE_ASSET,
        Permission.READ_ASSET,
        Permission.UPDATE_ASSET,
        Permission.DELETE_ASSET,
        Permission.CREATE_SURVEY,
        Permission.READ_SURVEY,
        Permission.UPDATE_SURVEY,
        Permission.DELETE_SURVEY,
        Permission.SUBMIT_SURVEY,
        Permission.VIEW_REPORTS,
        Permission.EXPORT_REPORTS,
        Permission.VIEW_ANALYTICS,
    ],
    surveyor: [
        // Can conduct surveys and manage assets
        Permission.READ_SITE,
        Permission.READ_ASSET,
        Permission.CREATE_SURVEY,
        Permission.READ_SURVEY,
        Permission.UPDATE_SURVEY,
        Permission.SUBMIT_SURVEY,
        Permission.VIEW_REPORTS,
    ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: string, permission: Permission): boolean {
    const rolePermissions = ROLE_PERMISSIONS[role.toLowerCase()];
    return rolePermissions ? rolePermissions.includes(permission) : false;
}

/**
 * Middleware to require specific permissions
 */
export const requirePermissions = (...permissions: Permission[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const userRole = req.user.role.toLowerCase();
        const hasAllPermissions = permissions.every(permission =>
            hasPermission(userRole, permission)
        );

        if (!hasAllPermissions) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                required: permissions,
                userRole: userRole
            });
        }

        next();
    };
};

/**
 * Middleware to check if user can access a resource they own
 */
export const requireOwnership = (resourceUserIdField: string = 'userId') => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // Admins can access all resources
        if (req.user.role.toLowerCase() === 'admin') {
            return next();
        }

        // Check ownership
        const resourceUserId = (req as any)[resourceUserIdField] || req.body[resourceUserIdField];

        if (resourceUserId && resourceUserId !== req.user.userId) {
            return res.status(403).json({ error: 'Access denied. You can only access your own resources.' });
        }

        next();
    };
};

/**
 * Middleware to check if user is active
 */
export const requireActiveUser = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    // This will be checked against the database in the route handler
    // For now, we pass through
    next();
};
