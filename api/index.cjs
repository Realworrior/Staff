const server = require('../server/src/server.js');
const { app } = server;
const database = require('../server/src/config/database.js');
const { connectPromise } = database;

module.exports = async (req, res) => {
    try {
        await connectPromise;
    } catch (e) {
        console.error('[Vercel] Database connection failed:', e);
        return res.status(500).json({
            error: 'Database connection failed',
            details: e.message
        });
    }

    app(req, res);
};
