const BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Generic fetch wrapper with error handling.
 */
async function request(endpoint, options = {}) {
  const { body, method = 'GET', headers = {} } = options;

  const config = {
    method,
    headers: {
      ...headers,
    },
  };

  if (body && !(body instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(body);
  } else if (body instanceof FormData) {
    config.body = body;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, config);

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

// ──────────────────────────────────────────────
// Documents
// ──────────────────────────────────────────────

export async function getDocuments() {
  return request('/documents');
}

export async function uploadDocument(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.error || 'Upload failed'));
        } catch {
          reject(new Error('Upload failed'));
        }
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload failed')));
    xhr.open('POST', `${BASE_URL}/documents/upload`);
    xhr.send(formData);
  });
}

export async function getDocument(id) {
  return request(`/documents/${id}`);
}

export async function getDocumentStatus(id) {
  return request(`/documents/${id}/status`);
}

export async function deleteDocument(id) {
  return request(`/documents/${id}`, { method: 'DELETE' });
}

// ──────────────────────────────────────────────
// Chat
// ──────────────────────────────────────────────

export async function getChatSessions() {
  return request('/chat/sessions');
}

export async function createChatSession(title, documentIds) {
  return request('/chat/sessions', {
    method: 'POST',
    body: { title, documentIds },
  });
}

export async function getChatSession(id) {
  return request(`/chat/sessions/${id}`);
}

export async function deleteChatSession(id) {
  return request(`/chat/sessions/${id}`, { method: 'DELETE' });
}

/**
 * Send a message and consume the SSE stream.
 * Calls onChunk for each text chunk, onSources for source citations,
 * onTitle for auto-generated titles, and onDone when complete.
 */
export async function sendChatMessage(sessionId, message, documentIds, callbacks = {}) {
  const { onChunk, onSources, onTitle, onDone, onError } = callbacks;

  const res = await fetch(`${BASE_URL}/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, documentIds }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to send message');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));

          switch (data.type) {
            case 'chunk':
              onChunk?.(data.content);
              break;
            case 'sources':
              onSources?.(data.sources);
              break;
            case 'title':
              onTitle?.(data.title);
              break;
            case 'done':
              onDone?.();
              break;
            case 'error':
              onError?.(data.error);
              break;
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
  }
}

// ──────────────────────────────────────────────
// Analytics
// ──────────────────────────────────────────────

export async function getAnalytics() {
  return request('/analytics/overview');
}
