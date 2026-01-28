const express = require('express');
const db = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /calculate?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Calculates transport allowance for all staff in a range
router.get('/calculate', authMiddleware, requireRole('admin', 'supervisor'), (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }

        const staff = db.prepare("SELECT id, name, role, transport_allowance FROM users WHERE role = 'staff'").all();

        const results = staff.map(user => {
            // Count total shifts (PM and NT only) in the range for this user
            const shiftCount = db.prepare(`
                SELECT COUNT(*) as count 
                FROM schedules 
                WHERE user_id = ? 
                AND date BETWEEN ? AND ? 
                AND shift_type IN ('PM', 'NT')
            `).get(user.id, startDate, endDate).count;

            return {
                userId: user.id,
                name: user.name,
                role: user.role,
                transportAllowance: user.transport_allowance,
                shiftCount,
                totalTransport: shiftCount * user.transport_allowance,
                status: 'pending' // Default for calculation view
            };
        });

        res.json(results);
    } catch (error) {
        console.error('Payroll calculation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /history
router.get('/history', authMiddleware, requireRole('admin', 'supervisor'), (req, res) => {
    try {
        const records = db.prepare(`
            SELECT p.*, u.name as user_name 
            FROM payroll_records p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.paid_at DESC, p.created_at DESC
        `).all();
        res.json(records);
    } catch (error) {
        console.error('Fetch payroll history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /record
router.post('/record', authMiddleware, requireRole('admin', 'supervisor'), (req, res) => {
    try {
        const { userId, startDate, endDate, totalTransport } = req.body;

        const result = db.prepare(`
            INSERT INTO payroll_records (user_id, start_date, end_date, total_transport, status)
            VALUES (?, ?, ?, ?, 'pending')
        `).run(userId, startDate, endDate, totalTransport);

        const newRecord = db.prepare('SELECT * FROM payroll_records WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(newRecord);
    } catch (error) {
        console.error('Create payroll record error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /:id/status
router.patch('/:id/status', authMiddleware, requireRole('admin', 'supervisor'), (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['pending', 'paid'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const paidAt = status === 'paid' ? new Date().toISOString() : null;

        db.prepare('UPDATE payroll_records SET status = ?, paid_at = ? WHERE id = ?').run(status, paidAt, id);

        const updated = db.prepare('SELECT * FROM payroll_records WHERE id = ?').get(id);
        res.json(updated);
    } catch (error) {
        console.error('Update payroll status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
