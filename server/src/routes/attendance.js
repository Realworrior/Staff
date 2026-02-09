const express = require('express');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { handleError } = require('../utils/errors');

const router = express.Router();

// Clock in (Staff/Supervisor only)
router.post('/clock-in', authMiddleware, requireRole('staff', 'supervisor'), async (req, res) => {
    try {
        const { location, latitude, longitude } = req.body;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Check if already clocked in today (where clock_out is null)
        const existing = await Attendance.findOne({
            user_id: req.user.id,
            date: { $gte: today },
            clock_out: { $exists: false }
        });

        if (existing) {
            return res.status(400).json({ error: 'Already clocked in' });
        }

        const attendance = await Attendance.create({
            user_id: req.user.id,
            date: today,
            clock_in: now,
            location,
            latitude,
            longitude
        });

        res.status(201).json({ ...attendance.toObject(), id: attendance._id });
    } catch (error) {
        handleError(res, error, 'Clock in');
    }
});

// Clock out (Staff/Supervisor only)
router.post('/clock-out', authMiddleware, requireRole('staff', 'supervisor'), async (req, res) => {
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const attendance = await Attendance.findOne({
            user_id: req.user.id,
            date: { $gte: today },
            clock_out: { $exists: false }
        });

        if (!attendance) {
            return res.status(400).json({ error: 'Not clocked in' });
        }

        attendance.clock_out = now;
        await attendance.save();

        res.json({ ...attendance.toObject(), id: attendance._id });
    } catch (error) {
        handleError(res, error, 'Clock out');
    }
});

// Get my attendance records
router.get('/my-records', authMiddleware, async (req, res) => {
    try {
        const records = await Attendance.find({ user_id: req.user.id })
            .sort({ date: -1, clock_in: -1 })
            .limit(50);

        const mappedRecords = records.map(r => ({ ...r.toObject(), id: r._id }));
        res.json(mappedRecords);
    } catch (error) {
        handleError(res, error, 'Get my records');
    }
});

// Get all attendance (Admin only)
router.get('/all', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { startDate, endDate, userId, branch } = req.query;
        let query = {};

        if (userId) query.user_id = userId;
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        let history = await Attendance.find(query)
            .populate('user_id', 'name role branch')
            .sort({ date: -1, clock_in: -1 });

        if (branch) {
            history = history.filter(h => h.user_id && h.user_id.branch === branch);
        }

        const mappedHistory = history.map(h => ({
            ...h.toObject(),
            id: h._id,
            user_name: h.user_id ? h.user_id.name : 'Unknown',
            user_role: h.user_id ? h.user_id.role : 'Unknown'
        }));

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
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // 1. Total staff
        const staffFilter = { role: { $in: ['staff', 'supervisor'] } };
        if (branch) staffFilter.branch = branch;
        const totalStaffCount = await User.countDocuments(staffFilter);

        // 2. Present today
        let presentQuery = Attendance.find({ date: { $gte: today } }).populate('user_id');
        let presentRecords = await presentQuery;
        if (branch) {
            presentRecords = presentRecords.filter(r => r.user_id && r.user_id.branch === branch);
        }
        const presentTodayCount = presentRecords.length;

        // 3. Last 30 days data
        let thirtyDaysRecords = await Attendance.find({ date: { $gte: thirtyDaysAgo } }).populate('user_id');
        if (branch) {
            thirtyDaysRecords = thirtyDaysRecords.filter(r => r.user_id && r.user_id.branch === branch);
        }

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
