import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { initEmbeddings } from './services/embeddings.js';
import { initLLM } from './services/llm.js';
import documentsRouter from './routes/documents.js';
import chatRouter from './routes/chat.js';
import analyticsRouter from './routes/analytics.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// ──────────────────────────────────────────────
// Middleware
// ──────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ──────────────────────────────────────────────
// Initialize AI Services (Google Gemini — Free Tier)
// ──────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_gemini_api_key_here') {
  console.error(
    '❌ GEMINI_API_KEY is required.\n' +
    '   Get a FREE API key at: https://aistudio.google.com/apikey\n' +
    '   Then add it to server/.env'
  );
  process.exit(1);
}

initEmbeddings(GEMINI_API_KEY);
initLLM(GEMINI_API_KEY);
console.log('✅ AI services initialized (Google Gemini — Free Tier)');

// ──────────────────────────────────────────────
// API Routes
// ──────────────────────────────────────────────
app.use('/api/documents', documentsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/analytics', analyticsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ──────────────────────────────────────────────
// Error Handler & Production Frontend
// ──────────────────────────────────────────────
// Serve static files from the React frontend build
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDistPath));

// Fallback for all other routes to support React Router (SPA)
app.get('*', (req, res, next) => {
  // Don't intercept API calls that weren't found
  if (req.originalUrl.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ──────────────────────────────────────────────
// Start Server
// ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 NeuralDocs server running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});
