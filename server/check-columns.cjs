const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
console.log('Using DB:', dbPath);
const db = new Database(dbPath);

try {
    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    console.log('Columns in users:', tableInfo.map(col => col.name).join(', '));
} catch (e) {
    console.error('Error getting table info:', e);
}

db.close();
