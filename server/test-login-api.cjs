const fetch = require('node-fetch');

async function testLogin() {
    try {
        console.log('Testing login API at http://localhost:3001/api/auth/login\n');

        const response = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'nickson',
                password: 'falmebet123'
            })
        });

        const data = await response.json();

        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(data, null, 2));

        if (response.ok) {
            console.log('\n✅ Login successful!');
            console.log('Token received:', data.token ? 'Yes' : 'No');
            console.log('User data:', data.user ? data.user.name : 'No user data');
        } else {
            console.log('\n❌ Login failed!');
            console.log('Error:', data.error || 'Unknown error');
        }
    } catch (error) {
        console.error('❌ Request failed:', error.message);
    }
}

testLogin();
