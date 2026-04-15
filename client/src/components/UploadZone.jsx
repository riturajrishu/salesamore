import { useRef, useState } from 'react';
import { Upload, FileUp } from 'lucide-react';

export default function UploadZone({ onUpload, uploading }) {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onUpload(files[0]);
    }
  };

  const handleClick = () => {
    if (!uploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      e.target.value = '';
    }
  };

  return (
    <div
      className={`upload-zone ${dragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      id="upload-zone"
    >
      <div className="upload-zone-content">
        <div className="upload-zone-icon">
          {uploading ? <FileUp size={24} /> : <Upload size={24} />}
        </div>

        {uploading ? (
          <>
            <h3>Processing document...</h3>
            <p>Extracting text, generating embeddings, and indexing for search</p>
          </>
        ) : (
          <>
            <h3>Drop your document here, or click to browse</h3>
            <p>Upload documents to make them searchable with AI</p>
          </>
        )}

        <div className="upload-zone-formats">
          <span className="badge badge-type">PDF</span>
          <span className="badge badge-type">DOCX</span>
          <span className="badge badge-type">TXT</span>
          <span className="badge badge-type">MD</span>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        id="file-input"
      />
    </div>
  );
}
