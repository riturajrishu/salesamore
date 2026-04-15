import initSqlJs from 'sql.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'neuraldocs.db');

// Initialize sql.js
const SQL = await initSqlJs();

// Load existing database or create new one
let dbData;
try {
  dbData = fs.readFileSync(DB_PATH);
} catch {
  dbData = null;
}

const db = dbData ? new SQL.Database(dbData) : new SQL.Database();

// ──────────────────────────────────────────────
// Schema
// ──────────────────────────────────────────────
db.run(`
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    originalName TEXT NOT NULL,
    type TEXT NOT NULL,
    size INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing',
    chunkCount INTEGER DEFAULT 0,
    errorMessage TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS chunks (
    id TEXT PRIMARY KEY,
    documentId TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding TEXT,
    chunkIndex INTEGER NOT NULL,
    metadata TEXT DEFAULT '{}',
    FOREIGN KEY (documentId) REFERENCES documents(id) ON DELETE CASCADE
  );
`);

db.run(`CREATE INDEX IF NOT EXISTS idx_chunks_document ON chunks(documentId);`);

db.run(`
  CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'New Chat',
    documentIds TEXT DEFAULT '[]',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    sessionId TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    sources TEXT DEFAULT '[]',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (sessionId) REFERENCES chat_sessions(id) ON DELETE CASCADE
  );
`);

db.run(`CREATE INDEX IF NOT EXISTS idx_messages_session ON chat_messages(sessionId);`);

db.run(`
  CREATE TABLE IF NOT EXISTS query_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sessionId TEXT,
    query TEXT NOT NULL,
    responseTime INTEGER,
    chunkCount INTEGER,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

db.run(`PRAGMA foreign_keys = ON;`);

/**
 * Save the in-memory database to disk.
 * Call after any write operation.
 */
export function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Auto-save every 5 seconds if there are changes
let saveTimer = null;
export function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveDb();
    saveTimer = null;
  }, 2000);
}

// ──────────────────────────────────────────────
// Helper wrappers to mimic better-sqlite3 API
// ──────────────────────────────────────────────

/**
 * Wraps sql.js to provide a simpler API similar to better-sqlite3.
 */
const dbWrapper = {
  /**
   * Prepare and run a statement. Returns { changes, lastInsertRowid }
   */
  run(sql, ...params) {
    db.run(sql, params);
    scheduleSave();
    return {
      changes: db.getRowsModified(),
    };
  },

  /**
   * Get a single row. Returns object or undefined.
   */
  get(sql, ...params) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
      const cols = stmt.getColumnNames();
      const vals = stmt.get();
      stmt.free();
      const row = {};
      cols.forEach((col, i) => {
        row[col] = vals[i];
      });
      return row;
    }
    stmt.free();
    return undefined;
  },

  /**
   * Get all matching rows. Returns array of objects.
   */
  all(sql, ...params) {
    const results = [];
    const stmt = db.prepare(sql);
    stmt.bind(params);
    while (stmt.step()) {
      const cols = stmt.getColumnNames();
      const vals = stmt.get();
      const row = {};
      cols.forEach((col, i) => {
        row[col] = vals[i];
      });
      results.push(row);
    }
    stmt.free();
    return results;
  },

  /**
   * Execute raw SQL (no params, no results).
   */
  exec(sql) {
    db.exec(sql);
    scheduleSave();
  },

  /**
   * Save database to disk immediately.
   */
  save() {
    saveDb();
  },
};

// Save on exit
process.on('exit', () => saveDb());
process.on('SIGINT', () => { saveDb(); process.exit(); });
process.on('SIGTERM', () => { saveDb(); process.exit(); });

console.log('✅ Database initialized (sql.js)');

export default dbWrapper;
