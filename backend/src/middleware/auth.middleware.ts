import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/database';

export type UserRole = 'admin' | 'surveyor' | 'reviewer';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        email: string;
        role: UserRole;
        fullName?: string;
    };
}

export interface JWTPayload {
    userId: string;
    email: string;
    role: string;
    iat?: number;
    exp?: number;
}

/**
 * Authenticate middleware - verifies JWT and checks user status
 */
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // Validate JWT_SECRET is configured
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('❌ JWT_SECRET is not configured');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        // Accept token from Authorization: Bearer <token> header (native clients)
        // OR from the httpOnly 'token' cookie (web clients)
        const authHeader = req.headers.authorization;
        let token: string | undefined;

        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else {
            // Parse cookie without cookie-parser dependency
            token = req.headers.cookie
                ?.split(';')
                .find(c => c.trim().startsWith('token='))
                ?.split('=')
                .slice(1)
                .join('=')
                .trim();
        }

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // Verify JWT
        const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

        // Check if user still exists and is active
        const userResult = await pool.query(
            'SELECT id, email, full_name, role, is_active FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        // Check if user is active
        if (user.is_active === false) {
            return res.status(403).json({ error: 'Account is deactivated. Please contact administrator.' });
        }

        // Attach user info to request
        req.user = {
            userId: user.id,
            email: user.email,
            role: user.role as UserRole,
            fullName: user.full_name
        };

        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ error: 'Token expired' });
        }
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        console.error('Authentication error:', error);
        return res.status(401).json({ error: 'Authentication failed' });
    }
};

/**
 * Authorize middleware - checks if user has required role(s)
 */
export const authorize = (...allowedRoles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const userRole = req.user.role.toLowerCase();
        const hasRole = allowedRoles.some(role => role.toLowerCase() === userRole);

        if (!hasRole) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                required: allowedRoles,
                userRole: req.user.role
            });
        }
        next();
    };
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuth = async (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
        // Validate JWT_SECRET is configured
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('❌ JWT_SECRET is not configured');
            return next();
        }

        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

        // Validate user still exists and is active in database
        const userResult = await pool.query(
            'SELECT id, email, full_name, role, is_active FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (userResult.rows.length === 0) {
            console.warn('[optionalAuth] User not found — treating as unauthenticated');
            return next();
        }

        const user = userResult.rows[0];

        if (user.is_active === false) {
            console.warn('[optionalAuth] User is inactive — treating as unauthenticated');
            return next();
        }

        // Attach user info if token is valid and user exists
        req.user = {
            userId: user.id,
            email: user.email,
            role: user.role as UserRole,
            fullName: user.full_name
        };
    } catch (error) {
        // Token was present but invalid/expired — log so it's observable in server logs
        if (error instanceof jwt.TokenExpiredError) {
            console.warn('[optionalAuth] Token expired — treating as unauthenticated');
        } else if (error instanceof jwt.JsonWebTokenError) {
            console.warn('[optionalAuth] Invalid token signature — treating as unauthenticated');
        }
        // req.user stays undefined; request continues unauthenticated
    }

    next();
};
