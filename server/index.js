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
// Initialize AI Services (Primary: Gemini, Fallbacks: Groq + HF)
// ──────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const HF_TOKEN = process.env.HF_TOKEN;

if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('your_')) {
  console.warn('⚠️ No Gemini key found. System will run on fallbacks.');
}

initEmbeddings(GEMINI_API_KEY, HF_TOKEN);
initLLM(GEMINI_API_KEY, GROQ_API_KEY);
console.log('✅ AI services initialized (Priority: Gemini | Fallback: Groq + HF)');

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
// Error Handler
// ──────────────────────────────────────────────
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
