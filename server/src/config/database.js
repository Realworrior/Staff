const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your_supabase')) {
  console.warn('⚠️  Supabase environment variables are missing! Database calls will fail.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Log connection status (Supabase doesn't have an 'open' event like SQLite)
console.log('🔗 Supabase client initialized');

module.exports = supabase;
