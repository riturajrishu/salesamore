import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  Plus,
  Send,
  Trash2,
  Brain,
  FileText,
  Sparkles,
} from 'lucide-react';
import {
  getChatSessions,
  createChatSession,
  getChatSession,
  deleteChatSession,
  sendChatMessage,
  getDocuments,
} from '../services/api';
import { useToast } from '../App';
import ChatMessage from '../components/ChatMessage';

export default function ChatPage() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [documents, setDocuments] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const addToast = useToast();

  // Fetch sessions on mount
  useEffect(() => {
    fetchSessions();
    fetchDocuments();
  }, []);

  const fetchSessions = async () => {
    try {
      const data = await getChatSessions();
      setSessions(data);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const fetchDocuments = async () => {
    try {
      const docs = await getDocuments();
      setDocuments(docs.filter((d) => d.status === 'ready'));
    } catch {
      // silent
    }
  };

  const loadSession = useCallback(async (id) => {
    try {
      const session = await getChatSession(id);
      setActiveSessionId(id);
      setMessages(session.messages || []);
    } catch (err) {
      addToast(err.message, 'error');
    }
  }, [addToast]);

  const handleNewChat = async () => {
    try {
      const session = await createChatSession('New Chat', []);
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      setMessages([]);
      inputRef.current?.focus();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleDeleteSession = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteChatSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSessionId === id) {
        setActiveSessionId(null);
        setMessages([]);
      }
      addToast('Chat deleted', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || streaming) return;

    let sessionId = activeSessionId;

    // Auto-create session if none active
    if (!sessionId) {
      try {
        const session = await createChatSession('New Chat', []);
        setSessions((prev) => [session, ...prev]);
        sessionId = session.id;
        setActiveSessionId(sessionId);
      } catch (err) {
        addToast(err.message, 'error');
        return;
      }
    }

    const userMessage = input.trim();
    setInput('');
    setStreaming(true);

    // Add user message to UI
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userMessage },
    ]);

    // Add placeholder for assistant response
    const assistantIndex = messages.length + 1;
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: '', sources: [], streaming: true },
    ]);

    try {
      const readyDocIds = documents.map((d) => d.id);

      await sendChatMessage(sessionId, userMessage, readyDocIds, {
        onChunk: (chunk) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === 'assistant') {
              updated[updated.length - 1] = {
                ...last,
                content: last.content + chunk,
              };
            }
            return updated;
          });
        },
        onSources: (sources) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === 'assistant') {
              updated[updated.length - 1] = { ...last, sources };
            }
            return updated;
          });
        },
        onTitle: (title) => {
          setSessions((prev) =>
            prev.map((s) => (s.id === sessionId ? { ...s, title } : s))
          );
        },
        onDone: () => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === 'assistant') {
              updated[updated.length - 1] = { ...last, streaming: false };
            }
            return updated;
          });
          setStreaming(false);
        },
        onError: (error) => {
          addToast(error, 'error');
          setStreaming(false);
        },
      });
    } catch (err) {
      addToast(err.message, 'error');
      setStreaming(false);
      // Remove the empty assistant message
      setMessages((prev) => prev.filter((_, i) => i !== prev.length - 1));
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-layout" id="chat-page">
      {/* Sessions Panel */}
      <div className="chat-sessions-panel">
        <div className="chat-sessions-header">
          <h3>Conversations</h3>
          <button className="btn btn-ghost btn-icon" onClick={handleNewChat} title="New chat" id="new-chat-btn">
            <Plus size={18} />
          </button>
        </div>

        <div className="chat-sessions-list">
          {sessions.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <p style={{ fontSize: '0.8125rem' }}>No conversations yet</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`chat-session-item ${session.id === activeSessionId ? 'active' : ''}`}
                onClick={() => loadSession(session.id)}
              >
                <MessageSquare size={14} style={{ flexShrink: 0, opacity: 0.5 }} />
                <span className="chat-session-title">{session.title}</span>
                <button
                  className="btn btn-ghost btn-icon chat-session-delete"
                  onClick={(e) => handleDeleteSession(e, session.id)}
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-main">
        {activeSessionId ? (
          <>
            <div className="chat-main-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Brain size={18} style={{ color: 'var(--accent-1)' }} />
                <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                  {sessions.find((s) => s.id === activeSessionId)?.title || 'Chat'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <FileText size={12} />
                {documents.length} document{documents.length !== 1 ? 's' : ''} indexed
              </div>
            </div>

            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="chat-empty">
                  <div className="chat-empty-icon">
                    <Sparkles size={32} />
                  </div>
                  <h3>Ask anything about your documents</h3>
                  <p>
                    Start a conversation and I'll find relevant information from your indexed documents, citing exact sources.
                  </p>
                </div>
              ) : (
                messages.map((msg, i) => <ChatMessage key={i} message={msg} />)
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
              <div className="chat-input-wrapper">
                <textarea
                  ref={inputRef}
                  className="chat-input"
                  placeholder="Ask about your documents..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  disabled={streaming}
                  id="chat-input"
                />
                <button
                  className="chat-send-btn"
                  onClick={handleSend}
                  disabled={!input.trim() || streaming}
                  title="Send message"
                  id="send-btn"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="chat-empty" style={{ flex: 1 }}>
            <div className="chat-empty-icon">
              <Brain size={36} />
            </div>
            <h3>NeuralDocs AI</h3>
            <p>
              Select a conversation or create a new one to start chatting with your documents.
            </p>
            <button className="btn btn-primary" onClick={handleNewChat} id="start-chat-btn">
              <Plus size={16} />
              New Conversation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
