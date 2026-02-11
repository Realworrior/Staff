const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function test() {
    try {
        console.log('Attempts to connect to API at http://localhost:3001...');

        // 1. Login
        const loginRes = await axios.post('http://localhost:3001/api/auth/login', {
            username: 'admin',
            password: 'falmebet123'
        });
        const token = loginRes.data.token;
        console.log('✅ Login successful.');

        // 2. Upload INVALID content (random bytes)
        console.log('Uploading invalid file content...');
        const form = new FormData();
        const buffer = Buffer.from('Thinking about how to crash this server... definitely not an excel file');
        form.append('file', buffer, { filename: 'crash_test.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        form.append('branch', 'betfalme');

        const headers = {
            ...form.getHeaders(),
            'Authorization': `Bearer ${token}`
        };

        const uploadRes = await axios.post('http://localhost:3001/api/schedules/import', form, {
            headers: headers
        });

        console.log('✅ Upload successful (Unexpected). Response:', uploadRes.data);

    } catch (error) {
        console.error('❌ Error caught!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response Body:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error message:', error.message);
        }
    }
}

test();
