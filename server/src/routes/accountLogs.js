const express = require('express');
const router = express.Router();
const AccountLog = require('../models/AccountLog');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { handleError } = require('../utils/errors');

// GET all account logs
router.get('/', authMiddleware, requireRole('admin', 'supervisor'), async (req, res) => {
    try {
        const { branch } = req.query;
        let query = {};

        if (branch) {
            query.branch = branch;
        }

        const logs = await AccountLog.find(query).sort({ last_request_at: -1 });

        // Add priority logic in JS
        const processedLogs = logs.map(log => ({
            ...log.toObject(),
            id: log._id,
            priority: log.request_count > 10 ? 'high' : log.request_count > 5 ? 'medium' : 'low'
        }));

        res.json({ data: processedLogs });
    } catch (error) {
        handleError(res, error, 'Fetch account logs');
    }
});

// POST new account log (with 12hr restriction)
router.post('/', authMiddleware, requireRole('admin', 'supervisor'), async (req, res) => {
    const { phone_number, branch } = req.body;

    if (!phone_number || !branch) {
        return res.status(400).json({ error: 'Phone number and branch are required' });
    }

    try {
        // Check for existing log for this number + branch
        let existing = await AccountLog.findOne({ phone_number, branch });

        if (existing) {
            const lastRequest = new Date(existing.last_request_at);
            const now = new Date();
            const hoursDiff = (now - lastRequest) / (1000 * 60 * 60);

            if (hoursDiff < 12) {
                return res.status(400).json({
                    error: `A request for this number was already logged within the last 12 hours. Next available: ${new Date(lastRequest.getTime() + 12 * 60 * 60 * 1000).toLocaleString()}`
                });
            }

            // Update existing log
            existing.request_count += 1;
            existing.last_request_at = now;
            await existing.save();

            return res.json({ message: 'Log updated successfully', id: existing._id });
        } else {
            // Insert new log
            const inserted = await AccountLog.create({ phone_number, branch });
            return res.status(201).json({ message: 'Log created successfully', id: inserted._id });
        }
    } catch (error) {
        handleError(res, error, 'Process account log');
    }
});

// PATCH status
router.patch('/:id', authMiddleware, requireRole('admin', 'supervisor'), async (req, res) => {
    const { status } = req.body;
    const { id } = req.params;

    if (!['open', 'pending', 'closed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        const updated = await AccountLog.findByIdAndUpdate(id, { status }, { new: true });

        if (!updated) {
            return res.status(404).json({ error: 'Log not found' });
        }

        res.json({ message: 'Status updated successfully' });
    } catch (error) {
        handleError(res, error, 'Update status');
    }
});

module.exports = router;
