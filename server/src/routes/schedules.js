const express = require('express');
const db = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get schedules
router.get('/', authMiddleware, (req, res) => {
    try {
        const { start_date, end_date, user_id, branch } = req.query;

        let query = `
      SELECT s.*, u.name as user_name, u.role as user_role
      FROM schedules s
      JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
        const params = [];

        // Allow filtering by user_id if provided (for My Shifts view)
        // If not provided, return all (for Team Rota view) - accessible to all staff
        if (user_id) {
            query += ' AND s.user_id = ?';
            params.push(user_id);
        }

        if (start_date) {
            query += ' AND s.date >= ?';
            params.push(start_date);
        }
        if (end_date) {
            query += ' AND s.date <= ?';
            params.push(end_date);
        }
        if (branch) {
            query += ' AND s.branch = ?';
            params.push(branch);
        }

        query += ' ORDER BY s.date ASC, s.start_time ASC';

        const schedules = db.prepare(query).all(...params);
        res.json(schedules);
    } catch (error) {
        console.error('Get schedules error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create schedule (Admin only)
router.post('/', authMiddleware, requireRole('admin'), (req, res) => {
    try {
        const { user_id, date, start_time, end_time, shift_type, notes } = req.body;

        if (!user_id || !date || !start_time || !end_time) {
            return res.status(400).json({ error: 'user_id, date, start_time, and end_time are required' });
        }

        const result = db.prepare(`
      INSERT INTO schedules (user_id, date, start_time, end_time, shift_type, notes, created_by, branch)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(user_id, date, start_time, end_time, shift_type, notes, req.user.id, req.body.branch || 'betfalme');

        const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(schedule);
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Schedule already exists for this user at this time' });
        }
        console.error('Create schedule error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Bulk create schedules (Admin only)
router.post('/bulk', authMiddleware, requireRole('admin'), (req, res) => {
    try {
        const { schedules } = req.body;

        if (!Array.isArray(schedules) || schedules.length === 0) {
            return res.status(400).json({ error: 'schedules array is required' });
        }

        const stmt = db.prepare(`
      INSERT INTO schedules (user_id, date, start_time, end_time, shift_type, notes, created_by, branch)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

        const insertMany = db.transaction((schedules) => {
            for (const schedule of schedules) {
                stmt.run(
                    schedule.user_id,
                    schedule.date,
                    schedule.start_time,
                    schedule.end_time,
                    schedule.shift_type || null,
                    schedule.notes || null,
                    req.user.id,
                    schedule.branch || 'betfalme'
                );
            }
        });

        insertMany(schedules);

        res.status(201).json({ message: `${schedules.length} schedules created successfully` });
    } catch (error) {
        console.error('Bulk create error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update schedule (Admin only)
router.put('/:id', authMiddleware, requireRole('admin'), (req, res) => {
    try {
        const { id } = req.params;
        const { start_time, end_time, shift_type, notes } = req.body;

        const schedule = db.prepare('SELECT id FROM schedules WHERE id = ?').get(id);
        if (!schedule) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        db.prepare(`
      UPDATE schedules 
      SET start_time = COALESCE(?, start_time),
          end_time = COALESCE(?, end_time),
          shift_type = COALESCE(?, shift_type),
          notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(start_time, end_time, shift_type, notes, id);

        const updated = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id);
        res.json(updated);
    } catch (error) {
        console.error('Update schedule error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete schedule (Admin only)
router.delete('/:id', authMiddleware, requireRole('admin'), (req, res) => {
    try {
        const { id } = req.params;

        const result = db.prepare('DELETE FROM schedules WHERE id = ?').run(id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        res.json({ message: 'Schedule deleted successfully' });
    } catch (error) {
        console.error('Delete schedule error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete schedules by range (Admin only) - For Rota Overwrite
router.delete('/range/bulk', authMiddleware, requireRole('admin'), (req, res) => {
    try {
        const { start_date, end_date, branch } = req.body;

        if (!start_date || !end_date) {
            return res.status(400).json({ error: 'start_date and end_date are required' });
        }

        let deleteQuery = 'DELETE FROM schedules WHERE date >= ? AND date <= ?';
        const deleteParams = [start_date, end_date];

        if (branch) {
            deleteQuery += ' AND branch = ?';
            deleteParams.push(branch);
        }

        const result = db.prepare(deleteQuery).run(...deleteParams);

        res.json({ message: `Deleted ${result.changes} schedules in range` });
    } catch (error) {
        console.error('Delete range error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
