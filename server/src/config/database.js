const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, '../../database.sqlite');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
function initializeDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      role TEXT NOT NULL CHECK (role IN ('admin', 'supervisor', 'staff')),
      branch TEXT NOT NULL DEFAULT 'betfalme',
      avatar TEXT,
      transport_allowance REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: Add transport_allowance to users if it doesn't exist
  try {
    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    const columnExists = tableInfo.some(col => col.name === 'transport_allowance');
    if (!columnExists) {
      db.exec("ALTER TABLE users ADD COLUMN transport_allowance REAL DEFAULT 0");
      console.log('✅ Migration: transport_allowance column added to users table');
    }

    const branchExists = tableInfo.some(col => col.name === 'branch');
    if (!branchExists) {
      db.exec("ALTER TABLE users ADD COLUMN branch TEXT NOT NULL DEFAULT 'betfalme'");
      console.log('✅ Migration: branch column added to users table');
    }
  } catch (error) {
    console.error('Migration error:', error);
  }

  // Payroll Records table
  db.exec(`
    CREATE TABLE IF NOT EXISTS payroll_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      total_transport REAL NOT NULL,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
      paid_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Attendance table
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      clock_in TEXT NOT NULL,
      clock_out TEXT,
      location TEXT,
      latitude REAL,
      longitude REAL,
      status TEXT DEFAULT 'present',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Schedules table
  db.exec(`
    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      shift_type TEXT,
      notes TEXT,
      created_by INTEGER,
      branch TEXT NOT NULL DEFAULT 'betfalme',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id),
      UNIQUE(user_id, date, start_time)
    )
  `);

  // Migration: Add branch to schedules if it doesn't exist
  try {
    const scheduleInfo = db.prepare("PRAGMA table_info(schedules)").all();
    if (!scheduleInfo.some(col => col.name === 'branch')) {
      db.exec("ALTER TABLE schedules ADD COLUMN branch TEXT NOT NULL DEFAULT 'betfalme'");
      console.log('✅ Migration: branch column added to schedules table');
    }
  } catch (err) {
    console.error('Schedule migration error:', err);
  }

  // Leave requests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS account_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number TEXT NOT NULL,
      branch TEXT NOT NULL CHECK (branch IN ('betfalme', 'sofa_safi')),
      status TEXT DEFAULT 'open' CHECK (status IN ('open', 'pending', 'closed')),
      request_count INTEGER DEFAULT 1,
      last_request_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(phone_number, branch)
    )
  `);

  // Chat Channels table
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'public' CHECK (type IN ('public', 'private', 'dm')),
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Chat Messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      file_url TEXT,
      file_name TEXT,
      file_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (channel_id) REFERENCES chat_channels(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Message Reactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS message_reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      emoji TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(message_id, user_id, emoji)
    )
  `);

  // Migration for existing chat_messages
  try {
    const tableInfo = db.prepare("PRAGMA table_info(chat_messages)").all();
    if (!tableInfo.some(col => col.name === 'file_url')) {
      db.exec("ALTER TABLE chat_messages ADD COLUMN file_url TEXT");
      db.exec("ALTER TABLE chat_messages ADD COLUMN file_name TEXT");
      db.exec("ALTER TABLE chat_messages ADD COLUMN file_type TEXT");
      console.log('✅ Migration: File columns added to chat_messages');
    }
  } catch (err) {
    console.error('Chat migration error:', err);
  }

  // Channel Members table
  db.exec(`
    CREATE TABLE IF NOT EXISTS channel_members (
      channel_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (channel_id, user_id),
      FOREIGN KEY (channel_id) REFERENCES chat_channels(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Seed default #general channel
  const generalExists = db.prepare('SELECT id FROM chat_channels WHERE name = ?').get('general');
  if (!generalExists) {
    db.prepare("INSERT INTO chat_channels (name, description, type) VALUES (?, ?, ?)").run('general', 'Company-wide announcements and chatter', 'public');
    console.log('✅ Default #general chat channel created');
  }

  console.log('✅ Database tables created successfully');

  // Create default admin user if not exists
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');

  if (!adminExists) {
    const passwordHash = bcrypt.hashSync('falmebet123', 10);
    db.prepare(`
      INSERT INTO users (username, password_hash, name, role, avatar)
      VALUES (?, ?, ?, ?, ?)
    `).run('admin', passwordHash, 'Administrator', 'admin', 'https://ui-avatars.com/api/?name=Admin&background=10B981&color=fff');

    console.log('✅ Default admin user created (username: admin, password: falmebet123)');
  }

  // Create default supervisor user if not exists
  const supervisorExists = db.prepare('SELECT id FROM users WHERE username = ?').get('supervisor');

  if (!supervisorExists) {
    const passwordHash = bcrypt.hashSync('falmebet123', 10);
    db.prepare(`
      INSERT INTO users (username, password_hash, name, role, avatar)
      VALUES (?, ?, ?, ?, ?)
    `).run('supervisor', passwordHash, 'Test Supervisor', 'supervisor', 'https://ui-avatars.com/api/?name=Supervisor&background=3B82F6&color=fff');

    console.log('✅ Default supervisor user created (username: supervisor, password: falmebet123)');
  }

  // Seed additional staff members
  const staffList = [
    { name: 'Nickson', username: 'nickson' },
    { name: 'Joyce', username: 'joyce' },
    { name: 'Victor', username: 'victor' },
    { name: 'Sylvia', username: 'sylvia' },
    { name: 'Chris', username: 'chris' },
    { name: 'Pauline', username: 'pauline' },
    { name: 'Linda', username: 'linda' },
    { name: 'Terry', username: 'terry' },
    { name: 'Faye', username: 'faye' },
    { name: 'Staff Member', username: 'staff' },
  ];

  const defaultPasswordHash = bcrypt.hashSync('falmebet123', 10);

  staffList.forEach(staff => {
    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(staff.username);
    if (!exists) {
      db.prepare(`
        INSERT INTO users (username, password_hash, name, role, avatar)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        staff.username,
        defaultPasswordHash,
        staff.name,
        'staff',
        `https://ui-avatars.com/api/?name=${staff.name}&background=random`
      );
      console.log(`✅ Staff user created: ${staff.name}`);
    }
  });

  // Seed Sofa/Safi staff
  const sofaStaffList = [
    { name: 'Mary', username: 'mary' },
    { name: 'Shillah', username: 'shillah' },
    { name: 'Ian Kibet', username: 'ian_kibet' },
    { name: 'Ian Ronoh', username: 'ian_ronoh' },
    { name: 'Fabrice', username: 'fabrice' },
    { name: 'Jonathan', username: 'jonathan' },
    { name: 'Collins', username: 'collins' },
    { name: 'Joan', username: 'joan' },
    { name: 'Kelvin', username: 'kelvin' },
  ];

  sofaStaffList.forEach(staff => {
    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(staff.username);
    if (!exists) {
      db.prepare(`
        INSERT INTO users (username, password_hash, name, role, branch, avatar)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        staff.username,
        defaultPasswordHash,
        staff.name,
        'staff',
        'sofa_safi',
        `https://ui-avatars.com/api/?name=${staff.name}&background=random`
      );
      console.log(`✅ Sofa/Safi staff user created: ${staff.name}`);
    }
  });
}

initializeDatabase();

module.exports = db;
