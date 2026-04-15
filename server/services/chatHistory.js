import db from '../database/db.js';
import { v4 as uuid } from 'uuid';

// ──────────────────────────────────────────────
// Sessions
// ──────────────────────────────────────────────

export function createSession(title = 'New Chat', documentIds = []) {
  const id = uuid();
  db.run(
    `INSERT INTO chat_sessions (id, title, documentIds) VALUES (?, ?, ?)`,
    id, title, JSON.stringify(documentIds)
  );

  return { id, title, documentIds, createdAt: new Date().toISOString(), messageCount: 0 };
}

export function getSessions() {
  const sessions = db.all(
    `SELECT s.*,
      (SELECT COUNT(*) FROM chat_messages WHERE sessionId = s.id) as messageCount
     FROM chat_sessions s
     ORDER BY s.updatedAt DESC`
  );

  return sessions.map((s) => ({
    ...s,
    documentIds: JSON.parse(s.documentIds || '[]'),
  }));
}

export function getSession(id) {
  const session = db.get('SELECT * FROM chat_sessions WHERE id = ?', id);
  if (!session) return null;

  const messages = db.all(
    'SELECT * FROM chat_messages WHERE sessionId = ? ORDER BY createdAt ASC',
    id
  );

  return {
    ...session,
    documentIds: JSON.parse(session.documentIds || '[]'),
    messages: messages.map((m) => ({
      ...m,
      sources: JSON.parse(m.sources || '[]'),
    })),
  };
}

export function deleteSession(id) {
  db.run('DELETE FROM chat_messages WHERE sessionId = ?', id);
  db.run('DELETE FROM chat_sessions WHERE id = ?', id);
}

export function updateSessionTitle(id, title) {
  db.run(
    "UPDATE chat_sessions SET title = ?, updatedAt = datetime('now') WHERE id = ?",
    title, id
  );
}

// ──────────────────────────────────────────────
// Messages
// ──────────────────────────────────────────────

export function addMessage(sessionId, role, content, sources = []) {
  const id = uuid();
  db.run(
    `INSERT INTO chat_messages (id, sessionId, role, content, sources) VALUES (?, ?, ?, ?, ?)`,
    id, sessionId, role, content, JSON.stringify(sources)
  );

  db.run(
    "UPDATE chat_sessions SET updatedAt = datetime('now') WHERE id = ?",
    sessionId
  );

  return { id, sessionId, role, content, sources, createdAt: new Date().toISOString() };
}

// ──────────────────────────────────────────────
// Analytics
// ──────────────────────────────────────────────

export function logQuery(sessionId, query, responseTime, chunkCount) {
  db.run(
    `INSERT INTO query_logs (sessionId, query, responseTime, chunkCount) VALUES (?, ?, ?, ?)`,
    sessionId, query, responseTime, chunkCount
  );
}
