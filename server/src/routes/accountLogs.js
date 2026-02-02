const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET all account logs
router.get('/', authMiddleware, requireRole('admin', 'supervisor'), (req, res) => {
    try {
        const { branch } = req.query;
        let query = `
            SELECT *,
            CASE 
                WHEN request_count > 10 THEN 'high'
                WHEN request_count > 5 THEN 'medium'
                ELSE 'low'
            END as priority
            FROM account_logs 
            WHERE 1=1
        `;
        const params = [];

        if (branch) {
            query += ' AND branch = ?';
            params.push(branch);
        }

        query += ' ORDER BY last_request_at DESC';

        const logs = db.prepare(query).all(...params);
        res.json({ data: logs });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch account logs' });
    }
});

// POST new account log (with 12hr restriction)
router.post('/', authMiddleware, requireRole('admin', 'supervisor'), (req, res) => {
    const { phone_number, branch } = req.body;

    if (!phone_number || !branch) {
        return res.status(400).json({ error: 'Phone number and branch are required' });
    }

    try {
        // Check for existing log for this number + branch
        const existing = db.prepare('SELECT * FROM account_logs WHERE phone_number = ? AND branch = ?').get(phone_number, branch);

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
            db.prepare(`
                UPDATE account_logs 
                SET request_count = request_count + 1, 
                    last_request_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(existing.id);

            return res.json({ message: 'Log updated successfully', id: existing.id });
        } else {
            // Insert new log
            const result = db.prepare(`
                INSERT INTO account_logs (phone_number, branch)
                VALUES (?, ?)
            `).run(phone_number, branch);

            return res.status(201).json({ message: 'Log created successfully', id: result.lastInsertRowid });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to process account log' });
    }
});

// PATCH status
router.patch('/:id', authMiddleware, requireRole('admin', 'supervisor'), (req, res) => {
    const { status } = req.body;
    const { id } = req.params;

    if (!['open', 'pending', 'closed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        const result = db.prepare('UPDATE account_logs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Log not found' });
        }
        res.json({ message: 'Status updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

module.exports = router;
