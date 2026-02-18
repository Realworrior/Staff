const express = require('express');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { handleError } = require('../utils/errors');
const { Op } = require('sequelize');

const router = express.Router();

// Clock in (Staff/Supervisor only)
router.post('/clock-in', authMiddleware, requireRole('staff', 'supervisor'), async (req, res) => {
    try {
        const { location, latitude, longitude } = req.body;
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // Check if already clocked in today (where clock_out is null)
        const existing = await Attendance.findOne({
            where: {
                user_id: req.user.id,
                date: todayStr,
                clock_out: null
            }
        });

        if (existing) {
            return res.status(400).json({ error: 'Already clocked in' });
        }

        const attendance = await Attendance.create({
            user_id: req.user.id,
            date: todayStr,
            clock_in: now,
            location,
            latitude,
            longitude
        });

        res.status(201).json(attendance);
    } catch (error) {
        handleError(res, error, 'Clock in');
    }
});

// Clock out (Staff/Supervisor only)
router.post('/clock-out', authMiddleware, requireRole('staff', 'supervisor'), async (req, res) => {
    try {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        const attendance = await Attendance.findOne({
            where: {
                user_id: req.user.id,
                date: todayStr,
                clock_out: null
            }
        });

        if (!attendance) {
            return res.status(400).json({ error: 'Not clocked in' });
        }

        await attendance.update({ clock_out: now });

        res.json(attendance);
    } catch (error) {
        handleError(res, error, 'Clock out');
    }
});

// Get my attendance records
router.get('/my-records', authMiddleware, async (req, res) => {
    try {
        const records = await Attendance.findAll({
            where: { user_id: req.user.id },
            order: [['date', 'DESC'], ['clock_in', 'DESC']],
            limit: 50
        });

        res.json(records);
    } catch (error) {
        handleError(res, error, 'Get my records');
    }
});

// Get all attendance (Admin only)
router.get('/all', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { startDate, endDate, userId, branch } = req.query;
        let where = {};

        if (userId) where.user_id = userId;
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date[Op.gte] = startDate;
            if (endDate) where.date[Op.lte] = endDate;
        }

        let include = [{
            model: User,
            attributes: ['name', 'role', 'branch']
        }];

        if (branch) {
            include[0].where = { branch };
        }

        const history = await Attendance.findAll({
            where,
            include,
            order: [['date', 'DESC'], ['clock_in', 'DESC']]
        });

        const mappedHistory = history.map(h => {
            const plain = h.get({ plain: true });
            return {
                ...plain,
                user_name: plain.User ? plain.User.name : 'Unknown',
                user_role: plain.User ? plain.User.role : 'Unknown'
            };
        });

        res.json(mappedHistory);
    } catch (error) {
        handleError(res, error, 'Get all attendance');
    }
});

// Get attendance summary (Admin only)
router.get('/summary', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { branch } = req.query;
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

        // 1. Total staff
        const staffWhere = { role: { [Op.in]: ['staff', 'supervisor'] } };
        if (branch) staffWhere.branch = branch;
        const totalStaffCount = await User.count({ where: staffWhere });

        // 2. Present today
        const presentInclude = [{
            model: User,
            attributes: ['branch']
        }];
        if (branch) presentInclude[0].where = { branch };

        const presentTodayCount = await Attendance.count({
            where: { date: todayStr },
            include: presentInclude
        });

        // 3. Last 30 days data
        const thirtyDaysRecords = await Attendance.findAll({
            where: {
                date: { [Op.gte]: thirtyDaysAgoStr }
            },
            include: presentInclude
        });

        let totalHours = 0;
        let recordsWithHours = 0;
        let lateCount = 0;

        thirtyDaysRecords.forEach(r => {
            // Late check (assumed 9:05 AM)
            if (r.clock_in) {
                const clockInDate = new Date(r.clock_in);
                const hour = clockInDate.getHours();
                const minute = clockInDate.getMinutes();
                if (hour > 9 || (hour === 9 && minute > 5)) {
                    lateCount++;
                }
            }

            // Hours check
            if (r.clock_in && r.clock_out) {
                const diffMs = new Date(r.clock_out) - new Date(r.clock_in);
                const hrs = diffMs / (1000 * 60 * 60);
                if (hrs > 0) {
                    totalHours += hrs;
                    recordsWithHours++;
                }
            }
        });

        res.json({
            totalStaff: totalStaffCount,
            presentToday: presentTodayCount,
            avgHoursWorked: recordsWithHours > 0 ? (totalHours / recordsWithHours).toFixed(2) : 0,
            lateArrivals: lateCount
        });
    } catch (error) {
        handleError(res, error, 'Get attendance summary');
    }
});

module.exports = router;
