const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

console.log('Checking admin user...\n');

const admin = db.prepare('SELECT username, password_hash, name, role FROM users WHERE username = ?').get('admin');

if (admin) {
    console.log('✅ Admin user found:');
    console.log('   Username:', admin.username);
    console.log('   Name:', admin.name);
    console.log('   Role:', admin.role);
    console.log('   Password hash exists:', !!admin.password_hash);

    // Test password
    const testPassword = 'falmebet123';
    const isValid = bcrypt.compareSync(testPassword, admin.password_hash);
    console.log(`\n   Testing password "${testPassword}":`, isValid ? '✅ VALID' : '❌ INVALID');
} else {
    console.log('❌ Admin user NOT found in database');
}

// List all usernames
console.log('\n\nAll users in database:');
const allUsers = db.prepare('SELECT username, name, role FROM users ORDER BY role, username').all();
allUsers.forEach(u => {
    console.log(`  - ${u.username.padEnd(15)} (${u.role.padEnd(10)}) ${u.name}`);
});

db.close();
