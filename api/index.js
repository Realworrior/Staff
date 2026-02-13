const server = require('../server/src/server.js');
const { app, seedData } = server;
const database = require('../server/src/config/database.js');
const { connectPromise } = database;

module.exports = async (req, res) => {
    console.log(`[Vercel] Request received: ${req.method} ${req.url}`);
    try {
        console.log('[Vercel] Connecting to database...');
        await connectPromise;
        console.log('[Vercel] Database connected, seeding data...');
        await seedData();
        console.log('[Vercel] Seeding complete.');
    } catch (e) {
        console.error('[Vercel] Database connection/seeding failed:', e);
        return res.status(500).json({
            error: 'Database connection failed',
            details: e.message,
            stack: e.stack
        });
    }

    app(req, res);
};
