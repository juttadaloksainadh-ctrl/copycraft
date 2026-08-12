import React, { useState } from 'react';
import { UploadCloud, FileText, CheckCircle, Trash2, Sparkles, AlertCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../utils/api';

export default function FileUploader({ onFilesUpdated, files = [] }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { addToast } = useToast();

  const handleFileDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer ? e.dataTransfer.files : e.target.files);
    if (!droppedFiles.length) return;

    await processUpload(droppedFiles);
  };

  const processUpload = async (uploadedFiles) => {
    setIsUploading(true);
    const formData = new FormData();
    uploadedFiles.forEach(file => formData.append('files', file));

    try {
      const res = await apiFetch('/orders/upload', {
        method: 'POST',
        body: formData
      });

      if (res.success) {
        onFilesUpdated([...files, ...res.files]);
        addToast(`${res.files.length} document(s) uploaded and parsed by AI`, 'success');
      } else {
        addToast(res.message || 'Error processing file upload', 'error');
      }
    } catch (err) {
      addToast('Upload failed', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (id) => {
    onFilesUpdated(files.filter(f => f.id !== id));
    addToast('File removed', 'info');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
        style={{
          border: `2px dashed ${isDragging ? 'var(--primary)' : 'var(--border-color)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          background: isDragging ? 'var(--primary-light)' : 'var(--bg-surface)',
          cursor: 'pointer',
          transition: 'all var(--transition-fast)'
        }}
      >
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
          onChange={handleFileDrop}
          style={{ display: 'none' }}
          id="file-input-element"
        />
        <label htmlFor="file-input-element" style={{ cursor: 'pointer' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'var(--primary-light)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem'
          }}>
            <UploadCloud size={28} color="var(--primary)" />
          </div>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.35rem' }}>
            Drag & drop your files here, or <span style={{ color: 'var(--primary)' }}>browse</span>
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Supports PDF, DOCX, PPTX, JPG, PNG up to 50MB per file
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.2rem', flexWrap: 'wrap' }}>
            {['PDF', 'DOCX', 'PPTX', 'JPG', 'PNG'].map(fmt => (
              <span key={fmt} className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                {fmt}
              </span>
            ))}
          </div>
        </label>
      </div>

      {isUploading && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
          <div className="pulse-skeleton" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Analyzing & Parsing Document Pages...</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CopyCraft AI scan quality and blank page detector running</div>
          </div>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            UPLOADED DOCUMENTS ({files.length})
          </h4>
          {files.map((file) => (
            <div key={file.id} className="card card-hover" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--primary-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FileText size={20} color="var(--primary)" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>{file.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    <span>•</span>
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{file.pageCount} Pages</span>
                    {file.ai && (
                      <span className="badge badge-accent" style={{ fontSize: '0.65rem' }}>
                        <Sparkles size={10} /> AI Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button onClick={() => removeFile(file.id)} className="btn btn-sm btn-secondary" title="Remove file">
                  <Trash2 size={16} color="var(--danger)" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
