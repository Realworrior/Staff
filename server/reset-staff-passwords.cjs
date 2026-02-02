const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

const defaultPassword = 'falmebet123';
const saltRounds = 10;

console.log(`Resetting ALL staff passwords to '${defaultPassword}'...`);

try {
    const hash = bcrypt.hashSync(defaultPassword, saltRounds);

    // Update all users with role 'staff'
    const result = db.prepare("UPDATE users SET password_hash = ? WHERE role = 'staff'")
        .run(hash);

    console.log(`✅ updated ${result.changes} staff accounts.`);

    // Also update supervisor/admin just in case (optional, but good for consistency in dev)
    // db.prepare("UPDATE users SET password_hash = ? WHERE role IN ('admin', 'supervisor')").run(hash);

    // Verify a sample staff user
    const sample = db.prepare("SELECT username, password_hash FROM users WHERE role = 'staff' LIMIT 1").get();
    if (sample) {
        const valid = bcrypt.compareSync(defaultPassword, sample.password_hash);
        console.log(`Verification for user '${sample.username}': ${valid ? 'PASS' : 'FAIL'}`);
    } else {
        console.log('Warning: No staff users found to verify.');
    }

} catch (error) {
    console.error('Error resetting passwords:', error);
}

db.close();
