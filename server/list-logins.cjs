const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

console.log('='.repeat(60));
console.log(' SYSTEM LOGIN CREDENTIALS');
console.log('='.repeat(60));
console.log('');

// 1. List Users
const users = db.prepare('SELECT username, name, role, branch FROM users ORDER BY branch, role, username').all();

console.log(`Found ${users.length} active user accounts:`);
console.log(`Default Password: falmebet123\n`);

console.log(`${'USERNAME'.padEnd(15)} ${'ROLE'.padEnd(12)} ${'BRANCH'.padEnd(12)} ${'NAME'}`);
console.log('-'.repeat(60));

users.forEach(u => {
    console.log(`${u.username.padEnd(15)} ${u.role.padEnd(12)} ${u.branch.padEnd(12)} ${u.name}`);
});

console.log('\n');
console.log('='.repeat(60));
console.log(' ACCOUNT_LOGS TABLE (Latest 10 entries)');
console.log('='.repeat(60));

// 2. List Account Logs
try {
    const logs = db.prepare('SELECT * FROM account_logs ORDER BY last_request_at DESC LIMIT 10').all();

    if (logs.length === 0) {
        console.log('\nNo account logs found.');
    } else {
        console.log('');
        console.log(`${'PHONE'.padEnd(15)} ${'BRANCH'.padEnd(12)} ${'STATUS'.padEnd(10)} ${'LAST REQUEST'}`);
        console.log('-'.repeat(60));
        logs.forEach(l => {
            console.log(`${l.phone_number.padEnd(15)} ${l.branch.padEnd(12)} ${l.status.padEnd(10)} ${l.last_request_at}`);
        });
    }
} catch (err) {
    if (err.message.includes('no such table')) {
        console.log('\nTable "account_logs" does not exist yet.');
    } else {
        console.error('\nError reading account_logs:', err.message);
    }
}

console.log('\n' + '='.repeat(60));
db.close();
