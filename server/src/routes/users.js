const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all users (Admin and Supervisor see all, Staff see limited)
router.get('/', authMiddleware, (req, res) => {
    try {
        let users;
        if (req.user.role === 'admin' || req.user.role === 'supervisor') {
            users = db.prepare('SELECT id, username, name, email, role, avatar, transport_allowance, created_at FROM users').all();
        } else {
            // Staff only see basic info for contact/chat
            users = db.prepare('SELECT id, username, name, role, avatar FROM users').all();
        }
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create user (Admin only)
router.post('/', authMiddleware, requireRole('admin'), (req, res) => {
    try {
        const { username, password, name, email, role } = req.body;

        if (!username || !password || !name || !role) {
            return res.status(400).json({ error: 'Username, password, name, and role are required' });
        }

        if (!['admin', 'supervisor', 'staff'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        const passwordHash = bcrypt.hashSync(password, 10);
        const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=10B981&color=fff`;

        const result = db.prepare(`
      INSERT INTO users (username, password_hash, name, email, role, avatar, transport_allowance)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(username.toLowerCase(), passwordHash, name, email || null, role, avatar, req.body.transport_allowance || 0);

        const newUser = db.prepare('SELECT id, username, name, email, role, avatar, transport_allowance, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

        res.status(201).json(newUser);
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Username already exists' });
        }
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update user (Admin only)
router.put('/:id', authMiddleware, requireRole('admin'), (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, transport_allowance } = req.body;

        const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Supervisor can only update staff
        if (req.user.role === 'supervisor' && user.role !== 'staff') {
            return res.status(403).json({ error: 'Supervisors can only manage staff' });
        }

        db.prepare(`
      UPDATE users 
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          role = COALESCE(?, role),
          transport_allowance = COALESCE(?, transport_allowance),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, email, role, transport_allowance, id);

        const updatedUser = db.prepare('SELECT id, username, name, email, role, avatar, transport_allowance, created_at FROM users WHERE id = ?').get(id);
        res.json(updatedUser);
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete user (Admin only)
router.delete('/:id', authMiddleware, requireRole('admin'), (req, res) => {
    try {
        const { id } = req.params;

        // Prevent deleting yourself
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
