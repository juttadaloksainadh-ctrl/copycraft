import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Trash2, Sparkles, FolderOpen, Smartphone, AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../utils/api';

// Comprehensive MIME types + extensions ensuring mobile Android/iOS file pickers allow document selection
const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  '.pdf',
  'application/msword',
  '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.docx',
  'application/vnd.ms-powerpoint',
  '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.pptx',
  'image/jpeg',
  '.jpg',
  '.jpeg',
  'image/png',
  '.png',
  'image/webp',
  '.webp'
].join(',');

export default function FileUploader({ onFilesUpdated, files = [] }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const { addToast } = useToast();

  const handleFileDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer ? e.dataTransfer.files : []);
    if (!droppedFiles.length) return;
    await processUpload(droppedFiles);
  };

  const handleFileInputChange = async (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    // Reset file input value so user can upload more files or re-select the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (!selectedFiles.length) return;
    await processUpload(selectedFiles);
  };

  const triggerFileInput = (e) => {
    if (e) {
      e.stopPropagation();
    }
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const processUpload = async (uploadedFiles) => {
    // Validate file sizes
    const oversizedFiles = uploadedFiles.filter(f => f.size > 50 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      addToast(`File "${oversizedFiles[0].name}" exceeds 50MB limit`, 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);

    const formData = new FormData();
    uploadedFiles.forEach(file => formData.append('files', file));

    try {
      const progressTimer = setInterval(() => {
        setUploadProgress(p => (p < 85 ? p + 15 : p));
      }, 300);

      const res = await apiFetch('/orders/upload', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressTimer);
      setUploadProgress(100);

      if (res.success && res.files) {
        onFilesUpdated([...files, ...res.files]);
        addToast(`${res.files.length} document(s) uploaded and analyzed successfully!`, 'success');
      } else {
        addToast(res.message || 'Error processing file upload. Please check your document format.', 'error');
      }
    } catch (err) {
      addToast('Upload failed. Please check your internet connection and try again.', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const removeFile = (id) => {
    onFilesUpdated(files.filter(f => f.id !== id));
    addToast('File removed', 'info');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Hidden File Input with ref */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILE_TYPES}
        onChange={handleFileInputChange}
        style={{
          position: 'absolute',
          opacity: 0,
          width: '1px',
          height: '1px',
          pointerEvents: 'none'
        }}
        id="file-input-element"
      />

      {/* Drag & Drop Zone / Touch Upload Area */}
      <div
        onClick={triggerFileInput}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
        style={{
          border: `2px dashed ${isDragging ? 'var(--primary)' : 'var(--border-color)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '2rem 1.25rem',
          textAlign: 'center',
          background: isDragging ? 'var(--primary-light)' : 'var(--bg-surface)',
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
          position: 'relative'
        }}
      >
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--primary-light)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '0.85rem'
        }}>
          <UploadCloud size={28} color="var(--primary)" />
        </div>

        <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.35rem' }}>
          Select or Drag & Drop Documents
        </h4>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 1.25rem auto', lineHeight: 1.4 }}>
          Supports PDF, Word (DOCX), PPTX, and High-Res Images up to 50MB
        </p>

        {/* Primary Action Button (Optimized for both mobile touch and mouse click) */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={triggerFileInput}
            style={{
              padding: '0.65rem 1.4rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              gap: '0.5rem',
              boxShadow: '0 4px 14px var(--primary-glow)'
            }}
          >
            <FolderOpen size={18} />
            <span>Choose Files from Device</span>
          </button>
        </div>

        {/* Format Badges */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
          {['PDF', 'DOCX', 'PPTX', 'JPG', 'PNG'].map(fmt => (
            <span key={fmt} className="badge badge-primary" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>
              {fmt}
            </span>
          ))}
        </div>
      </div>

      {/* Uploading Status Progress Card */}
      {isUploading && (
        <div className="card animate-fade-in" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <RefreshCw size={18} className="animate-spin" color="var(--primary)" />
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Uploading & Scanning Document Pages...</div>
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>{uploadProgress}%</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'var(--border-color)', borderRadius: '999px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${uploadProgress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%)',
                transition: 'width 0.3s ease-in-out'
              }}
            />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            CopyCraft AI scanner is calculating page counts, color breakdown, and duplex savings.
          </div>
        </div>
      )}

      {/* Uploaded Documents List */}
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              UPLOADED DOCUMENTS ({files.length})
            </h4>
            <button
              type="button"
              onClick={triggerFileInput}
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--primary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              + Add More Files
            </button>
          </div>

          {files.map((file) => (
            <div
              key={file.id}
              className="card card-hover"
              style={{
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--primary-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <FileText size={18} color="var(--primary)" />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    color: 'var(--text-main)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {file.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginTop: '2px' }}>
                    <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    <span>•</span>
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{file.pageCount} Pages</span>
                    {file.ai && (
                      <span className="badge badge-accent" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                        <Sparkles size={10} /> AI Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  className="btn btn-sm btn-secondary"
                  title="Remove file"
                  style={{
                    padding: '0.45rem',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--danger)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '36px',
                    minHeight: '36px'
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

