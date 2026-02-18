const express = require('express');
const Schedule = require('../models/Schedule');
const User = require('../models/User');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { handleError } = require('../utils/errors');
const { Op } = require('sequelize');

const router = express.Router();

// Get schedules
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { start_date, end_date, user_id, branch } = req.query;

        let where = {};
        if (user_id) where.user_id = user_id;
        if (start_date || end_date) {
            where.date = {};
            if (start_date) where.date[Op.gte] = start_date;
            if (end_date) where.date[Op.lte] = end_date;
        }

        let include = [{
            model: User,
            attributes: ['name', 'role', 'branch']
        }];

        if (branch) {
            include[0].where = { branch };
        }

        const schedules = await Schedule.findAll({
            where,
            include,
            order: [['date', 'ASC'], ['start_time', 'ASC']]
        });

        const mappedSchedules = schedules.map(s => {
            const plain = s.get({ plain: true });
            return {
                ...plain,
                user_name: plain.User ? plain.User.name : 'Unknown',
                user_role: plain.User ? plain.User.role : 'Unknown'
            };
        });

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
            date,
            start_time,
            end_time,
            shift_type,
            notes,
            created_by: req.user.id,
            branch: branch || 'betfalme'
        });

        res.status(201).json(schedule);
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
            date: s.date,
            start_time: s.start_time,
            end_time: s.end_time,
            shift_type: s.shift_type || null,
            notes: s.notes || null,
            created_by: req.user.id,
            branch: s.branch || 'betfalme'
        }));

        await Schedule.bulkCreate(mappedSchedules, { ignoreDuplicates: true });

        res.status(201).json({ message: `${inputSchedules.length} schedules processed successfully` });
    } catch (error) {
        handleError(res, error, 'Bulk create schedules');
    }
});

// Update schedule (Admin only)
router.put('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { start_time, end_time, shift_type, notes } = req.body;

        const schedule = await Schedule.findByPk(id);

        if (!schedule) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        const updateData = {};
        if (start_time !== undefined) updateData.start_time = start_time;
        if (end_time !== undefined) updateData.end_time = end_time;
        if (shift_type !== undefined) updateData.shift_type = shift_type;
        if (notes !== undefined) updateData.notes = notes;

        await schedule.update(updateData);

        res.json(schedule);
    } catch (error) {
        handleError(res, error, 'Update schedule');
    }
});

// Delete schedule (Admin only)
router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const schedule = await Schedule.findByPk(id);
        if (schedule) {
            await schedule.destroy();
        }
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

        let where = {
            date: { [Op.gte]: start_date, [Op.lte]: end_date }
        };
        if (branch) where.branch = branch;

        await Schedule.destroy({ where });

        res.json({ message: `Schedules deleted successfully in range` });
    } catch (error) {
        handleError(res, error, 'Delete schedules by range');
    }
});

const multer = require('multer');
const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');

// Configure Multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Import Rota from Excel (Admin only)
router.post('/import', authMiddleware, requireRole('admin'), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        let workbook;
        try {
            workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
        } catch (e) {
            console.error('XLSX Parse Error:', e);
            return res.status(400).json({ error: 'Failed to parse file. Please ensure it is a valid Excel or CSV file.' });
        }

        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
            return res.status(400).json({ error: 'File contains no sheets or data.' });
        }

        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });

        if (!data || data.length < 2) {
            return res.status(400).json({ error: 'File is empty or invalid format (headers + at least one row required)' });
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
            // Case-insensitive find via SQL
            let user = await User.findOne({
                where: {
                    name: { [Op.like]: cleanName }
                }
            });

            if (!user) {
                // Create new user
                const usernameBase = cleanName.toLowerCase().replace(/\s+/g, '');
                user = await User.create({
                    name: cleanName,
                    username: `${usernameBase}_${Math.floor(Math.random() * 1000)}`,
                    password_hash: defaultHash,
                    role: 'staff',
                    branch: req.body.branch || 'betfalme'
                });
                newUsersCount++;
                console.log(`✨ Auto-created user: ${cleanName} (${user.username})`);
            }
            userMap.set(cleanName, user.id);
        }

        // Parse Rows
        const schedulesToInsert = [];
        const rows = data.slice(1);
        let branch = req.body.branch || 'betfalme';
        let allDates = [];

        for (const row of rows) {
            const dateVal = row[0];
            if (!dateVal) continue;

            let date = dateVal instanceof Date ? dateVal : new Date(dateVal);
            if (isNaN(date.getTime())) continue;

            const dateStr = date.toISOString().split('T')[0];
            allDates.push(dateStr);

            staffNames.forEach((name, index) => {
                if (!name) return;
                const cleanName = name.toString().trim();
                const userId = userMap.get(cleanName);
                const shiftCode = row[index + 1];

                if (userId && shiftCode) {
                    const code = shiftCode.toString().trim().toUpperCase();
                    let start = null, end = null;

                    if (code === 'AM') { start = '07:30:00'; end = '15:30:00'; }
                    else if (code === 'PM') { start = '15:30:00'; end = '22:30:00'; }
                    else if (code === 'NT') { start = '22:30:00'; end = '07:30:00'; }

                    if (start && end) {
                        schedulesToInsert.push({
                            user_id: userId,
                            date: dateStr,
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

        if (schedulesToInsert.length > 0) {
            const sortedDates = [...new Set(allDates)].sort();
            const minDate = sortedDates[0];
            const maxDate = sortedDates[sortedDates.length - 1];

            await Schedule.destroy({
                where: {
                    date: { [Op.gte]: minDate, [Op.lte]: maxDate },
                    branch: branch
                }
            });

            await Schedule.bulkCreate(schedulesToInsert, { ignoreDuplicates: true });
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
