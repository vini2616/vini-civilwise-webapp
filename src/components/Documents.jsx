import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { checkPermission, canEnterData, canEditDelete } from '../utils/permissions';

const Documents = ({ currentUser }) => {
    const { documents, addDocument, deleteDocument, getDocument } = useData();
    const [selectedFile, setSelectedFile] = useState(null);
    const [documentName, setDocumentName] = useState('');
    const [previewUrl, setPreviewUrl] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const permission = checkPermission(currentUser, 'document');
    const canAdd = canEnterData(permission);

    if (permission === 'no_access') {
        return (
            <div className="documents-container flex items-center justify-center p-8">
                <div className="text-center">
                    <h2 className="text-xl text-red-600 font-bold">🚫 Access Denied</h2>
                    <p className="text-gray-500 mt-2">You do not have permission to view the Documents module.</p>
                </div>
            </div>
        );
    }

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        processFile(file);
    };

    const processFile = (file) => {
        if (file) {
            setSelectedFile(file);
            if (!documentName) {
                const nameWithoutExt = file.name.split('.').slice(0, -1).join('.');
                setDocumentName(nameWithoutExt);
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result);
            };
            reader.readAsDataURL(file);
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

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        processFile(file);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile || !previewUrl || !documentName) return;

        const res = await addDocument({
            name: documentName,
            originalName: selectedFile.name,
            type: selectedFile.type,
            size: selectedFile.size,
            file: selectedFile, // Pass the raw file
            uploadedBy: currentUser.id,
            uploadedAt: new Date().toISOString()
        });

        if (res && (res.success || res.document)) { // success check might be on res.success
            alert('Document uploaded successfully!');
            setSelectedFile(null);
            setDocumentName('');
            setPreviewUrl('');
        } else {
            console.error("Upload failed res:", res);
            alert('Upload failed: ' + (res.message || 'Unknown Error'));
        }
    };

    const handleView = async (doc) => {
        if (isDownloading) return;
        setIsDownloading(true);
        try {
            const docId = doc.id || doc._id;
            const fullDoc = await getDocument(docId);

            if (fullDoc && fullDoc.url) {
                let fileUrl = fullDoc.url;

                // Handle Base64 Data URIs (often from mobile uploads)
                if (fileUrl.startsWith('data:')) {
                    // Start 1/2: Convert Data URI to Blob
                    const response = await fetch(fileUrl);
                    const blob = await response.blob();
                    fileUrl = URL.createObjectURL(blob);
                    // End 1/2

                    const win = window.open(fileUrl, '_blank');
                    if (!win) {
                        alert('Please allow popups to view documents.');
                    }

                    // Cleanup usage of ObjectURL after some time (optional but good practice)
                    // setTimeout(() => URL.revokeObjectURL(fileUrl), 60000); 
                }
                else {
                    // Regular URL path
                    if (fileUrl.startsWith('/uploads/')) {
                        fileUrl = import.meta.env.VITE_API_URL + fileUrl;
                    }

                    // Open URL in new tab
                    if (fullDoc.type.includes('image')) {
                        const win = window.open();
                        if (win) {
                            win.document.write(`<img src="${fileUrl}" style="max-width:100%; height:auto;">`);
                            win.document.title = doc.name;
                        } else {
                            alert('Please allow popups to view documents.');
                        }
                    } else {
                        // For PDF and others, let browser handle it (native viewer/download)
                        const win = window.open(fileUrl, '_blank');
                        if (!win) {
                            alert('Please allow popups to view documents.');
                        }
                    }
                }
            } else {
                alert('Could not fetch document content.');
            }
        } catch (error) {
            console.error("View failed:", error);
            alert('Failed to open document.');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleDownload = async (doc) => {
        if (isDownloading) return;
        setIsDownloading(true);
        try {
            const docId = doc.id || doc._id;
            const fullDoc = await getDocument(docId);

            if (fullDoc && fullDoc.url) {
                let fileUrl = fullDoc.url;

                // Handle Base64 Data URIs
                if (fileUrl.startsWith('data:')) {
                    // Start: Convert Data URI to Blob for safer download
                    const response = await fetch(fileUrl);
                    const blob = await response.blob();
                    fileUrl = URL.createObjectURL(blob);
                }
                else if (fileUrl.startsWith('/uploads/')) {
                    fileUrl = import.meta.env.VITE_API_URL + fileUrl;
                }

                const link = document.createElement('a');
                link.href = fileUrl;

                // Construct filename: use doc.name + extension from originalName
                let filename = doc.name || 'document';
                if (doc.originalName && doc.originalName.includes('.')) {
                    const ext = doc.originalName.split('.').pop();
                    if (!filename.endsWith(`.${ext}`)) {
                        filename += `.${ext}`;
                    }
                }

                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                alert('Could not fetch document content. It might be deleted or corrupted.');
            }
        } catch (error) {
            console.error("Download failed:", error);
            alert('Download failed. Please try again.');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleDelete = (id) => {
        const doc = documents.find(d => d.id === id || d._id === id);
        if (doc && !canEditDelete(permission, doc.uploadedAt)) {
            alert("Restricted: You cannot delete this document (Time limit exceeded).");
            return;
        }

        if (window.confirm('Are you sure you want to delete this document?')) {
            deleteDocument(id);
        }
    };

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileIcon = (type) => {
        if (type.startsWith('image/')) return '🖼️';
        if (type.includes('pdf')) return '📕';
        if (type.includes('sheet') || type.includes('excel')) return '📊';
        if (type.includes('document') || type.includes('word')) return '📝';
        return '📄';
    };

    return (
        <div className="documents-container fade-in">
            <div className="page-header">
                <div className="header-content">
                    <h2>Documents Library</h2>
                    <p className="subtitle">Securely manage and access your project files</p>
                </div>
                {canAdd && (
                    <button
                        className="btn btn-primary btn-upload-toggle"
                        onClick={() => document.getElementById('upload-section').scrollIntoView({ behavior: 'smooth' })}
                    >
                        ➕ Upload New
                    </button>
                )}
            </div>

            {canAdd && (
                <div id="upload-section" className="upload-section card premium-card">
                    <div className="card-header-gradient">
                        <h3>📤 Upload New Document</h3>
                    </div>
                    <form onSubmit={handleUpload} className="upload-form">
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Document Name</label>
                                <div className="input-wrapper">
                                    <span className="input-icon">📝</span>
                                    <input
                                        type="text"
                                        value={documentName}
                                        onChange={(e) => setDocumentName(e.target.value)}
                                        placeholder="e.g., Site Plan v2"
                                        className="form-input with-icon"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>File Upload</label>
                                <div
                                    className={`drop-zone ${isDragging ? 'dragging' : ''} ${selectedFile ? 'has-file' : ''}`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                >
                                    <input
                                        type="file"
                                        onChange={handleFileChange}
                                        className="file-input"
                                        id="file-upload"
                                    />
                                    <label htmlFor="file-upload" className="file-label">
                                        {selectedFile ? (
                                            <div className="file-info">
                                                <span className="icon-success">✅</span>
                                                <div className="file-details">
                                                    <span className="name">{selectedFile.name}</span>
                                                    <span className="size">{formatSize(selectedFile.size)}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn-text remove-file"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setSelectedFile(null);
                                                        setPreviewUrl('');
                                                    }}
                                                >
                                                    Change
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="placeholder">
                                                <div className="upload-icon-circle">
                                                    <span className="icon">☁️</span>
                                                </div>
                                                <div className="placeholder-text">
                                                    <span className="main-text">Click to upload or drag and drop</span>
                                                    <span className="sub-text">PDF, Images, Excel, Word (max 10MB)</span>
                                                </div>
                                            </div>
                                        )}
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="form-actions">
                            <button type="submit" disabled={!selectedFile || !documentName} className="btn btn-primary btn-lg">
                                Upload Document 🚀
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="documents-grid">
                {documents.length > 0 ? (
                    documents.map(doc => {
                        const docId = doc.id || doc._id;
                        return (
                            <div key={docId} className="document-card card hover-lift">
                                <div className="doc-icon-wrapper">
                                    <div className={`doc-icon-placeholder ${doc.type.includes('pdf') ? 'pdf' : 'generic'}`}>
                                        <span className="doc-icon-large">{getFileIcon(doc.type)}</span>
                                    </div>
                                    <div className="doc-overlay">
                                        <button
                                            onClick={() => handleView(doc)}
                                            className="btn btn-light btn-sm"
                                            title="View"
                                            disabled={isDownloading}
                                        >
                                            {isDownloading ? '⏳' : '👁️ View'}
                                        </button>
                                        <button
                                            onClick={() => handleDownload(doc)}
                                            className="btn btn-light btn-sm"
                                            title="Download"
                                            disabled={isDownloading}
                                        >
                                            {isDownloading ? '⏳' : '⬇️ Download'}
                                        </button>
                                    </div>
                                </div>
                                <div className="doc-content">
                                    <div className="doc-header">
                                        <h4 className="doc-title" title={doc.name}>{doc.name}</h4>
                                        <span className="doc-ext">{doc.originalName?.split('.').pop().toUpperCase() || 'FILE'}</span>
                                    </div>
                                    <div className="doc-meta">
                                        <span className="meta-item">📅 {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                                        <span className="meta-item">💾 {formatSize(doc.size)}</span>
                                    </div>
                                </div>
                                {canEditDelete(permission, doc.uploadedAt) && (
                                    <div className="doc-footer">
                                        <button onClick={() => handleDelete(docId)} className="btn-icon-text delete">
                                            🗑️ Remove
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    })
                ) : (
                    <div className="no-docs-state">
                        <div className="empty-icon-wrapper">
                            <span className="icon">📂</span>
                        </div>
                        <h3>No Documents Yet</h3>
                        <p>Upload your first document to get started</p>
                    </div>
                )}
            </div>

            <style>{`
                .documents-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding-bottom: 40px;
                }
                
                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    margin-bottom: 32px;
                    padding-bottom: 16px;
                    border-bottom: 2px solid var(--border-color);
                }

                .header-content h2 {
                    font-size: 1.8rem;
                    color: var(--primary-color);
                    margin-bottom: 4px;
                }

                .subtitle {
                    color: var(--text-light);
                    font-size: 1rem;
                }

                .premium-card {
                    border: none;
                    box-shadow: var(--shadow-lg);
                    overflow: hidden;
                    padding: 0;
                    background: white;
                    border-radius: var(--radius-lg);
                }

                .card-header-gradient {
                    background: linear-gradient(135deg, var(--primary-color) 0%, #2563eb 100%);
                    color: white;
                    padding: 16px 24px;
                }

                .card-header-gradient h3 {
                    margin: 0;
                    font-size: 1.2rem;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .upload-form {
                    padding: 24px;
                }

                .form-grid {
                    display: grid;
                    grid-template-columns: 1fr 1.5fr;
                    gap: 32px;
                    margin-bottom: 24px;
                }

                @media (max-width: 768px) {
                    .form-grid {
                        grid-template-columns: 1fr;
                    }
                }

                .form-group label {
                    display: block;
                    font-weight: 600;
                    margin-bottom: 8px;
                    color: var(--text-color);
                }

                .input-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .input-icon {
                    position: absolute;
                    left: 12px;
                    font-size: 1.2rem;
                    pointer-events: none;
                }

                .form-input.with-icon {
                    padding-left: 44px;
                    height: 48px;
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-color);
                    width: 100%;
                    font-size: 1rem;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }

                .form-input:focus {
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 3px var(--primary-light);
                    outline: none;
                }

                .drop-zone {
                    border: 2px dashed var(--border-color);
                    border-radius: var(--radius-lg);
                    padding: 8px;
                    transition: all 0.2s;
                    background: #f8fafc;
                    position: relative;
                    min-height: 120px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .drop-zone:hover, .drop-zone.dragging {
                    border-color: var(--primary-color);
                    background: var(--primary-light);
                }

                .drop-zone.has-file {
                    border-style: solid;
                    background: #f0fdf4;
                    border-color: #86efac;
                }

                .file-input {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    top: 0;
                    left: 0;
                    opacity: 0;
                    cursor: pointer;
                    z-index: 10;
                }

                .file-label {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                }

                .placeholder {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 12px;
                    text-align: center;
                }

                .upload-icon-circle {
                    width: 48px;
                    height: 48px;
                    background: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: var(--shadow-sm);
                    font-size: 1.5rem;
                }

                .placeholder-text {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .main-text {
                    font-weight: 500;
                    color: var(--primary-color);
                }

                .sub-text {
                    font-size: 0.8rem;
                    color: var(--text-light);
                }

                .file-info {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    width: 100%;
                    padding: 0 16px;
                }

                .icon-success {
                    font-size: 1.5rem;
                }

                .file-details {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }

                .file-details .name {
                    font-weight: 600;
                    color: var(--text-color);
                }

                .file-details .size {
                    font-size: 0.8rem;
                    color: var(--text-light);
                }

                .remove-file {
                    color: #dc2626;
                    font-weight: 500;
                    z-index: 20;
                    position: relative;
                }

                .form-actions {
                    display: flex;
                    justify-content: flex-end;
                    padding-top: 16px;
                    border-top: 1px solid var(--border-color);
                }

                .btn-lg {
                    padding: 12px 32px;
                    font-size: 1.1rem;
                }

                /* Grid Layout */
                .documents-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
                    gap: 24px;
                    margin-top: 40px;
                }

                .document-card {
                    display: flex;
                    flex-direction: column;
                    padding: 0;
                    overflow: hidden;
                    transition: all 0.3s ease;
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    background: white;
                }

                .hover-lift:hover {
                    transform: translateY(-8px);
                    box-shadow: var(--shadow-lg);
                    border-color: var(--primary-light);
                }

                .doc-icon-wrapper {
                    height: 160px;
                    background: #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    overflow: hidden;
                }

                .doc-preview {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 0.3s;
                }

                .document-card:hover .doc-preview {
                    transform: scale(1.05);
                }

                .doc-icon-placeholder {
                    width: 80px;
                    height: 80px;
                    background: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: var(--shadow-sm);
                }

                .doc-icon-large {
                    font-size: 3rem;
                }

                .doc-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity 0.2s;
                }

                .document-card:hover .doc-overlay {
                    opacity: 1;
                }

                .doc-content {
                    padding: 16px;
                    flex: 1;
                    border-top: 1px solid var(--border-color);
                }

                .doc-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 8px;
                }

                .doc-title {
                    font-size: 1rem;
                    font-weight: 600;
                    color: var(--text-color);
                    margin: 0;
                    line-height: 1.4;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .doc-ext {
                    font-size: 0.7rem;
                    background: var(--bg-secondary);
                    padding: 2px 6px;
                    border-radius: 4px;
                    color: var(--text-light);
                    font-weight: 700;
                }

                .doc-meta {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    font-size: 0.8rem;
                    color: var(--text-light);
                }

                .doc-footer {
                    padding: 12px 16px;
                    background: #f8fafc;
                    border-top: 1px solid var(--border-color);
                    display: flex;
                    justify-content: flex-end;
                }

                .btn-icon-text {
                    background: none;
                    border: none;
                    font-size: 0.85rem;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    cursor: pointer;
                    padding: 4px 8px;
                    border-radius: 4px;
                    transition: background 0.2s;
                }

                .btn-icon-text.delete {
                    color: var(--text-light);
                }

                .btn-icon-text.delete:hover {
                    background: #fee2e2;
                    color: #dc2626;
                }

                .no-docs-state {
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 80px 20px;
                    background: white;
                    border-radius: var(--radius-lg);
                    border: 2px dashed var(--border-color);
                    color: var(--text-light);
                }

                .empty-icon-wrapper {
                    width: 80px;
                    height: 80px;
                    background: var(--bg-secondary);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 24px;
                }

                .empty-icon-wrapper .icon {
                    font-size: 3rem;
                    opacity: 0.5;
                }

                .fade-in {
                    animation: fadeIn 0.4s ease-out;
                }
            `}</style>
        </div>
    );
};

export default Documents;
