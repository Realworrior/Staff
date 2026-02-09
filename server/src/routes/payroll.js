const express = require('express');
const Payroll = require('../models/Payroll');
const User = require('../models/User');
const Schedule = require('../models/Schedule');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { handleError } = require('../utils/errors');

const router = express.Router();

// GET /calculate?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/calculate', authMiddleware, requireRole('admin', 'supervisor'), async (req, res) => {
    try {
        const { startDate, endDate, branch } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }

        const staffFilter = { role: 'staff' };
        if (branch) staffFilter.branch = branch;

        const staff = await User.find(staffFilter).select('id name role transport_allowance');

        const results = await Promise.all(staff.map(async (user) => {
            // Count total shifts (PM and NT only) in the range for this user
            const count = await Schedule.countDocuments({
                user_id: user._id,
                date: { $gte: new Date(startDate), $lte: new Date(endDate) },
                shift_type: { $in: ['PM', 'NT'] }
            });

            return {
                userId: user._id,
                name: user.name,
                role: user.role,
                transportAllowance: user.transport_allowance,
                shiftCount: count,
                totalTransport: count * user.transport_allowance,
                status: 'pending'
            };
        }));

        res.json(results);
    } catch (error) {
        handleError(res, error, 'Calculate payroll');
    }
});

// GET /history
router.get('/history', authMiddleware, requireRole('admin', 'supervisor'), async (req, res) => {
    try {
        const records = await Payroll.find({})
            .populate('user_id', 'name')
            .sort({ paid_at: -1, created_at: -1 });

        const mappedRecords = records.map(r => ({
            ...r.toObject(),
            id: r._id,
            user_name: r.user_id ? r.user_id.name : 'Unknown'
        }));

        res.json(mappedRecords);
    } catch (error) {
        handleError(res, error, 'Fetch payroll history');
    }
});

// POST /record
router.post('/record', authMiddleware, requireRole('admin', 'supervisor'), async (req, res) => {
    try {
        const { userId, startDate, endDate, totalTransport } = req.body;

        const record = await Payroll.create({
            user_id: userId,
            start_date: new Date(startDate),
            end_date: new Date(endDate),
            total_transport: totalTransport,
            status: 'pending'
        });

        res.status(201).json({ ...record.toObject(), id: record._id });
    } catch (error) {
        handleError(res, error, 'Create payroll record');
    }
});

// PATCH /:id/status
router.patch('/:id/status', authMiddleware, requireRole('admin', 'supervisor'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['pending', 'paid'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const updateData = { status };
        if (status === 'paid') updateData.paid_at = new Date();
        else updateData.paid_at = null;

        const updated = await Payroll.findByIdAndUpdate(id, updateData, { new: true });

        if (!updated) {
            return res.status(404).json({ error: 'Payroll record not found' });
        }

        res.json({ ...updated.toObject(), id: updated._id });
    } catch (error) {
        handleError(res, error, 'Update payroll status');
    }
});

module.exports = router;
