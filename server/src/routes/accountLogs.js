const express = require('express');
const router = express.Router();
const supabase = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET all account logs
router.get('/', authMiddleware, requireRole('admin', 'supervisor'), async (req, res) => {
    try {
        const { branch } = req.query;
        let query = supabase.from('account_logs').select('*');

        if (branch) {
            query = query.eq('branch', branch);
        }

        const { data: logs, error } = await query.order('last_request_at', { ascending: false });

        if (error) throw error;

        // Add priority logic in JS
        const processedLogs = logs.map(log => ({
            ...log,
            priority: log.request_count > 10 ? 'high' : log.request_count > 5 ? 'medium' : 'low'
        }));

        res.json({ data: processedLogs });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch account logs' });
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
        const { data: existing, error: checkError } = await supabase
            .from('account_logs')
            .select('*')
            .eq('phone_number', phone_number)
            .eq('branch', branch)
            .maybeSingle();

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
            const { data: updated, error: updateError } = await supabase
                .from('account_logs')
                .update({
                    request_count: existing.request_count + 1,
                    last_request_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single();

            if (updateError) throw updateError;
            return res.json({ message: 'Log updated successfully', id: existing.id });
        } else {
            // Insert new log
            const { data: inserted, error: insertError } = await supabase
                .from('account_logs')
                .insert([{ phone_number, branch }])
                .select()
                .single();

            if (insertError) throw insertError;
            return res.status(201).json({ message: 'Log created successfully', id: inserted.id });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to process account log' });
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
        const { error } = await supabase
            .from('account_logs')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Status updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

module.exports = router;
