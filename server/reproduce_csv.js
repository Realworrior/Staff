const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Mock CSV Content
const csvContent = `Date,Staff 1,Staff 2
2025-03-01,AM,PM
2025-03-02,OFF,NT`;

async function test() {
    try {
        console.log('Attempts to connect to API at http://localhost:3001...');

        // 1. Login
        console.log('Logging in as admin...');
        const loginRes = await axios.post('http://localhost:3001/api/auth/login', {
            username: 'admin',
            password: 'falmebet123'
        });
        const token = loginRes.data.token;
        console.log('✅ Login successful.');

        // 2. Upload CSV content as file
        console.log('Uploading CSV content...');
        const form = new FormData();
        form.append('file', Buffer.from(csvContent), { filename: 'test.csv', contentType: 'text/csv' });
        form.append('branch', 'betfalme');

        const headers = {
            ...form.getHeaders(),
            'Authorization': `Bearer ${token}`
        };

        const uploadRes = await axios.post('http://localhost:3001/api/schedules/import', form, {
            headers: headers
        });

        console.log('✅ Upload successful. Response:', uploadRes.data);

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

test();
