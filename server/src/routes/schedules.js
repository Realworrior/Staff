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

const multer = require('multer');
const xlsx = require('xlsx');
const User = require('../models/User');
const bcrypt = require('bcrypt');

// Configure Multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Import Rota from Excel (Admin only)
router.post('/import', authMiddleware, requireRole('admin'), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });

        if (data.length < 2) {
            return res.status(400).json({ error: 'Excel file is empty or invalid format' });
        }

        // Row 1: Headers (Date, Name1, Name2, ...)
        const headers = data[0];
        const staffNames = headers.slice(1); // Skip 'Date' column

        // Auto-create missing users
        const userMap = new Map(); // Name -> UserID
        const defaultHash = bcrypt.hashSync('falmebet123', 10);
        let newUsersCount = 0;

        for (const name of staffNames) {
            if (!name) continue;
            const cleanName = name.toString().trim();
            // Try to find existing user (case-insensitive)
            let user = await User.findOne({ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } });

            if (!user) {
                // Create new user
                const username = cleanName.toLowerCase().replace(/\s+/g, '');
                user = await User.create({
                    name: cleanName,
                    username: `${username}_${Math.floor(Math.random() * 1000)}`, // Ensure uniqueness
                    password_hash: defaultHash,
                    role: 'staff',
                    branch: req.body.branch || 'betfalme'
                });
                newUsersCount++;
                console.log(`✨ Auto-created user: ${cleanName} (${user.username})`);
            }
            userMap.set(cleanName, user._id);
        }

        // Parse Rows
        const schedulesToInsert = [];
        const rows = data.slice(1);
        let branch = req.body.branch || 'betfalme';

        // Helper to parse Excel date serial number or string
        const parseDate = (value) => {
            if (!value) return null;
            if (typeof value === 'number') {
                // Excel serial date to JS Date
                return new Date(Math.round((value - 25569) * 86400 * 1000));
            }
            return new Date(value);
        };

        for (const row of rows) {
            const dateVal = row[0];
            if (!dateVal) continue;

            const date = parseDate(dateVal);
            if (isNaN(date.getTime())) continue;

            const dateStr = date.toISOString().split('T')[0];

            // Iterate columns for each staff
            staffNames.forEach((name, index) => {
                if (!name) return;
                const cleanName = name.toString().trim();
                const userId = userMap.get(cleanName);
                const shiftCode = row[index + 1]; // +1 because index 0 is Date

                if (userId && shiftCode) {
                    const code = shiftCode.toString().trim().toUpperCase();
                    let start = null, end = null;

                    if (code === 'AM') { start = '07:30:00'; end = '15:30:00'; }
                    else if (code === 'PM') { start = '15:30:00'; end = '22:30:00'; }
                    else if (code === 'NT') { start = '22:30:00'; end = '07:30:00'; }

                    if (start && end) {
                        schedulesToInsert.push({
                            user_id: userId,
                            date: new Date(dateStr),
                            start_time: start,
                            end_time: end,
                            shift_type: code,
                            branch: branch,
                            notes: 'Imported via Excel',
                            created_by: req.user.id
                        });
                    }
                }
            });
        }

        // Clean existing for this range (Optional: maybe safer to just add?)
        // For now, let's just append/upsert logic manually if needed, 
        // but user requested "populate", usually implies overwrite or fill. 
        // Plan said "populate DB directly". 
        // Let's delete range first to avoid duplicates if re-importing same file?
        if (schedulesToInsert.length > 0) {
            const dates = schedulesToInsert.map(s => s.date.getTime());
            const minDate = new Date(Math.min(...dates));
            const maxDate = new Date(Math.max(...dates));

            await Schedule.deleteMany({
                date: { $gte: minDate, $lte: maxDate },
                branch: branch
            });

            await Schedule.insertMany(schedulesToInsert);
        }

        res.json({
            message: `Import successful. Processed ${rows.length} days.`,
            stats: {
                newUsers: newUsersCount,
                shiftsCreated: schedulesToInsert.length
            }
        });

    } catch (error) {
        handleError(res, error, 'Import Excel Rota');
    }
});

module.exports = router;
