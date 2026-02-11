const server = require('../server/src/server.js');
const { app } = server;
const database = require('../server/src/config/database.js');
const { connectPromise } = database;

module.exports = async (req, res) => {
    // Debug logging
    console.log(`[Vercel] Incoming request: ${req.method} ${req.url}`);

    try {
        await connectPromise;
        console.log('[Vercel] Database connected');
    } catch (e) {
        console.error('[Vercel] Database connection failed:', e);
        return res.status(500).json({
            error: 'Database connection failed',
            details: e.message
        });
    }

    app(req, res);
};
