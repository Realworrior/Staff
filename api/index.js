const server = require('../server/src/server.js');
const { app, seedData } = server;
const database = require('../server/src/config/database.js');
let isSeeded = false;

module.exports = async (req, res) => {
    console.log(`[Vercel] Request received: ${req.method} ${req.url}`);
    try {
        console.log('[Vercel] Connecting to database...');
        await database.connectPromise;

        if (!isSeeded) {
            console.log('[Vercel] Database connected, seeding data...');
            await seedData();
            isSeeded = true;
            console.log('[Vercel] Seeded successfully.');
        }
    } catch (e) {
        console.error('[Vercel] CRITICAL ERROR:', e);
        return res.status(500).json({
            error: 'Backend Initialization Failed',
            message: e.message,
            stack: process.env.NODE_ENV === 'production' ? null : e.stack
        });
    }

    // Call the express app
    app(req, res);
};
