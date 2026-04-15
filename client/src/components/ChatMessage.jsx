import ReactMarkdown from 'react-markdown';
import { Bot, User } from 'lucide-react';
import SourceCard from './SourceCard';

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const isStreaming = message.streaming;

  return (
    <div className={`message ${message.role}`}>
      <div className="message-avatar">
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>
      <div>
        <div className="message-content">
          {isUser ? (
            message.content
          ) : isStreaming && !message.content ? (
            <div className="typing-indicator">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          ) : (
            <ReactMarkdown>{message.content}</ReactMarkdown>
          )}
        </div>

        {/* Source citations below assistant messages */}
        {!isUser && message.sources?.length > 0 && (
          <div className="sources-container">
            {message.sources.map((source, i) => (
              <SourceCard key={i} source={source} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
