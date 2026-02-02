const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
console.log('Using DB:', dbPath);
const db = new Database(dbPath);

const users = db.prepare('SELECT username, branch FROM users').all();
console.log('Users found:', users.length);
users.forEach(u => console.log(`- ${u.username} (${u.branch})`));

db.close();
