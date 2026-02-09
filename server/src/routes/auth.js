const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { handleError } = require('../utils/errors');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        console.log(`🔑 Login attempt for user: ${username}`);

        const user = await User.findOne({ username: username.toLowerCase() });

        if (!user) {
            console.warn(`❌ Login failed: User '${username}' not found in MongoDB.`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = bcrypt.compareSync(password, user.password_hash);

        if (!isValidPassword) {
            console.warn(`❌ Login failed: Incorrect password for user '${username}'.`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        console.log(`✅ Login successful for user: ${username}`);

        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // Remove password from response
        const { password_hash, ...userWithoutPassword } = user.toObject();

        res.json({
            token,
            user: { ...userWithoutPassword, id: user._id }
        });
    } catch (error) {
        handleError(res, error, 'Login');
    }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password_hash');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ ...user.toObject(), id: user._id });
    } catch (error) {
        handleError(res, error, 'Get current user');
    }
});

module.exports = router;
