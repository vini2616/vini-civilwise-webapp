import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { checkPermission, canEnterData, canEditDelete } from '../utils/permissions';

const Drawing = ({ currentUser }) => {
    const { drawings, addDrawing, deleteDrawing, getDocument } = useData();

    // Permission Logic
    const permission = checkPermission(currentUser, 'drawing');
    const canAdd = canEnterData(permission);
    const canEdit = canEditDelete(permission); // For delete
    const [viewingId, setViewingId] = useState(null);

    if (permission === 'no_access') {
        return (
            <div className="drawing-container flex items-center justify-center p-8">
                <div className="text-center">
                    <h2 className="text-xl text-red-600 font-bold">🚫 Access Denied</h2>
                    <p className="text-gray-500 mt-2">You do not have permission to view the Drawing module.</p>
                </div>
            </div>
        );
    }
    const [activeTab, setActiveTab] = useState('pdf'); // 'pdf' or 'dwg'
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            // Auto-fill name if empty
            if (!fileName) {
                setFileName(file.name.replace(/\.[^/.]+$/, ""));
            }
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile) return;

        // NEW: Max limit 50MB (matching server)
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (selectedFile.size > maxSize) {
            alert('File is too large! Please upload a file smaller than 50MB.');
            return;
        }

        setIsUploading(true);

        try {
            // Create FormData for Multipart upload
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('name', fileName);
            formData.append('type', activeTab);
            // timestamp, uploadedBy, size are handled by server/file

            const result = await addDrawing(formData);

            if (result && result.success) {
                setSelectedFile(null);
                setFileName('');
                alert('Drawing uploaded successfully!');
            } else {
                alert('Failed to save drawing. ' + (result?.message || 'Unknown Error'));
            }
        } catch (error) {
            console.error("Upload failed exception:", error);
            alert('Failed to save drawing.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this drawing?')) {
            deleteDrawing(id);
        }
    };

    const formatSize = (bytes) => {
        if (typeof bytes === 'string') return bytes; // Handle legacy string data
        if (!bytes) return 'Unknown Size';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleView = async (drawing) => {
        let fileUrl = drawing.url;

        if (!fileUrl) {
            setViewingId(drawing.id || drawing._id);
            try {
                // Fetch full document including URL
                const fullDoc = await getDocument(drawing.id || drawing._id);
                if (fullDoc && fullDoc.url) {
                    fileUrl = fullDoc.url;
                } else {
                    alert('Failed to retrieve file content.');
                    setViewingId(null);
                    return;
                }
            } catch (e) {
                console.error("Fetch failed", e);
                alert('Error fetching file.');
                setViewingId(null);
                return;
            }
            setViewingId(null);
        }

        if (!fileUrl) return alert('No file data found');

        // For PDF, we can try opening Data URI directly or via Blob
        // Blob is safer for larger files and browser security
        try {
            const arr = fileUrl.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            const blob = new Blob([u8arr], { type: mime });
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');

            // Cleanup blob url after some time? 
            // window.open is async, but we can't easily revoke immediately. 
            // Browser handles it usually when page closes or we can use a timeout
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000); // 1 minute
        } catch (e) {
            console.error("View failed", e);
            // Fallback to simple window.open
            const win = window.open();
            win.document.write('<iframe src="' + fileUrl + '" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>');
        }
    };

    const filteredDrawings = drawings.filter(d => d.type === activeTab);

    return (
        <div className="drawing-container fade-in">
            <div className="page-header">
                <h1>Project Drawings</h1>
                <p className="text-muted">Manage and access your construction drawings and blueprints.</p>
            </div>

            <div className="drawing-content">
                {/* Left Side: Upload Section */}
                {canAdd && (
                    <div className="upload-card card">
                        <div className="card-header">
                            <h3>📤 Upload New {activeTab.toUpperCase()}</h3>
                        </div>
                        <form onSubmit={handleUpload} className="upload-form">
                            <div className="form-group">
                                <label>Drawing Name</label>
                                <input
                                    type="text"
                                    id="drawing-name-input"
                                    value={fileName}
                                    onChange={(e) => {
                                        console.log("Typing:", e.target.value);
                                        setFileName(e.target.value);
                                    }}
                                    className="form-input"
                                    placeholder="e.g. Ground Floor Plan"
                                    style={{ color: '#000', backgroundColor: '#fff' }} // Force verify visibility
                                    autoFocus
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Select File</label>
                                <div className="file-input-wrapper">
                                    <input
                                        type="file"
                                        id="file-upload"
                                        accept={activeTab === 'pdf' ? '.pdf,application/pdf' : '.dwg,image/vnd.dwg,application/acad,application/x-acad,application/autocad_dwg,drawing/dwg'}
                                        onChange={handleFileChange}
                                        className="file-input-hidden"
                                        required
                                    />
                                    <label htmlFor="file-upload" className="file-input-label">
                                        {selectedFile ? (
                                            <span className="file-name">📄 {selectedFile.name}</span>
                                        ) : (
                                            <span className="placeholder">Choose a {activeTab.toUpperCase()} file...</span>
                                        )}
                                        <span className="browse-btn">Browse</span>
                                    </label>
                                </div>
                            </div>
                            <button
                                type="submit"
                                className={`btn btn-primary btn-block ${isUploading ? 'loading' : ''}`}
                                disabled={isUploading}
                            >
                                {isUploading ? 'Uploading...' : 'Upload Drawing'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Right Side: File List */}
                <div className="files-section">
                    <div className="tabs-container">
                        <button
                            className={`tab-pill ${activeTab === 'pdf' ? 'active' : ''}`}
                            onClick={() => setActiveTab('pdf')}
                        >
                            <span className="tab-icon">📄</span> PDF Folder
                        </button>
                        <button
                            className={`tab-pill ${activeTab === 'dwg' ? 'active' : ''}`}
                            onClick={() => setActiveTab('dwg')}
                        >
                            <span className="tab-icon">📐</span> DWG Folder
                        </button>
                    </div>

                    <div className="files-list-container card">
                        {filteredDrawings.length > 0 ? (
                            <div className="files-grid">
                                {filteredDrawings.map(drawing => (
                                    <div key={drawing.id} className="file-card">
                                        <div className="file-icon-large">
                                            {activeTab === 'pdf' ? '📄' : '📐'}
                                        </div>
                                        <div className="file-details">
                                            <h4 className="file-title" title={drawing.name}>{drawing.name}</h4>
                                            <div className="file-meta">
                                                <span>{new Date(drawing.timestamp).toLocaleDateString()}</span>
                                                <span>•</span>
                                                <span>{formatSize(drawing.size)}</span>
                                            </div>
                                        </div>
                                        <div className="file-actions">
                                            <button
                                                onClick={() => handleView(drawing)}
                                                className="btn-icon action-btn view"
                                                title="View"
                                                disabled={viewingId === (drawing.id || drawing._id)}
                                            >
                                                {viewingId === (drawing.id || drawing._id) ? '⏳' : '👁️'}
                                            </button>
                                            <a
                                                href={drawing.url}
                                                download={drawing.name.toLowerCase().endsWith(`.${drawing.type}`) ? drawing.name : `${drawing.name}.${drawing.type}`}
                                                className="btn-icon action-btn download"
                                                title="Download"
                                            >
                                                ⬇️
                                            </a>
                                            {canEdit && (
                                                <button
                                                    onClick={() => handleDelete(drawing.id)}
                                                    className="btn-icon action-btn delete"
                                                    title="Delete"
                                                >
                                                    🗑️
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-icon">📂</div>
                                <h3>No {activeTab.toUpperCase()} files found</h3>
                                <p>Upload a file to get started.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .drawing-container {
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .page-header {
                    margin-bottom: 32px;
                }

                .drawing-content {
                    display: grid;
                    grid-template-columns: 350px 1fr;
                    gap: 32px;
                    align-items: start;
                }

                @media (max-width: 900px) {
                    .drawing-content {
                        grid-template-columns: 1fr;
                    }
                }

                /* Upload Card */
                .card {
                    background: white;
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-md);
                    overflow: hidden;
                }

                .upload-card {
                    padding: 24px;
                    position: sticky;
                    top: 100px;
                }

                .card-header h3 {
                    font-size: 1.2rem;
                    margin-bottom: 20px;
                    color: var(--text-color);
                    border-bottom: 1px solid var(--border-color);
                    padding-bottom: 12px;
                }

                .form-group {
                    margin-bottom: 20px;
                }

                .form-group label {
                    display: block;
                    font-weight: 600;
                    margin-bottom: 8px;
                    color: var(--text-color);
                }

                .form-input {
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    font-size: 1rem;
                    transition: border-color 0.2s;
                }

                .form-input:focus {
                    border-color: var(--primary-color);
                    outline: none;
                }

                /* Custom File Input */
                .file-input-wrapper {
                    position: relative;
                }

                .file-input-hidden {
                    position: absolute;
                    width: 0.1px;
                    height: 0.1px;
                    opacity: 0;
                    overflow: hidden;
                    z-index: -1;
                }

                .file-input-label {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 10px 12px;
                    border: 1px dashed var(--border-color);
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    background: var(--bg-secondary);
                    transition: all 0.2s;
                }

                .file-input-label:hover {
                    border-color: var(--primary-color);
                    background: #f0f7ff;
                }

                .browse-btn {
                    background: white;
                    border: 1px solid var(--border-color);
                    padding: 4px 10px;
                    border-radius: 4px;
                    font-size: 0.8rem;
                    font-weight: 600;
                }

                .file-name {
                    font-weight: 500;
                    color: var(--primary-color);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 200px;
                }

                .placeholder {
                    color: var(--text-light);
                    font-style: italic;
                }

                .btn-block {
                    width: 100%;
                    padding: 12px;
                    font-size: 1rem;
                }

                /* Tabs */
                .tabs-container {
                    display: flex;
                    gap: 16px;
                    margin-bottom: 24px;
                }

                .tab-pill {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 24px;
                    border: none;
                    background: white;
                    border-radius: 50px;
                    font-weight: 600;
                    color: var(--text-light);
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: var(--shadow-sm);
                }

                .tab-pill:hover {
                    background: #f8f9fa;
                    transform: translateY(-2px);
                }

                .tab-pill.active {
                    background: var(--primary-color);
                    color: white;
                    box-shadow: var(--shadow-md);
                }

                .tab-icon {
                    font-size: 1.2rem;
                }

                /* Files Grid */
                .files-list-container {
                    padding: 24px;
                    min-height: 400px;
                }

                .files-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                    gap: 20px;
                }

                .file-card {
                    background: white;
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    transition: all 0.2s;
                    position: relative;
                }

                .file-card:hover {
                    border-color: var(--primary-color);
                    box-shadow: var(--shadow-md);
                    transform: translateY(-2px);
                }

                .file-icon-large {
                    font-size: 2.5rem;
                    text-align: center;
                    margin-bottom: 8px;
                }

                .file-details {
                    text-align: center;
                }

                .file-title {
                    font-size: 1rem;
                    font-weight: 600;
                    margin-bottom: 4px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .file-meta {
                    font-size: 0.8rem;
                    color: var(--text-light);
                }

                .file-actions {
                    display: flex;
                    justify-content: center;
                    gap: 12px;
                    margin-top: auto;
                    padding-top: 12px;
                    border-top: 1px solid var(--bg-secondary);
                }

                .action-btn {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-decoration: none;
                }

                .action-btn:hover {
                    background: var(--bg-secondary);
                }

                .action-btn.delete:hover {
                    background: #fee2e2;
                    color: #dc2626;
                }

                .action-btn.view:hover {
                    background: #e0f2fe;
                    color: #0284c7;
                }

                .action-btn.download:hover {
                    background: #dbeafe;
                    color: var(--primary-color);
                }

                /* Empty State */
                .empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 300px;
                    color: var(--text-light);
                    text-align: center;
                }

                .empty-icon {
                    font-size: 4rem;
                    margin-bottom: 16px;
                    opacity: 0.5;
                }

                .fade-in {
                    animation: fadeIn 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

export default Drawing;
