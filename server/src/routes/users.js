const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { handleError } = require('../utils/errors');

const router = express.Router();

// Get all users (Admin and Supervisor see all, Staff see limited)
router.get('/', authMiddleware, async (req, res) => {
    try {
        let projection = '';
        if (req.user.role === 'admin' || req.user.role === 'supervisor') {
            projection = 'username name email role branch avatar transport_allowance created_at';
        } else {
            // Staff only see basic info for contact/chat
            projection = 'username name role branch avatar';
        }

        const users = await User.find({}).select(projection);

        const mappedUsers = users.map(u => ({
            ...u.toObject(),
            id: u._id
        }));

        res.json(mappedUsers);
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

        const { password_hash, ...userWithoutPassword } = newUser.toObject();
        res.status(201).json({ ...userWithoutPassword, id: newUser._id });
    } catch (error) {
        handleError(res, error, 'Create user');
    }
});

// Update user (Admin or Supervisor)
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, transport_allowance, branch } = req.body;

        const user = await User.findById(id);

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

        const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password_hash');

        res.json({ ...updatedUser.toObject(), id: updatedUser._id });
    } catch (error) {
        handleError(res, error, 'Update user');
    }
});

// Delete user (Admin only)
router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent deleting yourself
        if (id === req.user.id.toString()) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Cascade delete related data
        // 1. Schedules
        const Schedule = require('../models/Schedule');
        await Schedule.deleteMany({ user_id: id });

        // 2. Attendance
        const Attendance = require('../models/Attendance');
        await Attendance.deleteMany({ user_id: id });

        // 3. Payroll
        const Payroll = require('../models/Payroll');
        await Payroll.deleteMany({ user_id: id });

        // 4. Chat Messages
        const ChatMessage = require('../models/ChatMessage');
        await ChatMessage.deleteMany({ user_id: id });

        // 5. Remove from Chat Channels
        const ChatChannel = require('../models/ChatChannel');
        await ChatChannel.updateMany(
            { members: id },
            { $pull: { members: id } }
        );

        // Finally, delete the user
        await User.findByIdAndDelete(id);

        res.json({ message: 'User and all related data deleted successfully' });
    } catch (error) {
        handleError(res, error, 'Delete user');
    }
});

module.exports = router;
