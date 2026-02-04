const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdmin() {
    console.log('Checking Supabase connection...');
    const { data, error } = await supabase
        .from('users')
        .select('username, name, role')
        .eq('username', 'admin');

    if (error) {
        console.error('Supabase Error:', error);
    } else {
        console.log('Admin Check Results:', data);
        if (data.length === 0) {
            console.warn('⚠️ WARNING: Admin user NOT found in Supabase database!');
        } else {
            console.log('✅ Admin user exists.');
        }
    }
}

checkAdmin();
