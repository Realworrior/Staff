const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { handleError } = require('../utils/errors');
const { Op } = require('sequelize');

const router = express.Router();

// Get all users (Admin and Supervisor see all, Staff see limited)
router.get('/', authMiddleware, async (req, res) => {
    try {
        let attributes;
        if (req.user.role === 'admin' || req.user.role === 'supervisor') {
            attributes = ['id', 'username', 'name', 'email', 'role', 'branch', 'avatar', 'transport_allowance', 'created_at'];
        } else {
            // Staff only see basic info for contact/chat
            attributes = ['id', 'username', 'name', 'role', 'branch', 'avatar'];
        }

        const users = await User.findAll({ attributes });
        res.json(users);
    } catch (error) {
        handleError(res, error, 'Get users');
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

        const newUser = await User.create({
            username: username.toLowerCase(),
            password_hash: passwordHash,
            name,
            email: email || null,
            role,
            avatar,
            transport_allowance: transport_allowance || 0,
            branch: branch || 'betfalme'
        });

        const userData = newUser.get({ plain: true });
        delete userData.password_hash;
        res.status(201).json(userData);
    } catch (error) {
        handleError(res, error, 'Create user');
    }
});

// Update user (Admin or Supervisor)
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, transport_allowance, branch } = req.body;

        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Access control
        if (req.user.role === 'supervisor' && user.role !== 'staff') {
            return res.status(403).json({ error: 'Supervisors can only manage staff' });
        }
        if (req.user.role !== 'admin' && req.user.role !== 'supervisor') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (role !== undefined) updateData.role = role;
        if (transport_allowance !== undefined) updateData.transport_allowance = transport_allowance;
        if (branch !== undefined) updateData.branch = branch;

        await user.update(updateData);

        const updatedUser = await User.findByPk(id, {
            attributes: { exclude: ['password_hash'] }
        });

        res.json(updatedUser);
    } catch (error) {
        handleError(res, error, 'Update user');
    }
});

// Delete user (Admin only)
router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent deleting yourself
        if (id === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Cascade delete related data
        const Schedule = require('../models/Schedule');
        const Attendance = require('../models/Attendance');
        const Payroll = require('../models/Payroll');
        const ChatMessage = require('../models/ChatMessage');
        const ChatChannel = require('../models/ChatChannel');

        await Schedule.destroy({ where: { user_id: id } });
        await Attendance.destroy({ where: { user_id: id } });
        await Payroll.destroy({ where: { user_id: id } });
        await ChatMessage.destroy({ where: { user_id: id } });

        // Remove from Chat Channels (members is stored as string/JSON)
        const channels = await ChatChannel.findAll();
        for (const channel of channels) {
            if (channel.members && channel.members.includes(id)) {
                const newMembers = channel.members.filter(mId => mId !== id);
                await channel.update({ members: newMembers });
            }
        }

        // Finally, delete the user
        await user.destroy();

        res.json({ message: 'User and all related data deleted successfully' });
    } catch (error) {
        handleError(res, error, 'Delete user');
    }
});

module.exports = router;
