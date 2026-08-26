import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Image as ImageIcon, CheckCircle, Trash2, Eye } from 'lucide-react';

export const FileUploadZone = ({
  label,
  required = false,
  accept = "image/*,application/pdf",
  value = null, // { name, size, type, dataUrl }
  onChange,
  helperText,
  icon: IconComponent = UploadCloud
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const fileData = {
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        type: file.type,
        dataUrl: e.target.result,
      };
      onChange(fileData);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isImage = value && value.type && value.type.startsWith('image/');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
        </label>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />

      {value ? (
        /* Selected File Card */
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
            padding: '12px 16px',
            background: '#f8fafc',
            border: '1.5px solid #cbd5e1',
            borderRadius: '10px',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
            {isImage && value.dataUrl ? (
              <img
                src={value.dataUrl}
                alt="Preview"
                style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
            ) : (
              <div style={{ padding: '10px', background: '#eff6ff', borderRadius: '8px', color: '#2563eb', display: 'flex', alignItems: 'center' }}>
                <FileText size={22} />
              </div>
            )}

            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                {value.name}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span>{value.size}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#16a34a', fontWeight: '600' }}>
                  <CheckCircle size={11} /> Uploaded
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {value.dataUrl && (
              <a
                href={value.dataUrl}
                target="_blank"
                rel="noreferrer"
                style={{ padding: '6px', color: '#475569', borderRadius: '6px', background: '#ffffff', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center' }}
                title="Preview Document"
              >
                <Eye size={15} />
              </a>
            )}
            <button
              type="button"
              onClick={handleRemove}
              style={{
                padding: '6px',
                color: '#dc2626',
                borderRadius: '6px',
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.15s ease'
              }}
              title="Remove File"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ) : (
        /* Dropzone Card */
        <div
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          style={{
            border: isDragging ? '2px dashed #2563eb' : '2px dashed #cbd5e1',
            borderRadius: '10px',
            padding: '20px 16px',
            background: isDragging ? '#eff6ff' : '#fafafa',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justify: 'center',
            gap: '8px',
          }}
        >
          <div style={{ background: '#f1f5f9', padding: '10px', borderRadius: '50%', color: '#64748b' }}>
            <IconComponent size={24} />
          </div>
          <div>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#2563eb' }}>Click to upload</span>
            <span style={{ fontSize: '13px', color: '#64748b' }}> or drag and drop</span>
          </div>
          {helperText && (
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>{helperText}</p>
          )}
        </div>
      )}
    </div>
  );
};
