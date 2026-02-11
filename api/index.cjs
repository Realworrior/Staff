const server = require('../server/src/server.js');
const { app } = server;
const database = require('../server/src/config/database.js');
const { connectPromise, mongoose } = database;
const User = require('../server/src/models/User');
const bcrypt = require('bcryptjs');

module.exports = async (req, res) => {
    // Debug logging
    console.log(`[Vercel] Incoming request: ${req.method} ${req.url}`);

    try {
        await connectPromise;
        console.log('[Vercel] Database connected');

        // 🔒 Auto-seed Admin if missing (Vercel cold start helper)
        if (mongoose.connection.readyState === 1) {
            const adminExists = await User.findOne({ username: 'admin' });
            if (!adminExists) {
                console.log('[Vercel] Seeding default admin...');
                const hash = bcrypt.hashSync('falmebet123', 10);
                await User.create({
                    username: 'admin',
                    password_hash: hash,
                    name: 'System Admin',
                    role: 'admin',
                    branch: 'betfalme'
                });
            }
        }
    } catch (e) {
        console.error('[Vercel] Function failed:', e);
        return res.status(500).json({
            error: 'Server initialization failed',
            details: e.message
        });
    }

    // Handle the request
    app(req, res);
};
