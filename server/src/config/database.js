const { Sequelize } = require('sequelize');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config();

let sequelize;

// Database connection logic
// Priority: 1. DATABASE_URL/POSTGRES_URL (Postgres) -> 2. Supabase Config (Auto-construct) -> 3. SQLite
let dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

// Auto-construct Supabase URL if components are present but full URL is not
// We only do this in production (Vercel) to avoid overriding local SQLite
if (!dbUrl && process.env.SUPABASE_URL && process.env.SUPABASE_DB_PASSWORD && process.env.NODE_ENV !== 'development') {
  try {
    const projectId = process.env.SUPABASE_URL.split('://')[1].split('.')[0];
    const password = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD);
    // Construct direct connection URL
    dbUrl = `postgresql://postgres:${password}@db.${projectId}.supabase.co:5432/postgres`;
    console.log(`✨ Auto-constructed Supabase URL for host: db.${projectId}.supabase.co`);
  } catch (e) {
    console.warn('⚠️  Auto-construction of Supabase URL failed:', e.message);
  }
}

if (dbUrl) {
  console.log('🔗 Database: Using PostgreSQL (Production Mode)');
  sequelize = new Sequelize(dbUrl, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  });
} else {
  const sqlitePath = path.join(__dirname, '../../database.sqlite');
  console.log(`📂 Database: Using SQLite (${sqlitePath})`);
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: sqlitePath,
    logging: false
  });
}

const connectPromise = sequelize.authenticate()
  .then(() => {
    console.log('✅ SQL Database connected');
    return sequelize;
  })
  .catch(err => {
    console.error('❌ SQL Database connection error:', err.message);
    throw err;
  });

// Supabase (only for storage)
let supabase = null;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('🔗 Supabase (Storage) client initialized');
  } catch (e) {
    console.warn('⚠️  Supabase client init failed:', e.message);
  }
}

module.exports = { sequelize, supabase, connectPromise };
