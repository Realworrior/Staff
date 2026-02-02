const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'server/database.sqlite');
const db = new Database(dbPath);

const username = 'admin';
const password = 'falmebet123';

const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

if (!user) {
    console.log('User not found');
} else {
    const isValid = bcrypt.compareSync(password, user.password_hash);
    console.log(`User found: ${user.username}`);
    console.log(`Password valid: ${isValid}`);
    console.log(`Branch: ${user.branch}`);
}

db.close();
