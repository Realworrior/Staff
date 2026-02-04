const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

/**
 * Automatically initializes the Supabase database if tables are missing.
 * Requires SUPABASE_DB_PASSWORD in environment variables.
 */
async function initDatabase() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const dbPassword = process.env.SUPABASE_DB_PASSWORD;

    if (!supabaseUrl || !dbPassword || supabaseUrl.includes('your_supabase')) {
        console.warn('⚠️  Database manual setup required: SUPABASE_URL or SUPABASE_DB_PASSWORD is missing.');
        console.warn('   To enable automatic setup, add SUPABASE_DB_PASSWORD to your .env file.');
        return;
    }

    try {
        // Extract project ref from URL: https://[project-ref].supabase.co
        const match = supabaseUrl.match(/https:\/\/(.*?)\.supabase\.co/);
        if (!match) throw new Error('Invalid SUPABASE_URL format');

        const projectRef = match[1];
        const connectionString = `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`;

        const client = new Client({
            connectionString,
            connectionTimeoutMillis: 10000,
        });

        await client.connect();
        console.log('🐘 Connected to Supabase PostgreSQL for status check...');

        // Check if users table exists
        const checkRes = await client.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users');");

        if (!checkRes.rows[0].exists) {
            console.log('🚀 Missing tables detected. Running automated migration...');
            const schemaFile = path.join(__dirname, '../../supabase_schema.sql');

            if (!fs.existsSync(schemaFile)) {
                throw new Error('supabase_schema.sql not found in server directory');
            }

            const schemaSql = fs.readFileSync(schemaFile, 'utf8');

            // Execute schema
            await client.query(schemaSql);
            console.log('✅ Schema created successfully.');

            // Seed default admin user
            const adminPass = 'falmebet123';
            const hash = bcrypt.hashSync(adminPass, 10);

            // First find if any users exist to be safe, though users table was just created
            const userCount = await client.query('SELECT count(*) FROM users');

            if (parseInt(userCount.rows[0].count) === 0) {
                await client.query(`
                    INSERT INTO users (username, password_hash, name, role, branch) 
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (username) DO NOTHING;
                `, ['admin', hash, 'System Admin', 'admin', 'betfalme']);
                console.log('👤 Default admin user provisioned (admin / falmebet123).');
            }
        } else {
            console.log('✅ Database tables verified.');
        }

        await client.end();
    } catch (err) {
        console.error('❌ Database automated initialization failed:', err.message);
        console.error('   Please run the SQL manually in the Supabase Dashboard if this persists.');
    }
}

module.exports = { initDatabase };
