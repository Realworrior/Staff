const express = require('express');
const Schedule = require('../models/Schedule');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { handleError } = require('../utils/errors');

const router = express.Router();

// Get schedules
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { start_date, end_date, user_id, branch } = req.query;

        let query = {};
        if (user_id) query.user_id = user_id;
        if (start_date || end_date) {
            query.date = {};
            if (start_date) query.date.$gte = new Date(start_date);
            if (end_date) query.date.$lte = new Date(end_date);
        }

        let schedules = await Schedule.find(query)
            .populate('user_id', 'name role branch')
            .sort({ date: 1, start_time: 1 });

        if (branch) {
            schedules = schedules.filter(s => s.user_id && s.user_id.branch === branch);
        }

        const mappedSchedules = schedules.map(s => ({
            ...s.toObject(),
            id: s._id,
            user_name: s.user_id ? s.user_id.name : 'Unknown',
            user_role: s.user_id ? s.user_id.role : 'Unknown'
        }));

        res.json(mappedSchedules);
    } catch (error) {
        handleError(res, error, 'Get schedules');
    }
});

// Create schedule (Admin only)
router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { user_id, date, start_time, end_time, shift_type, notes, branch } = req.body;

        if (!user_id || !date || !start_time || !end_time) {
            return res.status(400).json({ error: 'user_id, date, start_time, and end_time are required' });
        }

        const schedule = await Schedule.create({
            user_id,
            date: new Date(date),
            start_time,
            end_time,
            shift_type,
            notes,
            created_by: req.user.id,
            branch: branch || 'betfalme'
        });

        res.status(201).json({ ...schedule.toObject(), id: schedule._id });
    } catch (error) {
        handleError(res, error, 'Create schedule');
    }
});

// Bulk create schedules (Admin only)
router.post('/bulk', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { schedules: inputSchedules } = req.body;

        if (!Array.isArray(inputSchedules) || inputSchedules.length === 0) {
            return res.status(400).json({ error: 'schedules array is required' });
        }

        const mappedSchedules = inputSchedules.map(s => ({
            user_id: s.user_id,
            date: new Date(s.date),
            start_time: s.start_time,
            end_time: s.end_time,
            shift_type: s.shift_type || null,
            notes: s.notes || null,
            created_by: req.user.id,
            branch: s.branch || 'betfalme'
        }));

        // MongoDB insertMany handles multiple docs
        await Schedule.insertMany(mappedSchedules);

        res.status(201).json({ message: `${inputSchedules.length} schedules created successfully` });
    } catch (error) {
        handleError(res, error, 'Bulk create schedules');
    }
});

// Update schedule (Admin only)
router.put('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { start_time, end_time, shift_type, notes } = req.body;

        const updateData = {};
        if (start_time !== undefined) updateData.start_time = start_time;
        if (end_time !== undefined) updateData.end_time = end_time;
        if (shift_type !== undefined) updateData.shift_type = shift_type;
        if (notes !== undefined) updateData.notes = notes;

        const updated = await Schedule.findByIdAndUpdate(id, updateData, { new: true });

        if (!updated) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        res.json({ ...updated.toObject(), id: updated._id });
    } catch (error) {
        handleError(res, error, 'Update schedule');
    }
});

// Delete schedule (Admin only)
router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        await Schedule.findByIdAndDelete(id);
        res.json({ message: 'Schedule deleted successfully' });
    } catch (error) {
        handleError(res, error, 'Delete schedule');
    }
});

// Delete schedules by range (Admin only) - For Rota Overwrite
router.delete('/range/bulk', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { start_date, end_date, branch } = req.body;

        if (!start_date || !end_date) {
            return res.status(400).json({ error: 'start_date and end_date are required' });
        }

        const query = {
            date: { $gte: new Date(start_date), $lte: new Date(end_date) }
        };
        if (branch) query.branch = branch;

        await Schedule.deleteMany(query);

        res.json({ message: `Schedules deleted successfully in range` });
    } catch (error) {
        handleError(res, error, 'Delete schedules by range');
    }
});

module.exports = router;
