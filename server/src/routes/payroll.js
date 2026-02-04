const express = require('express');
const supabase = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /calculate?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Calculates transport allowance for all staff in a range
router.get('/calculate', authMiddleware, requireRole('admin', 'supervisor'), async (req, res) => {
    try {
        const { startDate, endDate, branch } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }

        let staffQuery = supabase.from('users').select('id, name, role, transport_allowance').eq('role', 'staff');

        if (branch) {
            staffQuery = staffQuery.eq('branch', branch);
        }

        const { data: staff, error: staffError } = await staffQuery;
        if (staffError) throw staffError;

        const results = await Promise.all(staff.map(async (user) => {
            // Count total shifts (PM and NT only) in the range for this user
            const { count, error } = await supabase
                .from('schedules')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .gte('date', startDate)
                .lte('date', endDate)
                .in('shift_type', ['PM', 'NT']);

            if (error) throw error;

            return {
                userId: user.id,
                name: user.name,
                role: user.role,
                transportAllowance: user.transport_allowance,
                shiftCount: count || 0,
                totalTransport: (count || 0) * user.transport_allowance,
                status: 'pending' // Default for calculation view
            };
        }));

        res.json(results);
    } catch (error) {
        console.error('Payroll calculation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /history
router.get('/history', authMiddleware, requireRole('admin', 'supervisor'), async (req, res) => {
    try {
        const { data: records, error } = await supabase
            .from('payroll_records')
            .select('*, users!inner(name)')
            .order('paid_at', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false });

        if (error) throw error;

        const flattened = records.map(r => ({
            ...r,
            user_name: r.users.name
        }));

        res.json(flattened);
    } catch (error) {
        console.error('Fetch payroll history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /record
router.post('/record', authMiddleware, requireRole('admin', 'supervisor'), async (req, res) => {
    try {
        const { userId, startDate, endDate, totalTransport } = req.body;

        const { data: newRecord, error } = await supabase
            .from('payroll_records')
            .insert([{
                user_id: userId,
                start_date: startDate,
                end_date: endDate,
                total_transport: totalTransport,
                status: 'pending'
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(newRecord);
    } catch (error) {
        console.error('Create payroll record error:', error);
        res.status(500).json({ error: 'Internal server error' });
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

        const paidAt = status === 'paid' ? new Date().toISOString() : null;

        const { data: updated, error } = await supabase
            .from('payroll_records')
            .update({ status, paid_at: paidAt })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(updated);
    } catch (error) {
        console.error('Update payroll status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
