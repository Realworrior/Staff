const express = require('express');
const Payroll = require('../models/Payroll');
const User = require('../models/User');
const Schedule = require('../models/Schedule');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { handleError } = require('../utils/errors');
const { Op } = require('sequelize');

const router = express.Router();

// GET /calculate?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/calculate', authMiddleware, requireRole('admin', 'supervisor'), async (req, res) => {
    try {
        const { startDate, endDate, branch } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }

        const staffWhere = { role: 'staff' };
        if (branch) staffWhere.branch = branch;

        const staff = await User.findAll({
            where: staffWhere,
            attributes: ['id', 'name', 'role', 'transport_allowance']
        });

        const results = await Promise.all(staff.map(async (user) => {
            // Count total shifts (PM and NT only) in the range for this user
            const count = await Schedule.count({
                where: {
                    user_id: user.id,
                    date: { [Op.gte]: startDate, [Op.lte]: endDate },
                    shift_type: { [Op.in]: ['PM', 'NT'] }
                }
            });

            return {
                userId: user.id,
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
        const records = await Payroll.findAll({
            include: [{
                model: User,
                attributes: ['name']
            }],
            order: [['paid_at', 'DESC'], ['created_at', 'DESC']]
        });

        const mappedRecords = records.map(r => {
            const plain = r.get({ plain: true });
            return {
                ...plain,
                user_name: plain.User ? plain.User.name : 'Unknown'
            };
        });

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
            start_date: startDate,
            end_date: endDate,
            total_transport: totalTransport,
            status: 'pending'
        });

        res.status(201).json(record);
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

        const record = await Payroll.findByPk(id);

        if (!record) {
            return res.status(404).json({ error: 'Payroll record not found' });
        }

        const updateData = { status };
        if (status === 'paid') updateData.paid_at = new Date();
        else updateData.paid_at = null;

        await record.update(updateData);

        res.json(record);
    } catch (error) {
        handleError(res, error, 'Update payroll status');
    }
});

module.exports = router;
