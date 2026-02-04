const express = require('express');
const supabase = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// Clock in (Staff/Supervisor only)
router.post('/clock-in', authMiddleware, requireRole('staff', 'supervisor'), async (req, res) => {
    try {
        const { location, latitude, longitude } = req.body;
        const today = new Date().toISOString().split('T')[0];
        const currentTime = new Date().toLocaleTimeString('en-GB', { hour12: false });

        // Check if already clocked in today
        const { data: existing, error: checkError } = await supabase
            .from('attendance')
            .select('id')
            .eq('user_id', req.user.id)
            .eq('date', today)
            .is('clock_out', null)
            .maybeSingle();

        if (existing) {
            return res.status(400).json({ error: 'Already clocked in' });
        }

        const { data, error } = await supabase
            .from('attendance')
            .insert([{
                user_id: req.user.id,
                date: today,
                clock_in: currentTime,
                location,
                latitude,
                longitude
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error('Clock in error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Clock out (Staff/Supervisor only)
router.post('/clock-out', authMiddleware, requireRole('staff', 'supervisor'), async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const currentTime = new Date().toLocaleTimeString('en-GB', { hour12: false });

        const { data: attendance, error: fetchError } = await supabase
            .from('attendance')
            .select('*')
            .eq('user_id', req.user.id)
            .eq('date', today)
            .is('clock_out', null)
            .maybeSingle();

        if (fetchError || !attendance) {
            return res.status(400).json({ error: 'Not clocked in' });
        }

        const { data: updated, error: updateError } = await supabase
            .from('attendance')
            .update({ clock_out: currentTime })
            .eq('id', attendance.id)
            .select()
            .single();

        if (updateError) throw updateError;
        res.json(updated);
    } catch (error) {
        console.error('Clock out error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get my attendance records
router.get('/my-records', authMiddleware, async (req, res) => {
    try {
        const { data: records, error } = await supabase
            .from('attendance')
            .select('*')
            .eq('user_id', req.user.id)
            .order('date', { ascending: false })
            .order('clock_in', { ascending: false })
            .limit(50);

        if (error) throw error;
        res.json(records);
    } catch (error) {
        console.error('Get records error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all attendance (Admin only)
router.get('/all', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { startDate, endDate, userId, branch } = req.query;

        let query = supabase
            .from('attendance')
            .select('*, users!inner(name, role, branch)');

        if (branch) {
            query = query.eq('users.branch', branch);
        }
        if (startDate) {
            query = query.gte('date', startDate);
        }
        if (endDate) {
            query = query.lte('date', endDate);
        }
        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data: records, error } = await query
            .order('date', { ascending: false })
            .order('clock_in', { ascending: false });

        if (error) throw error;

        // Flatten user info to match old schema
        const flattened = records.map(r => ({
            ...r,
            user_name: r.users.name,
            user_role: r.users.role
        }));

        res.json(flattened);
    } catch (error) {
        console.error('Get all attendance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get attendance summary (Admin only)
router.get('/summary', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { branch } = req.query;
        const today = new Date().toISOString().split('T')[0];
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

        // 1. Total staff
        let staffQuery = supabase.from('users').select('*', { count: 'exact', head: true }).in('role', ['staff', 'supervisor']);
        if (branch) staffQuery = staffQuery.eq('branch', branch);
        const { count: totalStaffCount } = await staffQuery;

        // 2. Present today
        let presentQuery = supabase.from('attendance').select('user_id, users!inner(branch)', { count: 'exact', head: true }).eq('date', today);
        if (branch) presentQuery = presentQuery.eq('users.branch', branch);
        const { count: presentTodayCount } = await presentQuery;

        // 3. Last 30 days data for Avg Hours and Late Arrival (doing calculation in JS)
        let thirtyDaysQuery = supabase.from('attendance').select('clock_in, clock_out, users!inner(branch)').gte('date', thirtyDaysAgoStr);
        if (branch) thirtyDaysQuery = thirtyDaysQuery.eq('users.branch', branch);
        const { data: recentRecords, error } = await thirtyDaysQuery;

        if (error) throw error;

        let totalHours = 0;
        let recordsWithHours = 0;
        let lateCount = 0;

        recentRecords.forEach(r => {
            // Late check
            if (r.clock_in > '09:05:00') lateCount++;

            // Hours check
            if (r.clock_in && r.clock_out) {
                const [h1, m1, s1] = r.clock_in.split(':').map(Number);
                const [h2, m2, s2] = r.clock_out.split(':').map(Number);
                const hrs = (h2 + m2 / 60 + (s2 || 0) / 3600) - (h1 + m1 / 60 + (s1 || 0) / 3600);
                if (hrs > 0) {
                    totalHours += hrs;
                    recordsWithHours++;
                }
            }
        });

        res.json({
            totalStaff: totalStaffCount || 0,
            presentToday: presentTodayCount || 0,
            avgHoursWorked: recordsWithHours > 0 ? (totalHours / recordsWithHours).toFixed(2) : 0,
            lateArrivals: lateCount
        });
    } catch (error) {
        console.error('Get summary error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
