import { Router } from 'express';
import {
  createSession,
  getSessions,
  getSession,
  addMessage,
  updateSessionTitle,
  deleteSession,
  logQuery,
} from '../services/chatHistory.js';
import { retrieveContext, buildPromptContext } from '../services/retrieval.js';
import { streamResponse, generateTitle } from '../services/llm.js';

const router = Router();

// GET /api/chat/sessions — List all sessions
router.get('/sessions', (req, res) => {
  res.json(getSessions());
});

// POST /api/chat/sessions — Create new session
router.post('/sessions', (req, res) => {
  const { title, documentIds } = req.body;
  const session = createSession(title, documentIds);
  res.status(201).json(session);
});

// GET /api/chat/sessions/:id — Get session with messages
router.get('/sessions/:id', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
});

// DELETE /api/chat/sessions/:id — Delete session
router.delete('/sessions/:id', (req, res) => {
  deleteSession(req.params.id);
  res.json({ success: true });
});

// POST /api/chat/sessions/:id/messages — Send message (SSE streaming response)
router.post('/sessions/:id/messages', async (req, res) => {
  const sessionId = req.params.id;

  try {
    const { message, documentIds } = req.body;

    const session = getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Save user message
    addMessage(sessionId, 'user', message);

    // Retrieve relevant context from the vector store
    const retrieval = await retrieveContext(message, {
      topK: 5,
      documentIds: documentIds?.length > 0 ? documentIds : null,
    });

    const context = buildPromptContext(retrieval.chunks);

    // Build source citation objects
    const sources = retrieval.chunks.map((chunk, i) => ({
      index: i + 1,
      documentId: chunk.documentId,
      documentName: chunk.documentName,
      content: chunk.content.slice(0, 300),
      similarity: chunk.similarity,
    }));

    // ── Set up Server-Sent Events ──
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    // Send sources first so UI can render citation cards immediately
    res.write(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`);

    // Stream LLM response
    const chatHistory = session.messages || [];
    let fullResponse = '';

    for await (const chunk of streamResponse(message, context, chatHistory)) {
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
    }

    // Save the complete assistant message
    addMessage(sessionId, 'assistant', fullResponse, sources);

    // Log query for analytics
    logQuery(sessionId, message, retrieval.responseTime, retrieval.filtered);

    // Auto-generate a title for brand new sessions
    if (session.messages.length === 0) {
      const title = await generateTitle(message);
      updateSessionTitle(sessionId, title);
      res.write(`data: ${JSON.stringify({ type: 'title', title })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Chat error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(
        `data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`
      );
      res.end();
    }
  }
});

export default router;
