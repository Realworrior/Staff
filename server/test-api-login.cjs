async function testLogin() {
    try {
        const response = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'staff',
                password: 'falmebet123'
            })
        });
        const data = await response.json();
        if (response.ok) {
            console.log('Login successful:', data.user.username);
        } else {
            console.log('Login failed:', data);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testLogin();
