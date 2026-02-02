const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
console.log('Using DB:', dbPath);
const db = new Database(dbPath);

try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Tables:', tables.map(t => t.name).join(', '));
} catch (e) {
    console.error('Error listing tables:', e);
}

db.close();
