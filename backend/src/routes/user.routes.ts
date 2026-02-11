import { Router, Response } from 'express';
import pool from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { validatePassword, hashPassword } from '../services/password.service';
import { logUserManagement, AuditAction, getAllAuditLogs } from '../services/audit.service';

const router = Router();

// Get all users (Admin only)
router.get('/', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT id, email, full_name, role, is_active, created_at, last_login,
                    deactivated_at, deactivated_by
             FROM users
             ORDER BY created_at DESC`
        );

        res.json({ users: result.rows });
    } catch (error: any) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

// Get user by ID (Admin only)
router.get('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT id, email, full_name, role, is_active, created_at, last_login,
                    created_by, deactivated_at, deactivated_by
             FROM users
             WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: result.rows[0] });
    } catch (error: any) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// Update user (Admin only)
router.put('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { fullName, role, email, password } = req.body;

        // Prevent admin from modifying themselves
        if (id === req.user!.userId) {
            return res.status(400).json({ error: 'Cannot modify your own account through this endpoint. Use profile settings instead.' });
        }

        // Get current user data for audit log
        const currentUser = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (currentUser.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const changes: any = {};

        // Build dynamic query
        let query = 'UPDATE users SET updated_at = NOW()';
        const values: any[] = [id];
        let paramCount = 1;

        if (fullName && fullName !== currentUser.rows[0].full_name) {
            paramCount++;
            query += `, full_name = $${paramCount}`;
            values.push(fullName);
            changes.fullName = { from: currentUser.rows[0].full_name, to: fullName };
        }

        if (role && role !== currentUser.rows[0].role) {
            // Validate role
            const validRoles = ['admin', 'surveyor'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({ error: 'Invalid role. Must be admin or surveyor' });
            }
            paramCount++;
            query += `, role = $${paramCount}`;
            values.push(role);
            changes.role = { from: currentUser.rows[0].role, to: role };
        }

        if (email && email !== currentUser.rows[0].email) {
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ error: 'Invalid email format' });
            }

            // Check if email already exists
            const emailCheck = await pool.query(
                'SELECT id FROM users WHERE email = $1 AND id != $2',
                [email.toLowerCase(), id]
            );

            if (emailCheck.rows.length > 0) {
                return res.status(400).json({ error: 'Email already in use' });
            }

            paramCount++;
            query += `, email = $${paramCount}`;
            values.push(email.toLowerCase());
            changes.email = { from: currentUser.rows[0].email, to: email.toLowerCase() };
        }

        if (password) {
            // Validate password
            const validation = validatePassword(password);
            if (!validation.isValid) {
                return res.status(400).json({
                    error: 'Password does not meet requirements',
                    details: validation.errors
                });
            }

            paramCount++;
            const hashedPassword = await hashPassword(password);
            query += `, password_hash = $${paramCount}`;
            values.push(hashedPassword);
            changes.password = 'changed';
        }

        query += ` WHERE id = $1 RETURNING id, email, full_name, role, is_active, updated_at`;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Log user update
        await logUserManagement(
            AuditAction.USER_UPDATE,
            req.user!.userId,
            id,
            req,
            changes
        );

        res.json({ message: 'User updated successfully', user: result.rows[0] });
    } catch (error: any) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Activate user (Admin only)
router.post('/:id/activate', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        // Check if user exists
        const userCheck = await pool.query('SELECT id, email, is_active FROM users WHERE id = $1', [id]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (userCheck.rows[0].is_active) {
            return res.status(400).json({ error: 'User is already active' });
        }

        // Activate user
        await pool.query(
            `UPDATE users
             SET is_active = true,
                 deactivated_by = NULL,
                 deactivated_at = NULL,
                 updated_at = NOW()
             WHERE id = $1`,
            [id]
        );

        // Log activation
        await logUserManagement(
            AuditAction.USER_ACTIVATE,
            req.user!.userId,
            id,
            req,
            { email: userCheck.rows[0].email }
        );

        res.json({ message: 'User activated successfully' });
    } catch (error: any) {
        console.error('Activate user error:', error);
        res.status(500).json({ error: 'Failed to activate user' });
    }
});

// Deactivate user (Admin only)
router.post('/:id/deactivate', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        // Prevent admin from deactivating themselves
        if (id === req.user!.userId) {
            return res.status(400).json({ error: 'Cannot deactivate your own account' });
        }

        // Check if user exists
        const userCheck = await pool.query('SELECT id, email, is_active FROM users WHERE id = $1', [id]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!userCheck.rows[0].is_active) {
            return res.status(400).json({ error: 'User is already deactivated' });
        }

        // Deactivate user
        await pool.query(
            `UPDATE users
             SET is_active = false,
                 deactivated_by = $1,
                 deactivated_at = NOW(),
                 updated_at = NOW()
             WHERE id = $2`,
            [req.user!.userId, id]
        );

        // Log deactivation
        await logUserManagement(
            AuditAction.USER_DEACTIVATE,
            req.user!.userId,
            id,
            req,
            { email: userCheck.rows[0].email }
        );

        res.json({ message: 'User deactivated successfully' });
    } catch (error: any) {
        console.error('Deactivate user error:', error);
        res.status(500).json({ error: 'Failed to deactivate user' });
    }
});

// Delete user (Admin only) - Soft delete preferred, this is hard delete
router.delete('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        // Prevent admin from deleting themselves
        if (id === req.user!.userId) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        // Get user info before deletion
        const userCheck = await pool.query('SELECT email FROM users WHERE id = $1', [id]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const result = await pool.query(
            'DELETE FROM users WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Log deletion
        await logUserManagement(
            AuditAction.USER_DELETE,
            req.user!.userId,
            id,
            req,
            { email: userCheck.rows[0].email }
        );

        res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Get user audit logs (Admin only)
router.get('/:id/audit-logs', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const logs = await getAllAuditLogs(limit, offset, { userId: id });

        res.json({ logs });
    } catch (error: any) {
        console.error('Get audit logs error:', error);
        res.status(500).json({ error: 'Failed to get audit logs' });
    }
});

// Get all audit logs (Admin only)
router.get('/admin/audit-logs', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 100;
        const offset = parseInt(req.query.offset as string) || 0;

        const filters: any = {};
        if (req.query.action) filters.action = req.query.action as string;
        if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
        if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);

        const logs = await getAllAuditLogs(limit, offset, filters);

        res.json({ logs });
    } catch (error: any) {
        console.error('Get all audit logs error:', error);
        res.status(500).json({ error: 'Failed to get audit logs' });
    }
});

export default router;
