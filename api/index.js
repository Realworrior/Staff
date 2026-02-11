import server from '../server/src/server.js';
const { app } = server;
import database from '../server/src/config/database.js';
const { connectPromise } = database;

export default async (req, res) => {
    try {
        await connectPromise;
    } catch (e) {
        console.error('Database connection failed in Vercel function:', e);
        // Continue to app to let it handle error or fail gracefully
    }

    app(req, res);
};
