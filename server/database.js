const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "swift-movers.db");

const db = new Database(dbPath);

db.pragma("journal_mode = WAL");


// =========================
// QUOTATIONS TABLE
// =========================

db.prepare(`
    CREATE TABLE IF NOT EXISTS quotations (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        name TEXT NOT NULL,

        email TEXT NOT NULL,

        phone TEXT NOT NULL,

        moving_from TEXT NOT NULL,

        moving_to TEXT NOT NULL,

        move_date TEXT NOT NULL,

        property_type TEXT NOT NULL,

        service TEXT NOT NULL,

        items TEXT,

        message TEXT,

        status TEXT DEFAULT 'new',

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP

    )
`).run();


// =========================
// CONTACT MESSAGES TABLE
// =========================

db.prepare(`
    CREATE TABLE IF NOT EXISTS messages (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        name TEXT NOT NULL,

        email TEXT NOT NULL,

        phone TEXT NOT NULL,

        subject TEXT NOT NULL,

        message TEXT NOT NULL,

        status TEXT DEFAULT 'unread',

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP

    )
`).run();


// =========================
// PRODUCTS TABLE
// =========================

db.prepare(`
    CREATE TABLE IF NOT EXISTS products (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        name TEXT NOT NULL,

        description TEXT NOT NULL,

        image TEXT,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP

    )
`).run();


// =========================
// SERVICES TABLE
// =========================

db.prepare(`
    CREATE TABLE IF NOT EXISTS services (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        name TEXT NOT NULL,

        description TEXT NOT NULL,

        image TEXT,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP

    )
`).run();


// =========================
// SITE SETTINGS TABLE
// =========================

db.prepare(`
    CREATE TABLE IF NOT EXISTS site_settings (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        setting_key TEXT NOT NULL UNIQUE,

        setting_value TEXT DEFAULT '',

        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP

    )
`).run();


// =========================
// DEFAULT SITE SETTINGS
// =========================

const defaultSettings = [
    ["business_name", "Swift Movers"],
    ["tagline", "Moving made simple."],
    ["phone", ""],
    ["email", ""],
    ["address", ""],
    ["operating_hours", ""],
    ["whatsapp", ""],
    ["facebook", ""],
    ["instagram", ""],
    ["tiktok", ""]
];

const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO site_settings (
        setting_key,
        setting_value
    )
    VALUES (?, ?)
`);

const insertDefaults = db.transaction(() => {

    for (const [key, value] of defaultSettings) {

        insertSetting.run(key, value);

    }

});

insertDefaults();


module.exports = db;