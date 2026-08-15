import React, { useState, useRef } from 'react';
import { FileText, Upload, Trash2, Download, File } from 'lucide-react';

export default function Documents({ documents, setDocuments, currentUser, userRole }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadedById', currentUser?.id || '');

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const newDoc = await res.json();
        setDocuments([newDoc, ...documents]);
      } else {
        setError('File upload nahi ho saki.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Server se connect nahi ho saka.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Is file ko delete karna hai?')) {
      try {
        const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setDocuments(documents.filter(d => d.id !== id));
        }
      } catch (err) {
        console.error('Delete error:', err);
      }
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isSuperAdmin = userRole === 'Super Admin';
  const myDocuments = isSuperAdmin ? documents : documents.filter(d => d.uploadedById === currentUser?.id);

  return (
    <div className="bx-content" style={{ overflowY: 'auto' }}>
      <div className="bx-content-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h1 className="bx-page-title">Documents</h1>
          <p style={{ color: 'var(--bx-text-muted)' }}>Documents can be opened and downloaded here.</p>
        </div>
        <div>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <button
            className="bx-btn bx-btn-primary"
            onClick={() => fileInputRef.current.click()}
            disabled={uploading}
          >
            <Upload size={16} /> {uploading ? 'Uploading...' : 'Import File'}
          </button>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {error && <div className="error-text" style={{ marginBottom: '10px' }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {myDocuments.map(doc => (
            <div
              key={doc.id}
              className="bx-doc-row"
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 16px', background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--bx-border)', borderRadius: '8px', gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <File size={20} color="var(--bx-accent-blue)" style={{ flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.originalName}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--bx-text-muted)', marginTop: '2px' }}>
                    {formatSize(doc.size)} · {doc.uploadedBy?.name || 'Unknown'} · {new Date(doc.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <a
                  href={`/api/${doc.fileName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bx-btn"
                  style={{ textDecoration: 'none' }}
                >
                  <Download size={14} /> Open
                </a>
                <button
                  className="bx-btn"
                  style={{ padding: '8px', color: 'var(--bx-accent-red)' }}
                  onClick={() => handleDelete(doc.id)}
                  title="Delete File"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {myDocuments.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--bx-text-muted)' }}>
              <FileText size={48} style={{ opacity: 0.2, marginBottom: '12px' }} />
              <div>No documents uploaded yet.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}