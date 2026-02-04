const express = require('express');
const bcrypt = require('bcrypt');
const supabase = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all users (Admin and Supervisor see all, Staff see limited)
router.get('/', authMiddleware, async (req, res) => {
    try {
        let query = supabase.from('users');

        if (req.user.role === 'admin' || req.user.role === 'supervisor') {
            query = query.select('id, username, name, email, role, branch, avatar, transport_allowance, created_at');
        } else {
            // Staff only see basic info for contact/chat
            query = query.select('id, username, name, role, branch, avatar');
        }

        const { data: users, error } = await query;

        if (error) throw error;
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create user (Admin only)
router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { username, password, name, email, role, branch, transport_allowance } = req.body;

        if (!username || !password || !name || !role) {
            return res.status(400).json({ error: 'Username, password, name, and role are required' });
        }

        if (!['admin', 'supervisor', 'staff'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        const passwordHash = bcrypt.hashSync(password, 10);
        const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=10B981&color=fff`;

        const { data, error } = await supabase
            .from('users')
            .insert([{
                username: username.toLowerCase(),
                password_hash: passwordHash,
                name,
                email: email || null,
                role,
                avatar,
                transport_allowance: transport_allowance || 0,
                branch: branch || 'betfalme'
            }])
            .select('id, username, name, email, role, branch, avatar, transport_allowance, created_at')
            .single();

        if (error) {
            if (error.code === '23505') { // Postgres unique constraint violation
                return res.status(409).json({ error: 'Username already exists' });
            }
            throw error;
        }

        res.status(201).json(data);
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update user (Admin only)
router.put('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, transport_allowance, branch } = req.body;

        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('id, role')
            .eq('id', id)
            .single();

        if (fetchError || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Supervisor can only update staff
        if (req.user.role === 'supervisor' && user.role !== 'staff') {
            return res.status(403).json({ error: 'Supervisors can only manage staff' });
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (role !== undefined) updateData.role = role;
        if (transport_allowance !== undefined) updateData.transport_allowance = transport_allowance;
        if (branch !== undefined) updateData.branch = branch;
        updateData.updated_at = new Date().toISOString();

        const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', id)
            .select('id, username, name, email, role, branch, avatar, transport_allowance, created_at')
            .single();

        if (updateError) throw updateError;
        res.json(updatedUser);
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete user (Admin only)
router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent deleting yourself
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
