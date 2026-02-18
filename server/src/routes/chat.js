const express = require('express');
const multer = require('multer');
const path = require('path');
const { supabase } = require('../config/database');
const ChatChannel = require('../models/ChatChannel');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { handleError } = require('../utils/errors');
const { Op } = require('sequelize');

const router = express.Router();

// Multer setup for file uploads (memory storage for cloud portability)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// GET /channels
router.get('/channels', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const channels = await ChatChannel.findAll({
            where: {
                [Op.or]: [
                    { type: 'public' },
                    { members: { [Op.like]: `%${userId}%` } } // Basic search for member in JSON string
                ]
            },
            order: [['type', 'DESC'], ['name', 'ASC']]
        });

        // Filter more accurately in JS if needed, but for SQLite simple LIKE on JSON string often works for IDs
        const filtered = channels.filter(c =>
            c.type === 'public' || (c.members && c.members.includes(userId))
        );

        res.json(filtered);
    } catch (error) {
        handleError(res, error, 'Fetch channels');
    }
});

// POST /channels
router.post('/channels', authMiddleware, async (req, res) => {
    try {
        const { name, description, type } = req.body;
        if (!name) return res.status(400).json({ error: 'Channel name is required' });

        const channelName = name.toLowerCase().replace(/\s+/g, '-');

        const channel = await ChatChannel.create({
            name: channelName,
            description: description || null,
            type: type || 'public',
            created_by: req.user.id,
            members: [req.user.id] // Auto-join creator
        });

        res.status(201).json(channel);
    } catch (error) {
        handleError(res, error, 'Create channel');
    }
});

// GET /direct-messages
router.get('/direct-messages', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const dms = await ChatChannel.findAll({
            where: {
                type: 'dm',
                members: { [Op.like]: `%${userId}%` }
            },
            include: [{
                model: User,
                as: 'MemberDetails', // We'll need to define this association carefully
                attributes: ['id', 'name', 'avatar']
            }]
        });

        // Since we didn't define formal associations for 'members' array in Sequelize yet,
        // we'll fetch details manually or update models. Let's do manual for now to be safe.
        const results = await Promise.all(dms.map(async (dm) => {
            if (!dm.members.includes(userId)) return null;

            const otherId = dm.members.find(id => id !== userId);
            const other = await User.findByPk(otherId, { attributes: ['id', 'name', 'avatar'] });

            if (!other) return null;

            return {
                ...dm.get({ plain: true }),
                target_user_name: other.name,
                target_user_avatar: other.avatar,
                target_user_id: other.id
            };
        }));

        res.json(results.filter(Boolean));
    } catch (error) {
        handleError(res, error, 'Fetch DMs');
    }
});

// POST /dm
router.post('/dm', authMiddleware, async (req, res) => {
    try {
        const { targetUserId } = req.body;
        if (!targetUserId) return res.status(400).json({ error: 'Target user ID is required' });

        const ids = [req.user.id, targetUserId].sort();
        const dmName = `dm_${ids[0]}_${ids[1]}`;

        let channel = await ChatChannel.findOne({ where: { name: dmName, type: 'dm' } });

        if (!channel) {
            channel = await ChatChannel.create({
                name: dmName,
                type: 'dm',
                created_by: req.user.id,
                members: [ids[0], ids[1]]
            });
        }

        res.json(channel);
    } catch (error) {
        handleError(res, error, 'DM creation');
    }
});

// GET /channels/:id/messages
router.get('/channels/:id/messages', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const channel = await ChatChannel.findByPk(id);
        if (!channel) return res.status(404).json({ error: 'Channel not found' });

        const isMember = channel.members && channel.members.includes(req.user.id);
        if (channel.type !== 'public' && !isMember) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const messages = await ChatMessage.findAll({
            where: { channel_id: id },
            include: [{
                model: User,
                attributes: ['name', 'avatar']
            }],
            order: [['created_at', 'ASC']],
            limit: 100
        });

        const processedMessages = messages.map(m => {
            const plain = m.get({ plain: true });
            return {
                ...plain,
                user_name: plain.User ? plain.User.name : 'Unknown',
                user_avatar: plain.User ? plain.User.avatar : null,
                reactions: plain.reactions || []
            };
        });

        res.json(processedMessages);
    } catch (error) {
        handleError(res, error, 'Fetch messages');
    }
});

// POST /messages
router.post('/messages', authMiddleware, async (req, res) => {
    try {
        const { channelId, content, file_url, file_name, file_type } = req.body;

        if (!channelId || (!content && !file_url)) {
            return res.status(400).json({ error: 'Channel ID and content/file are required' });
        }

        const message = await ChatMessage.create({
            channel_id: channelId,
            user_id: req.user.id,
            content: content || '',
            file_url: file_url || null,
            file_name: file_name || null,
            file_type: file_type || null
        });

        const populated = await ChatMessage.findByPk(message.id, {
            include: [{
                model: User,
                attributes: ['name', 'avatar']
            }]
        });

        const plain = populated.get({ plain: true });
        res.status(201).json({
            ...plain,
            user_name: plain.User.name,
            user_avatar: plain.User.avatar,
            reactions: []
        });
    } catch (error) {
        handleError(res, error, 'Create message');
    }
});

// POST /upload
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        if (!supabase) {
            return res.status(503).json({ error: 'File upload is not configured (Supabase missing).' });
        }
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const file = req.file;
        const fileExt = path.extname(file.originalname);
        const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExt}`;
        const filePath = `chat/${fileName}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('chat-uploads')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (error) {
            console.error('Supabase Storage Error:', error);
            return res.status(500).json({ error: 'Failed to upload to cloud storage' });
        }

        const { data: { publicUrl } } = supabase.storage
            .from('chat-uploads')
            .getPublicUrl(filePath);

        res.json({
            url: publicUrl,
            name: file.originalname,
            type: file.mimetype
        });
    } catch (error) {
        handleError(res, error, 'Upload file');
    }
});

// POST /reactions
router.post('/reactions', authMiddleware, async (req, res) => {
    try {
        const { messageId, emoji } = req.body;
        const userId = req.user.id;

        const message = await ChatMessage.findByPk(messageId);
        if (!message) return res.status(404).json({ error: 'Message not found' });

        let currentReactions = message.reactions || [];
        const existingIndex = currentReactions.findIndex(
            r => r.user_id === userId && r.emoji === emoji
        );

        if (existingIndex > -1) {
            // Remove reaction
            currentReactions = currentReactions.filter((_, i) => i !== existingIndex);
            await message.update({ reactions: currentReactions });
            res.json({ action: 'removed', emoji, messageId, userId });
        } else {
            // Add reaction
            currentReactions = [...currentReactions, { user_id: userId, emoji }];
            await message.update({ reactions: currentReactions });
            res.json({ action: 'added', emoji, messageId, userId });
        }
    } catch (error) {
        handleError(res, error, 'Reaction toggle');
    }
});

module.exports = router;
