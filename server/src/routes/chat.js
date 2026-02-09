const express = require('express');
const multer = require('multer');
const path = require('path');
const { mongoose, supabase } = require('../config/database');
const ChatChannel = require('../models/ChatChannel');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { handleError } = require('../utils/errors');

const router = express.Router();

// Multer setup for file uploads (memory storage for cloud portability)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// GET /channels
router.get('/channels', authMiddleware, async (req, res) => {
    try {
        const channels = await ChatChannel.find({
            $or: [
                { type: 'public' },
                { members: req.user.id }
            ]
        }).sort({ type: -1, name: 1 });

        const mappedChannels = channels.map(c => ({ ...c.toObject(), id: c._id }));
        res.json(mappedChannels);
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

        res.status(201).json({ ...channel.toObject(), id: channel._id });
    } catch (error) {
        handleError(res, error, 'Create channel');
    }
});

// GET /direct-messages
router.get('/direct-messages', authMiddleware, async (req, res) => {
    try {
        const dms = await ChatChannel.find({
            type: 'dm',
            members: req.user.id
        }).populate('members', 'id name avatar');

        const results = dms.map(dm => {
            const other = dm.members.find(m => m._id.toString() !== req.user.id.toString());
            if (!other) return null;
            return {
                ...dm.toObject(),
                id: dm._id,
                target_user_name: other.name,
                target_user_avatar: other.avatar,
                target_user_id: other._id
            };
        }).filter(Boolean);

        res.json(results);
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

        let channel = await ChatChannel.findOne({ name: dmName, type: 'dm' });

        if (!channel) {
            channel = await ChatChannel.create({
                name: dmName,
                type: 'dm',
                created_by: req.user.id,
                members: [ids[0], ids[1]]
            });
        }

        res.json({ ...channel.toObject(), id: channel._id });
    } catch (error) {
        handleError(res, error, 'DM creation');
    }
});

// GET /channels/:id/messages
router.get('/channels/:id/messages', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const channel = await ChatChannel.findById(id);
        if (!channel) return res.status(404).json({ error: 'Channel not found' });

        const isMember = channel.members.some(m => m.toString() === req.user.id);
        if (channel.type !== 'public' && !isMember) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const messages = await ChatMessage.find({ channel_id: id })
            .populate('user_id', 'name avatar')
            .sort({ created_at: 1 })
            .limit(100);

        const processedMessages = messages.map(m => ({
            ...m.toObject(),
            id: m._id,
            user_name: m.user_id ? m.user_id.name : 'Unknown',
            user_avatar: m.user_id ? m.user_id.avatar : null,
            reactions: m.reactions || []
        }));

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

        const populated = await ChatMessage.findById(message._id).populate('user_id', 'name avatar');

        res.status(201).json({
            ...populated.toObject(),
            id: populated._id,
            user_name: populated.user_id.name,
            user_avatar: populated.user_id.avatar,
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

        const message = await ChatMessage.findById(messageId);
        if (!message) return res.status(404).json({ error: 'Message not found' });

        const existingIndex = message.reactions.findIndex(
            r => r.user_id.toString() === req.user.id.toString() && r.emoji === emoji
        );

        if (existingIndex > -1) {
            message.reactions.splice(existingIndex, 1);
            await message.save();
            res.json({ action: 'removed', emoji, messageId, userId: req.user.id });
        } else {
            message.reactions.push({ user_id: req.user.id, emoji });
            await message.save();
            res.json({ action: 'added', emoji, messageId, userId: req.user.id });
        }
    } catch (error) {
        handleError(res, error, 'Reaction toggle');
    }
});

module.exports = router;
