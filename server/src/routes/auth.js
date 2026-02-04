const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const supabase = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        console.log(`🔑 Login attempt for user: ${username}`);

        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('username', username.toLowerCase())
            .single();

        if (fetchError || !user) {
            console.warn(`❌ Login failed: User '${username}' not found in Supabase.`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = bcrypt.compareSync(password, user.password_hash);

        if (!isValidPassword) {
            console.warn(`❌ Login failed: Incorrect password for user '${username}'.`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        console.log(`✅ Login successful for user: ${username}`);

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // Remove password from response
        const { password_hash, ...userWithoutPassword } = user;

        res.json({
            token,
            user: userWithoutPassword
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, username, name, email, role, branch, avatar, created_at')
            .eq('id', req.user.id)
            .single();

        if (error || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
