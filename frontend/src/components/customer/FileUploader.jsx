import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Trash2, Sparkles, FolderOpen, Smartphone, AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import {
  apiFetch,
  getPresignedUploadUrls,
  uploadToR2,
  verifyDirectUpload,
  uploadFilesMultipart
} from '../../utils/api';

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
  const [uploadStatusText, setUploadStatusText] = useState('');
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
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    // Prevent duplicate concurrent upload triggers
    if (isUploading) {
      addToast('An upload is already in progress. Please wait.', 'warning');
      return;
    }

    if (uploadedFiles.length > 10) {
      addToast('Maximum 10 files allowed per upload batch', 'error');
      return;
    }

    // Validate file sizes and empty files before starting network requests
    for (const file of uploadedFiles) {
      if (!file.name) {
        addToast('Invalid file: missing filename', 'error');
        return;
      }
      if (file.size <= 0) {
        addToast(`File "${file.name}" is empty (0 bytes).`, 'error');
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        addToast(`File "${file.name}" exceeds the maximum 50MB limit.`, 'error');
        return;
      }
    }

    setIsUploading(true);
    setUploadProgress(10);
    setUploadStatusText('Requesting secure cloud storage authorization...');

    try {
      // Step 1: Request presigned PUT URLs from authenticated backend
      const presignRes = await getPresignedUploadUrls(uploadedFiles);

      if (!presignRes.success) {
        // Handle unauthenticated or backend error
        if (presignRes.message?.includes('token') || presignRes.message?.includes('Access denied')) {
          addToast('Please log in to upload documents.', 'warning');
        } else {
          addToast(presignRes.message || 'Failed to authorize file upload.', 'error');
        }
        return;
      }

      // Safe Deliberate Fallback: If backend explicitly reports direct upload is not supported
      // (e.g. Cloudflare R2 is unconfigured in development/memory mode)
      if (presignRes.directUploadSupported === false) {
        console.warn('Direct R2 upload not configured on backend; using deliberate multipart fallback.');
        setUploadStatusText('Uploading via server storage...');
        setUploadProgress(30);

        const progressTimer = setInterval(() => {
          setUploadProgress(p => (p < 85 ? p + 15 : p));
        }, 300);

        const fallbackRes = await uploadFilesMultipart(uploadedFiles);
        clearInterval(progressTimer);
        setUploadProgress(100);

        if (fallbackRes.success && Array.isArray(fallbackRes.files)) {
          onFilesUpdated([...files, ...fallbackRes.files]);
          addToast(`${fallbackRes.files.length} document(s) uploaded successfully!`, 'success');
        } else {
          addToast(fallbackRes.message || 'Error processing file upload.', 'error');
        }
        return;
      }

      const presignedList = presignRes.files;
      if (!Array.isArray(presignedList) || presignedList.length !== uploadedFiles.length) {
        addToast('Invalid upload descriptors received from server.', 'error');
        return;
      }

      // Step 2: Upload each file directly to Cloudflare R2
      const totalFiles = uploadedFiles.length;
      const fileProgresses = new Array(totalFiles).fill(0);

      const updateAggregateProgress = () => {
        const sum = fileProgresses.reduce((a, b) => a + b, 0);
        const avg = sum / totalFiles;
        // Progress scale: 15% (after presign) to 80% (all files uploaded to R2)
        const mapped = Math.round(15 + (avg * 0.65));
        setUploadProgress(mapped);
      };

      setUploadStatusText(`Uploading ${totalFiles} document(s) directly to Cloudflare R2...`);

      // Upload all files directly to Cloudflare R2 in parallel
      await Promise.all(
        uploadedFiles.map(async (file, idx) => {
          const presignedInfo = presignedList[idx];
          await uploadToR2(
            presignedInfo.uploadUrl,
            file,
            presignedInfo.headers,
            (percent) => {
              fileProgresses[idx] = percent;
              updateAggregateProgress();
            }
          );
        })
      );

      // Step 3: Backend verification
      setUploadProgress(85);
      setUploadStatusText('Verifying files and calculating exact page counts with AI...');

      const verifyDescriptors = presignedList.map(item => ({
        fileId: item.fileId,
        fileName: item.fileName,
        r2Key: item.r2Key,
        uploadToken: item.uploadToken,
        mimeType: item.mimeType
      }));

      const verifyRes = await verifyDirectUpload(verifyDescriptors);

      if (verifyRes.success && Array.isArray(verifyRes.files)) {
        setUploadProgress(100);
        setUploadStatusText('Upload and verification complete!');
        onFilesUpdated([...files, ...verifyRes.files]);
        addToast(
          `${verifyRes.files.length} document(s) uploaded directly to R2 and verified!`,
          'success'
        );
      } else {
        addToast(verifyRes.message || 'Server verification failed for uploaded files.', 'error');
      }
    } catch (err) {
      console.error('Upload flow error:', err);
      // Detailed error reporting for network or CORS issues
      const isNetworkError = err.message?.toLowerCase().includes('network') || err.message?.toLowerCase().includes('cors');
      const errorMsg = isNetworkError
        ? 'Direct upload connection error. Check your internet connection or Cloudflare R2 CORS settings.'
        : (err.message || 'Upload failed. Please check network connectivity and try again.');
      addToast(errorMsg, 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatusText('');
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
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                {uploadStatusText || 'Uploading & Scanning Document Pages...'}
              </div>
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
            Direct-to-cloud secure transfer • Server-verified page count & AI analysis
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

