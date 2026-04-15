import { useState } from 'react';
import { FileText } from 'lucide-react';

export default function SourceCard({ source }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="source-card"
      onClick={() => setExpanded(!expanded)}
      title="Click to expand"
    >
      <div className="source-card-header">
        <span className="source-card-num">{source.index}</span>
        <span className="source-card-name">{source.documentName}</span>
        <span className="source-card-relevance">
          {(source.similarity * 100).toFixed(0)}%
        </span>
      </div>
      <div className={`source-card-excerpt ${expanded ? 'expanded' : ''}`}>
        {source.content}
      </div>
    </div>
  );
}
