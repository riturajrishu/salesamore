import { Router } from 'express';
import db from '../database/db.js';
import { getTotalChunkCount } from '../services/vectorStore.js';

const router = Router();

// GET /api/analytics/overview — System-wide analytics
router.get('/overview', (req, res) => {
  const totalDocs = db.get('SELECT COUNT(*) as count FROM documents')?.count || 0;
  const readyDocs = db.get("SELECT COUNT(*) as count FROM documents WHERE status = 'ready'")?.count || 0;
  const processingDocs = db.get("SELECT COUNT(*) as count FROM documents WHERE status = 'processing'")?.count || 0;
  const errorDocs = db.get("SELECT COUNT(*) as count FROM documents WHERE status = 'error'")?.count || 0;
  const totalChunks = getTotalChunkCount();
  const totalQueries = db.get('SELECT COUNT(*) as count FROM query_logs')?.count || 0;
  const totalSessions = db.get('SELECT COUNT(*) as count FROM chat_sessions')?.count || 0;
  const avgResponseTime = db.get('SELECT AVG(responseTime) as avg FROM query_logs')?.avg || 0;

  // Document type distribution
  const typeDistribution = db.all(
    'SELECT type, COUNT(*) as count FROM documents GROUP BY type'
  );

  // Recent queries
  const recentQueries = db.all(
    `SELECT query, responseTime, chunkCount, createdAt
     FROM query_logs ORDER BY createdAt DESC LIMIT 10`
  );

  // Queries per day (last 7 days)
  const queryVolume = db.all(
    `SELECT DATE(createdAt) as date, COUNT(*) as count
     FROM query_logs
     WHERE createdAt >= datetime('now', '-7 days')
     GROUP BY DATE(createdAt)
     ORDER BY date`
  );

  res.json({
    totalDocs,
    readyDocs,
    processingDocs,
    errorDocs,
    totalChunks,
    totalQueries,
    totalSessions,
    avgResponseTime: Math.round(avgResponseTime),
    typeDistribution,
    recentQueries,
    queryVolume,
  });
});

export default router;
