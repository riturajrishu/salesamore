import db from '../database/db.js';
import { v4 as uuid } from 'uuid';

/**
 * Store document chunks with their embeddings into SQLite.
 * Embeddings are stored as JSON strings (sql.js compatible).
 */
export function storeChunks(documentId, chunks, embeddings) {
  for (let i = 0; i < chunks.length; i++) {
    const embeddingJson = JSON.stringify(embeddings[i]);
    db.run(
      `INSERT INTO chunks (id, documentId, content, embedding, chunkIndex, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      uuid(),
      documentId,
      chunks[i].content,
      embeddingJson,
      chunks[i].chunkIndex,
      JSON.stringify(chunks[i].metadata || {})
    );
  }
}

/**
 * Search for the most similar chunks to a query embedding.
 * Uses brute-force cosine similarity — efficient for < 100k vectors.
 */
export function searchSimilar(queryEmbedding, topK = 5, documentIds = null) {
  let sql = 'SELECT id, documentId, content, embedding, chunkIndex, metadata FROM chunks';
  const params = [];

  if (documentIds && documentIds.length > 0) {
    const placeholders = documentIds.map(() => '?').join(',');
    sql += ` WHERE documentId IN (${placeholders})`;
    params.push(...documentIds);
  }

  const rows = db.all(sql, ...params);

  // Compute cosine similarity for each chunk
  const results = rows
    .map((row) => {
      let storedEmbedding;
      try {
        storedEmbedding = JSON.parse(row.embedding);
      } catch {
        return null;
      }

      const similarity = cosineSimilarity(queryEmbedding, storedEmbedding);

      return {
        id: row.id,
        documentId: row.documentId,
        content: row.content,
        chunkIndex: row.chunkIndex,
        metadata: JSON.parse(row.metadata || '{}'),
        similarity,
      };
    })
    .filter(Boolean);

  // Sort by descending similarity, return top K
  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, topK);
}

/** Delete all chunks belonging to a document */
export function deleteDocumentChunks(documentId) {
  db.run('DELETE FROM chunks WHERE documentId = ?', documentId);
}

/** Get chunk count for a specific document */
export function getChunkCount(documentId) {
  const row = db.get('SELECT COUNT(*) as count FROM chunks WHERE documentId = ?', documentId);
  return row?.count || 0;
}

/** Get total chunk count across all documents */
export function getTotalChunkCount() {
  const row = db.get('SELECT COUNT(*) as count FROM chunks');
  return row?.count || 0;
}

// ──────────────────────────────────────────────
// Math
// ──────────────────────────────────────────────

function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}
