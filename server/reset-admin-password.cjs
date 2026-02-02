const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

const username = 'admin';
const newPassword = 'falmebet123';
const saltRounds = 10;

console.log(`Resetting password for user: ${username}...`);

try {
    const hash = bcrypt.hashSync(newPassword, saltRounds);

    const result = db.prepare('UPDATE users SET password_hash = ? WHERE username = ?')
        .run(hash, username);

    if (result.changes > 0) {
        console.log(`✅ Password successfully updated for '${username}'`);
        console.log(`New Password: ${newPassword}`);
    } else {
        console.log(`❌ User '${username}' not found! Creating user...`);
        // Fallback: Create the user if missing
        db.prepare(`
            INSERT INTO users (username, password_hash, name, role, branch, avatar)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(username, hash, 'Administrator', 'admin', 'betfalme', 'https://ui-avatars.com/api/?name=Admin&background=10B981&color=fff');
        console.log(`✅ Admin user created with password: ${newPassword}`);
    }

    // Verify immediately
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    const valid = bcrypt.compareSync(newPassword, user.password_hash);
    console.log(`Verification check: ${valid ? 'PASS' : 'FAIL'}`);

} catch (error) {
    console.error('Error resetting password:', error);
}

db.close();
