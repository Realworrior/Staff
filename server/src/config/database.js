const mongoose = require('mongoose');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// MongoDB connection
const mongoUri = process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('your_mongodb')
  ? process.env.MONGODB_URI
  : process.env.MONGODB_URI || 'mongodb://localhost:27017/staff';

if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('your_mongodb')) {
  console.warn('⚠️  MONGODB_URI not set or placeholder; using fallback:', mongoUri);
}

const connectPromise = mongoose.connect(mongoUri)
  .then(() => {
    console.log('🍃 MongoDB connected');
    return mongoose;
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    if (err.message && (err.message.includes('bad auth') || err.message.includes('authentication failed'))) {
      console.error('   → Check MONGODB_URI in server/.env: correct username/password and DB user permissions in Atlas.');
      console.error('   → Or use a local MongoDB: MONGODB_URI=mongodb://localhost:27017/staff');
    }
    throw err;
  });

// Supabase (only for storage) – create only when both env vars are set
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
} else {
  console.warn('⚠️  SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY missing; file uploads disabled.');
}

module.exports = { mongoose, supabase, connectPromise };
