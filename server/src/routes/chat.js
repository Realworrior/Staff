const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// GET /channels
// List all public channels and private channels I am a member of
router.get('/channels', authMiddleware, (req, res) => {
    try {
        const channels = db.prepare(`
            SELECT DISTINCT c.* 
            FROM chat_channels c
            LEFT JOIN channel_members cm ON c.id = cm.channel_id
            WHERE c.type IN ('public', 'private') OR cm.user_id = ?
            ORDER BY c.type DESC, c.name ASC
        `).all(req.user.id);
        res.json(channels);
    } catch (error) {
        console.error('Fetch channels error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /channels
router.post('/channels', authMiddleware, (req, res) => {
    try {
        const { name, description, type } = req.body;
        if (!name) return res.status(400).json({ error: 'Channel name is required' });

        const result = db.prepare(`
            INSERT INTO chat_channels (name, description, type, created_by)
            VALUES (?, ?, ?, ?)
        `).run(name.toLowerCase().replace(/\s+/g, '-'), description || null, type || 'public', req.user.id);

        const newChannel = db.prepare('SELECT * FROM chat_channels WHERE id = ?').get(result.lastInsertRowid);

        // Auto-join creator
        db.prepare('INSERT INTO channel_members (channel_id, user_id) VALUES (?, ?)').run(newChannel.id, req.user.id);

        res.status(201).json(newChannel);
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Channel name already exists' });
        }
        console.error('Create channel error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /direct-messages
// Special endpoint to get all users I have a DM with
router.get('/direct-messages', authMiddleware, (req, res) => {
    try {
        const dmChannels = db.prepare(`
            SELECT c.*, u.name as target_user_name, u.avatar as target_user_avatar, u.id as target_user_id
            FROM chat_channels c
            JOIN channel_members cm_self ON c.id = cm_self.channel_id AND cm_self.user_id = ?
            JOIN channel_members cm_target ON c.id = cm_target.channel_id AND cm_target.user_id != ?
            JOIN users u ON cm_target.user_id = u.id
            WHERE c.type = 'dm'
        `).all(req.user.id, req.user.id);
        res.json(dmChannels);
    } catch (error) {
        console.error('Fetch DMs error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /dm
// Find or create a DM channel between current user and target user
router.post('/dm', authMiddleware, (req, res) => {
    try {
        const { targetUserId } = req.body;
        if (!targetUserId) return res.status(400).json({ error: 'Target user ID is required' });

        const ids = [req.user.id, parseInt(targetUserId)].sort((a, b) => a - b);
        const dmName = `dm_${ids[0]}_${ids[1]}`;

        let channel = db.prepare('SELECT * FROM chat_channels WHERE name = ? AND type = ?').get(dmName, 'dm');

        if (!channel) {
            const result = db.prepare(`
                INSERT INTO chat_channels (name, type, created_by)
                VALUES (?, ?, ?)
            `).run(dmName, 'dm', req.user.id);

            channel = db.prepare('SELECT * FROM chat_channels WHERE id = ?').get(result.lastInsertRowid);

            const insertMember = db.prepare('INSERT INTO channel_members (channel_id, user_id) VALUES (?, ?)');
            insertMember.run(channel.id, ids[0]);
            if (ids[0] !== ids[1]) insertMember.run(channel.id, ids[1]);
        }

        res.json(channel);
    } catch (error) {
        console.error('DM creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /channels/:id/messages
router.get('/channels/:id/messages', authMiddleware, (req, res) => {
    try {
        const { id } = req.params;

        const channel = db.prepare(`
            SELECT c.* FROM chat_channels c
            LEFT JOIN channel_members cm ON c.id = cm.channel_id
            WHERE c.id = ? AND (c.type = 'public' OR cm.user_id = ?)
        `).get(id, req.user.id);

        if (!channel) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const messages = db.prepare(`
            SELECT m.*, u.name as user_name, u.avatar as user_avatar,
                   (SELECT json_group_array(json_object('emoji', emoji, 'user_id', user_id)) FROM message_reactions WHERE message_id = m.id) as reactions
            FROM chat_messages m
            JOIN users u ON m.user_id = u.id
            WHERE m.channel_id = ?
            ORDER BY m.created_at ASC
            LIMIT 100
        `).all(id);

        const parsedMessages = messages.map(msg => ({
            ...msg,
            reactions: JSON.parse(msg.reactions || '[]')
        }));

        res.json(parsedMessages);
    } catch (error) {
        console.error('Fetch messages error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /messages
router.post('/messages', authMiddleware, (req, res) => {
    try {
        const { channelId, content, file_url, file_name, file_type } = req.body;

        if (!channelId || (!content && !file_url)) {
            return res.status(400).json({ error: 'Channel ID and content/file are required' });
        }

        const result = db.prepare(`
            INSERT INTO chat_messages (channel_id, user_id, content, file_url, file_name, file_type)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(channelId, req.user.id, content || '', file_url || null, file_name || null, file_type || null);

        const newMessage = db.prepare(`
            SELECT m.*, u.name as user_name, u.avatar as user_avatar
            FROM chat_messages m
            JOIN users u ON m.user_id = u.id
            WHERE m.id = ?
        `).get(result.lastInsertRowid);

        res.status(201).json({ ...newMessage, reactions: [] });
    } catch (error) {
        console.error('Create message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /upload
router.post('/upload', authMiddleware, upload.single('file'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({
            url: fileUrl,
            name: req.file.originalname,
            type: req.file.mimetype
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /reactions
router.post('/reactions', authMiddleware, (req, res) => {
    try {
        const { messageId, emoji } = req.body;

        const existing = db.prepare('SELECT id FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?')
            .get(messageId, req.user.id, emoji);

        if (existing) {
            db.prepare('DELETE FROM message_reactions WHERE id = ?').run(existing.id);
            res.json({ action: 'removed', emoji, messageId, userId: req.user.id });
        } else {
            db.prepare('INSERT INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)')
                .run(messageId, req.user.id, emoji);
            res.json({ action: 'added', emoji, messageId, userId: req.user.id });
        }
    } catch (error) {
        console.error('Reaction error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
