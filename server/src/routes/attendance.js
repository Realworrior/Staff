const express = require('express');
const db = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// Clock in (Staff/Supervisor only)
router.post('/clock-in', authMiddleware, requireRole('staff', 'supervisor'), (req, res) => {
    try {
        const { location, latitude, longitude } = req.body;
        const today = new Date().toISOString().split('T')[0];
        const currentTime = new Date().toLocaleTimeString('en-GB', { hour12: false });

        // Check if already clocked in today
        const existing = db.prepare('SELECT id FROM attendance WHERE user_id = ? AND date = ? AND clock_out IS NULL').get(req.user.id, today);

        if (existing) {
            return res.status(400).json({ error: 'Already clocked in' });
        }

        const result = db.prepare(`
      INSERT INTO attendance (user_id, date, clock_in, location, latitude, longitude)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user.id, today, currentTime, location, latitude, longitude);

        const attendance = db.prepare('SELECT * FROM attendance WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(attendance);
    } catch (error) {
        console.error('Clock in error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Clock out (Staff/Supervisor only)
router.post('/clock-out', authMiddleware, requireRole('staff', 'supervisor'), (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const currentTime = new Date().toLocaleTimeString('en-GB', { hour12: false });

        const attendance = db.prepare('SELECT * FROM attendance WHERE user_id = ? AND date = ? AND clock_out IS NULL').get(req.user.id, today);

        if (!attendance) {
            return res.status(400).json({ error: 'Not clocked in' });
        }

        db.prepare('UPDATE attendance SET clock_out = ? WHERE id = ?').run(currentTime, attendance.id);

        const updated = db.prepare('SELECT * FROM attendance WHERE id = ?').get(attendance.id);
        res.json(updated);
    } catch (error) {
        console.error('Clock out error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get my attendance records
router.get('/my-records', authMiddleware, (req, res) => {
    try {
        const records = db.prepare(`
      SELECT * FROM attendance 
      WHERE user_id = ? 
      ORDER BY date DESC, clock_in DESC
      LIMIT 50
    `).all(req.user.id);

        res.json(records);
    } catch (error) {
        console.error('Get records error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all attendance (Admin only)
router.get('/all', authMiddleware, requireRole('admin'), (req, res) => {
    try {
        const { startDate, endDate, userId, branch } = req.query;

        let query = `
      SELECT a.*, u.name as user_name, u.role as user_role
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
        const params = [];

        if (branch) {
            query += ' AND u.branch = ?';
            params.push(branch);
        }

        if (startDate) {
            query += ' AND a.date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND a.date <= ?';
            params.push(endDate);
        }
        if (userId) {
            query += ' AND a.user_id = ?';
            params.push(userId);
        }

        query += ' ORDER BY a.date DESC, a.clock_in DESC';

        const records = db.prepare(query).all(...params);
        res.json(records);
    } catch (error) {
        console.error('Get all attendance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get attendance summary (Admin only)
router.get('/summary', authMiddleware, requireRole('admin'), (req, res) => {
    try {
        const { startDate, endDate, branch } = req.query;
        const today = new Date().toISOString().split('T')[0];

        // Total staff
        let staffQuery = "SELECT COUNT(*) as count FROM users WHERE role IN ('staff', 'supervisor')";
        const staffParams = [];
        if (branch) {
            staffQuery += " AND branch = ?";
            staffParams.push(branch);
        }
        const totalStaff = db.prepare(staffQuery).get(...staffParams);

        // Present today
        let presentQuery = `
      SELECT COUNT(DISTINCT a.user_id) as count 
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE a.date = ?
    `;
        const presentParams = [today];
        if (branch) {
            presentQuery += " AND u.branch = ?";
            presentParams.push(branch);
        }
        const presentToday = db.prepare(presentQuery).get(...presentParams);

        // Average hours worked (last 30 days)
        let avgQuery = `
      SELECT AVG(
        CAST((julianday(clock_out) - julianday(clock_in)) * 24 AS REAL)
      ) as avg_hours
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE clock_out IS NOT NULL
        AND a.date >= date('now', '-30 days')
    `;
        const avgParams = [];
        if (branch) {
            avgQuery += " AND u.branch = ?";
            avgParams.push(branch);
        }
        const avgHours = db.prepare(avgQuery).get(...avgParams);

        // Late arrivals (after 9:05 AM, last 30 days)
        let lateQuery = `
      SELECT COUNT(*) as count
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE clock_in > '09:05:00'
        AND a.date >= date('now', '-30 days')
    `;
        const lateParams = [];
        if (branch) {
            lateQuery += " AND u.branch = ?";
            lateParams.push(branch);
        }
        const lateArrivals = db.prepare(lateQuery).get(...lateParams);

        res.json({
            totalStaff: totalStaff.count,
            presentToday: presentToday.count,
            avgHoursWorked: avgHours.avg_hours ? avgHours.avg_hours.toFixed(2) : 0,
            lateArrivals: lateArrivals.count
        });
    } catch (error) {
        console.error('Get summary error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
