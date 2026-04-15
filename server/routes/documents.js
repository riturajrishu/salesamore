import { Router } from 'express';
import multer from 'multer';
import db from '../database/db.js';
import { processDocument, getDocumentStatus } from '../services/ingestion.js';
import { deleteDocumentChunks } from '../services/vectorStore.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.txt', '.md'];
    const ext = '.' + file.originalname.split('.').pop().toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not supported. Allowed: ${allowed.join(', ')}`));
    }
  },
});

// GET /api/documents — List all documents
router.get('/', (req, res) => {
  const docs = db.all(
    `SELECT id, name, originalName, type, size, status, chunkCount, errorMessage, createdAt, updatedAt
     FROM documents ORDER BY createdAt DESC`
  );
  res.json(docs);
});

// POST /api/documents/upload — Upload and process a document
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    const result = await processDocument(req.file);
    res.status(201).json(result);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/documents/:id — Get document details
router.get('/:id', (req, res) => {
  const doc = getDocumentStatus(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json(doc);
});

// GET /api/documents/:id/status — Get processing status
router.get('/:id/status', (req, res) => {
  const doc = db.get(
    'SELECT id, status, chunkCount, errorMessage, updatedAt FROM documents WHERE id = ?',
    req.params.id
  );
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json(doc);
});

// DELETE /api/documents/:id — Remove document and its vectors
router.delete('/:id', (req, res) => {
  const doc = db.get('SELECT id FROM documents WHERE id = ?', req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  deleteDocumentChunks(req.params.id);
  db.run('DELETE FROM documents WHERE id = ?', req.params.id);

  res.json({ success: true });
});

export default router;
