import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { validatePassword, hashPassword, comparePassword } from '../services/password.service';
import { logAuth, logUserManagement, getClientIp, AuditAction } from '../services/audit.service';

const router = Router();

// Register (Admin only)
router.post('/register', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { email, password, fullName, role } = req.body;

        // Validation
        if (!email || !password || !fullName) {
            return res.status(400).json({ error: 'Missing required fields: email, password, fullName' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Validate role
        const validRoles = ['admin', 'surveyor'];
        const userRole = role || 'surveyor';
        if (!validRoles.includes(userRole)) {
            return res.status(400).json({ error: 'Invalid role. Must be admin or surveyor' });
        }

        // Validate password strength
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                error: 'Password does not meet requirements',
                details: passwordValidation.errors
            });
        }

        // Check if user exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Create user
        const result = await pool.query(
            `INSERT INTO users (email, password_hash, full_name, role, created_by, is_active)
             VALUES ($1, $2, $3, $4, $5, true)
             RETURNING id, email, full_name, role, is_active, created_at`,
            [email.toLowerCase(), hashedPassword, fullName, userRole, req.user!.userId]
        );

        const newUser = result.rows[0];

        // Log user creation
        await logUserManagement(
            AuditAction.USER_REGISTER,
            req.user!.userId,
            newUser.id,
            req,
            { email: newUser.email, role: newUser.role }
        );

        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: newUser.id,
                email: newUser.email,
                fullName: newUser.full_name,
                role: newUser.role,
                isActive: newUser.is_active
            }
        });
    } catch (error: any) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Find user
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            // Log failed login attempt
            await logAuth(AuditAction.USER_LOGIN, 'unknown', req, false, {
                email,
                reason: 'User not found'
            });
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // Check if user is active
        if (user.is_active === false) {
            await logAuth(AuditAction.USER_LOGIN, user.id, req, false, {
                reason: 'Account deactivated'
            });
            return res.status(403).json({ error: 'Account is deactivated. Please contact administrator.' });
        }

        // Verify password
        const isValidPassword = await comparePassword(password, user.password_hash);

        if (!isValidPassword) {
            await logAuth(AuditAction.USER_LOGIN, user.id, req, false, {
                reason: 'Invalid password'
            });
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        await pool.query(
            'UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = $1',
            [user.id]
        );

        // Generate JWT
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET as string,
            { expiresIn: process.env.JWT_EXPIRES_IN || '8h' } as jwt.SignOptions
        );

        // Log successful login
        await logAuth(AuditAction.USER_LOGIN, user.id, req, true);

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                role: user.role,
                isActive: user.is_active
            }
        });
    } catch (error: any) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            'SELECT id, email, full_name, role, is_active, created_at, last_login FROM users WHERE id = $1',
            [req.user!.userId]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }

        const user = result.rows[0];
        res.json({
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                role: user.role,
                isActive: user.is_active,
                createdAt: user.created_at,
                lastLogin: user.last_login
            }
        });
    } catch (error: any) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// Change password
router.post('/change-password', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password required' });
        }

        // Get user
        const userResult = await pool.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user!.userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        // Verify current password
        const isValid = await comparePassword(currentPassword, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Validate new password
        const validation = validatePassword(newPassword);
        if (!validation.isValid) {
            return res.status(400).json({
                error: 'New password does not meet requirements',
                details: validation.errors
            });
        }

        // Hash and update password
        const hashedPassword = await hashPassword(newPassword);
        await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [hashedPassword, req.user!.userId]
        );

        // Log password change
        await logUserManagement(
            AuditAction.PASSWORD_CHANGE,
            req.user!.userId,
            req.user!.userId,
            req
        );

        res.json({ message: 'Password changed successfully' });
    } catch (error: any) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Logout
router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        // Log logout
        await logAuth(AuditAction.USER_LOGOUT, req.user!.userId, req, true);

        res.json({ message: 'Logged out successfully' });
    } catch (error: any) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Failed to logout' });
    }
});

export default router;
