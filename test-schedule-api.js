// Test script to check schedule API
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function testScheduleAPI() {
    try {
        // First login to get token
        console.log('1. Logging in as admin...');
        const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'falmebet123' })
        });

        const loginData = await loginResponse.json();
        console.log('Login response:', loginData);

        if (!loginData.token) {
            console.error('❌ No token received');
            return;
        }

        const token = loginData.token;
        console.log('✅ Token received');

        // Test schedule API
        console.log('\n2. Fetching schedules...');
        const scheduleResponse = await fetch('http://localhost:3001/api/schedules?branch=betfalme&start_date=2026-01-01&end_date=2026-02-28', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const schedules = await scheduleResponse.json();
        console.log(`✅ Received ${schedules.length} schedules`);
        console.log('\nFirst 3 schedules:');
        console.log(JSON.stringify(schedules.slice(0, 3), null, 2));

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testScheduleAPI();
