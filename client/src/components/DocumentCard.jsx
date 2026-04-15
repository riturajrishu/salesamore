import { Trash2, Layers, Clock, Loader } from 'lucide-react';

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DocumentCard({ doc, onDelete }) {
  const isProcessing = doc.status === 'processing';

  return (
    <div className="glass-card doc-card" id={`doc-${doc.id}`}>
      <div className="doc-card-header">
        <div className={`doc-card-icon ${doc.type}`}>
          {doc.type}
        </div>
        <div className="doc-card-info">
          <div className="doc-card-name" title={doc.originalName}>
            {doc.originalName}
          </div>
          <div className="doc-card-meta">
            {formatSize(doc.size)} • {formatDate(doc.createdAt)}
          </div>
        </div>
      </div>

      <div className="doc-card-stats">
        <span className={`badge badge-${doc.status}`}>
          {isProcessing && <Loader size={10} style={{ animation: 'spin 1s linear infinite' }} />}
          {doc.status}
        </span>
        {doc.chunkCount > 0 && (
          <span className="doc-card-stat">
            <Layers size={14} />
            {doc.chunkCount} chunks
          </span>
        )}
      </div>

      {doc.errorMessage && (
        <div style={{ fontSize: '0.75rem', color: 'var(--rose)', lineHeight: 1.4 }}>
          {doc.errorMessage}
        </div>
      )}

      <div className="doc-card-footer">
        <span className="doc-card-stat" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          <Clock size={12} />
          {formatDate(doc.updatedAt)}
        </span>
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => onDelete(doc)}
          title="Delete document"
          id={`delete-doc-${doc.id}`}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
