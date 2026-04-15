import { v4 as uuid } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import db from '../database/db.js';
import { parseDocument } from './parsers.js';
import { chunkText } from './chunker.js';
import { generateEmbeddings } from './embeddings.js';
import { storeChunks } from './vectorStore.js';

const UPLOAD_DIR = path.join(process.cwd(), 'server', 'data', 'uploads');

// Ensure upload directory exists
try {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
} catch {
  // directory already exists
}

/**
 * Process an uploaded document through the full RAG ingestion pipeline:
 * 1. Save file to disk
 * 2. Extract text (PDF/DOCX/TXT/MD)
 * 3. Chunk text with overlap
 * 4. Generate embeddings via Gemini
 * 5. Store vectors in SQLite
 */
export async function processDocument(file) {
  const docId = uuid();
  const ext = path.extname(file.originalname).toLowerCase();
  const storedName = `${docId}${ext}`;
  const filePath = path.join(UPLOAD_DIR, storedName);

  // Save file to disk
  await fs.writeFile(filePath, file.buffer);

  // Create document record with 'processing' status
  db.run(
    `INSERT INTO documents (id, name, originalName, type, size, status) VALUES (?, ?, ?, ?, ?, 'processing')`,
    docId, storedName, file.originalname, ext.slice(1), file.size
  );

  // Process asynchronously (don't block the upload response)
  processAsync(docId, filePath).catch((err) => {
    console.error(`❌ Failed to process document ${docId}:`, err);
    db.run(
      `UPDATE documents SET status = 'error', errorMessage = ?, updatedAt = datetime('now') WHERE id = ?`,
      err.message, docId
    );
  });

  return {
    id: docId,
    name: file.originalname,
    type: ext.slice(1),
    size: file.size,
    status: 'processing',
  };
}

async function processAsync(docId, filePath) {
  try {
    // Step 1: Parse document
    console.log(`[${docId.slice(0, 8)}] 📄 Parsing document...`);
    const { text, metadata } = await parseDocument(filePath);

    if (!text || text.trim().length === 0) {
      throw new Error('No text content could be extracted from this document');
    }

    console.log(`[${docId.slice(0, 8)}] 📝 Extracted ${text.length} characters`);

    // Step 2: Chunk text
    console.log(`[${docId.slice(0, 8)}] ✂️  Chunking text...`);
    const chunks = chunkText(text);

    if (chunks.length === 0) {
      throw new Error('Document produced no usable text chunks');
    }

    console.log(`[${docId.slice(0, 8)}] 📦 Created ${chunks.length} chunks`);

    // Step 3: Generate embeddings
    console.log(`[${docId.slice(0, 8)}] 🧠 Generating embeddings...`);
    const embeddings = await generateEmbeddings(chunks.map((c) => c.content));

    // Step 4: Store in vector store
    console.log(`[${docId.slice(0, 8)}] 💾 Storing vectors...`);
    storeChunks(docId, chunks, embeddings);

    // Step 5: Update document status to ready
    db.run(
      `UPDATE documents SET status = 'ready', chunkCount = ?, updatedAt = datetime('now') WHERE id = ?`,
      chunks.length, docId
    );

    console.log(
      `[${docId.slice(0, 8)}] ✅ Document processed successfully (${chunks.length} chunks)`
    );
  } catch (err) {
    db.run(
      `UPDATE documents SET status = 'error', errorMessage = ?, updatedAt = datetime('now') WHERE id = ?`,
      err.message, docId
    );
    throw err;
  }
}

/** Get document processing status */
export function getDocumentStatus(docId) {
  return db.get(
    'SELECT id, name, originalName, type, size, status, chunkCount, errorMessage, createdAt, updatedAt FROM documents WHERE id = ?',
    docId
  );
}
