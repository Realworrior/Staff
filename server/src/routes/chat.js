const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const supabase = require('../config/database');
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
router.get('/channels', authMiddleware, async (req, res) => {
    try {
        // In Supabase, we can use a complex query or just fetch what the user has access to.
        // For simplicity and matching old logic:
        const { data: channels, error } = await supabase
            .from('chat_channels')
            .select('*, channel_members!left(user_id)')
            .or(`type.eq.public,type.eq.private,channel_members.user_id.eq.${req.user.id}`)
            .order('type', { ascending: false })
            .order('name', { ascending: true });

        if (error) throw error;

        // Remove the join data from the final response to keep it clean
        const cleanedChannels = channels.map(({ channel_members, ...c }) => c);

        // Filter unique by ID (since the join might create duplicates)
        const uniqueChannels = Array.from(new Map(cleanedChannels.map(c => [c.id, c])).values());

        res.json(uniqueChannels);
    } catch (error) {
        console.error('Fetch channels error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /channels
router.post('/channels', authMiddleware, async (req, res) => {
    try {
        const { name, description, type } = req.body;
        if (!name) return res.status(400).json({ error: 'Channel name is required' });

        const channelName = name.toLowerCase().replace(/\s+/g, '-');

        const { data: newChannel, error } = await supabase
            .from('chat_channels')
            .insert([{
                name: channelName,
                description: description || null,
                type: type || 'public',
                created_by: req.user.id
            }])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(409).json({ error: 'Channel name already exists' });
            }
            throw error;
        }

        // Auto-join creator
        await supabase.from('channel_members').insert([{
            channel_id: newChannel.id,
            user_id: req.user.id
        }]);

        res.status(201).json(newChannel);
    } catch (error) {
        console.error('Create channel error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /direct-messages
router.get('/direct-messages', authMiddleware, async (req, res) => {
    try {
        // This is a bit complex for a single Supabase query without a view.
        // We'll perform it in a few steps or use raw SQL if needed.
        // Step 1: Find all 'dm' channels I'm in
        const { data: myDms, error } = await supabase
            .from('channel_members')
            .select('channel_id, chat_channels!inner(*)')
            .eq('user_id', req.user.id)
            .eq('chat_channels.type', 'dm');

        if (error) throw error;
        if (!myDms.length) return res.json([]);

        const channelIds = myDms.map(d => d.channel_id);

        // Step 2: Get the other member and their user info for each channel
        const { data: others, error: othersError } = await supabase
            .from('channel_members')
            .select('channel_id, users!inner(id, name, avatar)')
            .in('channel_id', channelIds)
            .neq('user_id', req.user.id);

        if (othersError) throw othersError;

        const results = myDms.map(dm => {
            const other = others.find(o => o.channel_id === dm.channel_id);
            if (!other) return null;
            return {
                ...dm.chat_channels,
                target_user_name: other.users.name,
                target_user_avatar: other.users.avatar,
                target_user_id: other.users.id
            };
        }).filter(Boolean);

        res.json(results);
    } catch (error) {
        console.error('Fetch DMs error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /dm
router.post('/dm', authMiddleware, async (req, res) => {
    try {
        const { targetUserId } = req.body;
        if (!targetUserId) return res.status(400).json({ error: 'Target user ID is required' });

        const ids = [req.user.id, parseInt(targetUserId)].sort((a, b) => a - b);
        const dmName = `dm_${ids[0]}_${ids[1]}`;

        let { data: channel, error: fetchError } = await supabase
            .from('chat_channels')
            .select('*')
            .eq('name', dmName)
            .eq('type', 'dm')
            .maybeSingle();

        if (!channel) {
            const { data: newChannel, error: createError } = await supabase
                .from('chat_channels')
                .insert([{ name: dmName, type: 'dm', created_by: req.user.id }])
                .select()
                .single();

            if (createError) throw createError;
            channel = newChannel;

            const members = [{ channel_id: channel.id, user_id: ids[0] }];
            if (ids[0] !== ids[1]) {
                members.push({ channel_id: channel.id, user_id: ids[1] });
            }

            await supabase.from('channel_members').insert(members);
        }

        res.json(channel);
    } catch (error) {
        console.error('DM creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /channels/:id/messages
router.get('/channels/:id/messages', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        // Verify access
        const { data: channel, error: accessError } = await supabase
            .from('chat_channels')
            .select('*, channel_members(user_id)')
            .eq('id', id)
            .or(`type.eq.public,channel_members.user_id.eq.${req.user.id}`)
            .maybeSingle();

        if (accessError || !channel) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { data: messages, error } = await supabase
            .from('chat_messages')
            .select(`
                *,
                users(name, avatar),
                message_reactions(emoji, user_id)
            `)
            .eq('channel_id', id)
            .order('created_at', { ascending: true })
            .limit(100);

        if (error) throw error;

        const processedMessages = messages.map(m => ({
            ...m,
            user_name: m.users.name,
            user_avatar: m.users.avatar,
            reactions: m.message_reactions || []
        }));

        res.json(processedMessages);
    } catch (error) {
        console.error('Fetch messages error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /messages
router.post('/messages', authMiddleware, async (req, res) => {
    try {
        const { channelId, content, file_url, file_name, file_type } = req.body;

        if (!channelId || (!content && !file_url)) {
            return res.status(400).json({ error: 'Channel ID and content/file are required' });
        }

        const { data: message, error } = await supabase
            .from('chat_messages')
            .insert([{
                channel_id: channelId,
                user_id: req.user.id,
                content: content || '',
                file_url: file_url || null,
                file_name: file_name || null,
                file_type: file_type || null
            }])
            .select('*, users(name, avatar)')
            .single();

        if (error) throw error;

        res.status(201).json({
            ...message,
            user_name: message.users.name,
            user_avatar: message.users.avatar,
            reactions: []
        });
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
router.post('/reactions', authMiddleware, async (req, res) => {
    try {
        const { messageId, emoji } = req.body;

        const { data: existing, error: checkError } = await supabase
            .from('message_reactions')
            .select('id')
            .eq('message_id', messageId)
            .eq('user_id', req.user.id)
            .eq('emoji', emoji)
            .maybeSingle();

        if (existing) {
            await supabase.from('message_reactions').delete().eq('id', existing.id);
            res.json({ action: 'removed', emoji, messageId, userId: req.user.id });
        } else {
            await supabase.from('message_reactions').insert([{
                message_id: messageId,
                user_id: req.user.id,
                emoji
            }]);
            res.json({ action: 'added', emoji, messageId, userId: req.user.id });
        }
    } catch (error) {
        console.error('Reaction error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
