import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/database';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        email: string;
        role: string;
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
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Invalid token format' });
        }

        // Verify JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

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
            role: user.role,
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
export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

        // Attach user info if token is valid
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role
        };
    } catch (error) {
        // Silently fail - user just won't be authenticated
    }

    next();
};
