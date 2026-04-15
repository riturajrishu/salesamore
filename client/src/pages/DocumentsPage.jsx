import { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, FolderOpen } from 'lucide-react';
import { getDocuments, uploadDocument, deleteDocument, getDocumentStatus } from '../services/api';
import { useToast } from '../App';
import UploadZone from '../components/UploadZone';
import DocumentCard from '../components/DocumentCard';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const addToast = useToast();

  const fetchDocuments = useCallback(async () => {
    try {
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Poll for processing documents
  useEffect(() => {
    const processingDocs = documents.filter((d) => d.status === 'processing');
    if (processingDocs.length === 0) return;

    const interval = setInterval(async () => {
      let changed = false;
      for (const doc of processingDocs) {
        try {
          const status = await getDocumentStatus(doc.id);
          if (status.status !== 'processing') {
            changed = true;
            if (status.status === 'ready') {
              addToast(`"${doc.originalName}" is ready — ${status.chunkCount} chunks indexed`, 'success');
            } else if (status.status === 'error') {
              addToast(`"${doc.originalName}" failed: ${status.errorMessage}`, 'error');
            }
          }
        } catch {
          // ignore polling errors
        }
      }
      if (changed) fetchDocuments();
    }, 3000);

    return () => clearInterval(interval);
  }, [documents, fetchDocuments, addToast]);

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      await uploadDocument(file);
      addToast(`"${file.name}" uploaded — processing in background`, 'info');
      await fetchDocuments();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDocument(deleteTarget.id);
      addToast(`"${deleteTarget.originalName}" deleted`, 'success');
      setDeleteTarget(null);
      fetchDocuments();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div className="page" id="documents-page">
      <div className="page-header">
        <div>
          <h1>
            <FileText size={24} />
            Documents
          </h1>
          <p className="page-subtitle">
            Upload and manage your knowledge base — {documents.length} document{documents.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <UploadZone onUpload={handleUpload} uploading={uploading} />

      {loading ? (
        <div className="documents-grid" style={{ marginTop: 24 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 180, borderRadius: 16 }} />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 48 }}>
          <div className="empty-state-icon">
            <FolderOpen size={32} />
          </div>
          <h3>No documents yet</h3>
          <p>Upload your first document above to start building your AI-powered knowledge base</p>
        </div>
      ) : (
        <div className="documents-grid">
          {documents.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Document</h3>
            <p>
              Are you sure you want to delete "<strong>{deleteTarget.originalName}</strong>"?
              This will remove all indexed data and cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDelete} id="confirm-delete">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
