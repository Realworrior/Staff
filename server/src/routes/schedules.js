const express = require('express');
const supabase = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get schedules
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { start_date, end_date, user_id, branch } = req.query;

        let query = supabase
            .from('schedules')
            .select('*, users!inner(name, role)');

        if (user_id) {
            query = query.eq('user_id', user_id);
        }
        if (start_date) {
            query = query.gte('date', start_date);
        }
        if (end_date) {
            query = query.lte('date', end_date);
        }
        if (branch) {
            query = query.eq('branch', branch);
        }

        const { data: records, error } = await query
            .order('date', { ascending: true })
            .order('start_time', { ascending: true });

        if (error) throw error;

        // Flatten user info to match old schema
        const flattened = records.map(s => ({
            ...s,
            user_name: s.users.name,
            user_role: s.users.role
        }));

        res.json(flattened);
    } catch (error) {
        console.error('Get schedules error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create schedule (Admin only)
router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { user_id, date, start_time, end_time, shift_type, notes, branch } = req.body;

        if (!user_id || !date || !start_time || !end_time) {
            return res.status(400).json({ error: 'user_id, date, start_time, and end_time are required' });
        }

        const { data, error } = await supabase
            .from('schedules')
            .insert([{
                user_id,
                date,
                start_time,
                end_time,
                shift_type,
                notes,
                created_by: req.user.id,
                branch: branch || 'betfalme'
            }])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                return res.status(409).json({ error: 'Schedule already exists for this user at this time' });
            }
            throw error;
        }

        res.status(201).json(data);
    } catch (error) {
        console.error('Create schedule error:', error);
        res.status(500).json({ error: 'Internal server error' });
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
            date: s.date,
            start_time: s.start_time,
            end_time: s.end_time,
            shift_type: s.shift_type || null,
            notes: s.notes || null,
            created_by: req.user.id,
            branch: s.branch || 'betfalme'
        }));

        const { error } = await supabase
            .from('schedules')
            .insert(mappedSchedules);

        if (error) throw error;

        res.status(201).json({ message: `${inputSchedules.length} schedules created successfully` });
    } catch (error) {
        console.error('Bulk create error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update schedule (Admin only)
router.put('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { start_time, end_time, shift_type, notes } = req.body;

        const { data: schedule, error: fetchError } = await supabase
            .from('schedules')
            .select('id')
            .eq('id', id)
            .single();

        if (fetchError || !schedule) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        const updateData = {};
        if (start_time !== undefined) updateData.start_time = start_time;
        if (end_time !== undefined) updateData.end_time = end_time;
        if (shift_type !== undefined) updateData.shift_type = shift_type;
        if (notes !== undefined) updateData.notes = notes;

        const { data: updated, error: updateError } = await supabase
            .from('schedules')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (updateError) throw updateError;
        res.json(updated);
    } catch (error) {
        console.error('Update schedule error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete schedule (Admin only)
router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('schedules')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ message: 'Schedule deleted successfully' });
    } catch (error) {
        console.error('Delete schedule error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete schedules by range (Admin only) - For Rota Overwrite
router.delete('/range/bulk', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { start_date, end_date, branch } = req.body;

        if (!start_date || !end_date) {
            return res.status(400).json({ error: 'start_date and end_date are required' });
        }

        let query = supabase.from('schedules').delete().gte('date', start_date).lte('date', end_date);

        if (branch) {
            query = query.eq('branch', branch);
        }

        const { error } = await query;

        if (error) throw error;

        res.json({ message: `Schedules deleted successfully in range` });
    } catch (error) {
        console.error('Delete range error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
