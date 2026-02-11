import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Get all users (Admin only)
router.get('/', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            'SELECT id, email, full_name, role, created_at, last_login FROM users ORDER BY created_at DESC'
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
            'SELECT id, email, full_name, role, created_at, last_login FROM users WHERE id = $1',
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

        // Build dynamic query
        let query = 'UPDATE users SET updated_at = NOW()';
        const values: any[] = [id];
        let paramCount = 1;

        if (fullName) {
            paramCount++;
            query += `, full_name = $${paramCount}`;
            values.push(fullName);
        }
        if (role) {
            paramCount++;
            query += `, role = $${paramCount}`;
            values.push(role);
        }
        if (email) {
            paramCount++;
            query += `, email = $${paramCount}`;
            values.push(email);
        }
        if (password) {
            paramCount++;
            const hashedPassword = await bcrypt.hash(password, 10);
            query += `, password_hash = $${paramCount}`;
            values.push(hashedPassword);
        }

        query += ` WHERE id = $1 RETURNING id, email, full_name, role, updated_at`;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User updated successfully', user: result.rows[0] });
    } catch (error: any) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Delete user (Admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM users WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

export default router;
