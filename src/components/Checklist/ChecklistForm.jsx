import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { checkPermission, canEditDelete } from '../../utils/permissions';

const ChecklistForm = ({ checklistData, onNavigate }) => {
    const { updateChecklist, deleteChecklist, currentUser } = useData();
    const [checklist, setChecklist] = useState(checklistData);

    // Safely parse items once or whenever checklist changes
    const [itemsList, setItemsList] = useState([]);

    useEffect(() => {
        console.log("ChecklistForm Loaded. Data:", checklistData);
        if (!checklistData?.id && !checklistData?._id) {
            console.error("Checklist ID is MISSING in checklistData!");
            alert("Error: This checklist is invalid (missing ID). Please go back and try again.");
        }

        let safeItems = checklistData.items;
        if (typeof safeItems === 'string') {
            try { safeItems = JSON.parse(safeItems); } catch (e) { safeItems = []; }
        }
        if (!Array.isArray(safeItems)) safeItems = [];
        setItemsList(safeItems);
        setChecklist({ ...checklistData, items: safeItems });
    }, [checklistData]);

    const handleStatusChange = (itemId, status) => {
        const updatedItems = itemsList.map(item =>
            item.id === itemId ? { ...item, status } : item
        );
        setItemsList(updatedItems); // Optimistic UI update
        updateChecklistState(updatedItems);
    };

    const handleRemarkChange = (itemId, remark) => {
        const updatedItems = itemsList.map(item =>
            item.id === itemId ? { ...item, remark } : item
        );
        setItemsList(updatedItems); // Optimistic UI update
        // Debounce this call ideally, but valid for now
        updateChecklistState(updatedItems);
    };

    const handlePhotoUpload = (itemId, file) => {
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const updatedItems = itemsList.map(item =>
                item.id === itemId ? { ...item, photos: [...(item.photos || []), reader.result] } : item
            );
            setItemsList(updatedItems);
            updateChecklistState(updatedItems);
        };
        reader.readAsDataURL(file);
    };

    const removePhoto = (itemId, photoIndex) => {
        const updatedItems = itemsList.map(item => {
            if (item.id === itemId) {
                const newPhotos = [...(item.photos || [])];
                newPhotos.splice(photoIndex, 1);
                return { ...item, photos: newPhotos };
            }
            return item;
        });
        setItemsList(updatedItems);
        updateChecklistState(updatedItems);
    };

    const updateChecklistState = async (updatedItems) => {
        const totalItems = updatedItems.length;
        const completedItems = updatedItems.filter(i => i.status === 'Approved' || i.status === 'Rejected').length;
        const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

        let status = 'In Progress';
        if (progress === 100) status = 'Completed';

        const updatedChecklist = {
            ...checklist,
            items: JSON.stringify(updatedItems), // Ensure items is sent as a string to avoid parsing issues
            progress,
            status
        };

        setChecklist(updatedChecklist);

        try {
            await updateChecklist(checklist._id || checklist.id, updatedChecklist);
        } catch (error) {
            console.error("Failed to save checklist update:", error);
            // Optional: revert state or show toast
        }
    };

    const handleComplete = async () => {
        try {
            const completedChecklist = {
                ...checklist,
                items: JSON.stringify(itemsList), // Use latest itemsList
                status: 'Completed',
                progress: 100
            };
            const result = await updateChecklist(checklist._id || checklist.id, completedChecklist);

            if (result && result.success) {
                setChecklist(completedChecklist);
                onNavigate('checklist');
            } else {
                alert(`Failed to save data: ${result?.error || "Unknown error"}`);
            }
        } catch (error) {
            console.error("Error completing checklist:", error);
            alert("An error occurred while saving.");
        }
    };

    const handleDelete = () => {
        if (window.confirm('Are you sure you want to delete this checklist?')) {
            deleteChecklist(checklist._id || checklist.id);
            onNavigate('checklist');
        }
    };

    if (!checklist) return <div>Loading...</div>;

    return (
        <div className="checklist-form">
            <div className="page-header">
                <button className="btn-back" onClick={() => onNavigate('checklist')}>
                    ← Back
                </button>
                <div className="header-content">
                    <h1>{checklist.name}</h1>
                    <p className="text-muted">{checklist.templateName} • {new Date(checklist.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="status-indicator">
                    <span className={`status-badge ${(itemsList.some(i => i.status === 'Rejected') ? 'rejected' : (checklist.status || 'In Progress').toLowerCase().replace(' ', '-'))}`}>
                        {checklist.status || 'In Progress'}
                    </span>
                </div>
            </div>

            <div className="checklist-container">
                <div className="progress-section">
                    <div className="progress-bar-container">
                        <div className="progress-bar" style={{ width: `${checklist.progress}%` }}></div>
                    </div>
                    <p>{Math.round(checklist.progress)}% Completed</p>
                </div>

                <div className="checklist-items">
                    {itemsList.map(item => (
                        <div key={item.id} className={`checklist-item ${(item.status || 'pending').toLowerCase()}`}>
                            <div className="item-content">
                                <p className="item-text">{item.text}</p>

                                <div className="item-details">
                                    <input
                                        type="text"
                                        className="remark-input"
                                        placeholder="Add a remark..."
                                        value={item.remark || ''}
                                        onChange={(e) => handleRemarkChange(item.id, e.target.value)}
                                    />

                                    <div className="photo-section">
                                        <div className="photos-grid">
                                            {(item.photos || []).map((photo, index) => (
                                                <div key={index} className="photo-thumbnail">
                                                    <img src={photo} alt="Evidence" />
                                                    <button className="btn-remove-photo" onClick={() => removePhoto(item.id, index)}>×</button>
                                                </div>
                                            ))}
                                            <label className="btn-upload-photo">
                                                📷
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handlePhotoUpload(item.id, e.target.files[0])}
                                                    style={{ display: 'none' }}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="item-actions">
                                <button
                                    className={`btn-action approve ${item.status === 'Approved' ? 'active' : ''}`}
                                    onClick={() => handleStatusChange(item.id, 'Approved')}
                                >
                                    ✅ Approve
                                </button>
                                <button
                                    className={`btn-action reject ${item.status === 'Rejected' ? 'active' : ''}`}
                                    onClick={() => handleStatusChange(item.id, 'Rejected')}
                                >
                                    ❌ Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>


                <div className="form-actions" style={{ marginTop: 30, textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    {canEditDelete(checkPermission(currentUser, 'checklist'), checklist.createdAt) && (
                        <button
                            className="btn-delete"
                            onClick={handleDelete}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                cursor: 'pointer',
                                fontWeight: '600'
                            }}
                        >
                            Delete
                        </button>
                    )}
                    <button
                        className="btn-complete"
                        onClick={handleComplete}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        Complete Inspection
                    </button>
                </div>
            </div>

            <style>{`
                .checklist-form {
                    padding: 20px;
                    max-width: 800px;
                    margin: 0 auto;
                }
                .page-header {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    margin-bottom: 30px;
                }
                .btn-back {
                    background: none;
                    border: none;
                    font-size: 1rem;
                    color: var(--primary-color);
                    cursor: pointer;
                    padding: 0;
                }
                .header-content h1 {
                    margin: 0;
                    font-size: 1.5rem;
                }
                .status-indicator {
                    margin-left: auto;
                }
                .checklist-container {
                    background: white;
                    padding: 30px;
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-sm);
                }
                .progress-section {
                    margin-bottom: 30px;
                }
                .checklist-items {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }
                .checklist-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    padding: 20px;
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    transition: all 0.2s;
                }
                .checklist-item.approved {
                    background-color: #f0fdf4;
                    border-color: #bbf7d0;
                }
                .checklist-item.rejected {
                    background-color: #fef2f2;
                    border-color: #fecaca;
                }
                .item-content {
                    flex: 1;
                    margin-right: 20px;
                }
                .item-text {
                    font-size: 1.1rem;
                    margin: 0 0 12px 0;
                    font-weight: 600;
                    color: #1e293b;
                }
                .remark-input {
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #e2e8f0;
                    border-radius: var(--radius-sm);
                    font-size: 0.9rem;
                    margin-bottom: 12px;
                    transition: border-color 0.2s;
                }
                .remark-input:focus {
                    border-color: var(--primary-color);
                    outline: none;
                }
                .photo-section {
                    margin-top: 10px;
                }
                .photos-grid {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                }
                .photo-thumbnail {
                    position: relative;
                    width: 60px;
                    height: 60px;
                    border-radius: 8px;
                    overflow: hidden;
                    border: 1px solid #e2e8f0;
                }
                .photo-thumbnail img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .btn-remove-photo {
                    position: absolute;
                    top: 0;
                    right: 0;
                    background: rgba(0,0,0,0.5);
                    color: white;
                    border: none;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    font-size: 12px;
                }
                .btn-upload-photo {
                    width: 60px;
                    height: 60px;
                    border: 1px dashed #cbd5e1;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    font-size: 1.5rem;
                    color: #94a3b8;
                    transition: all 0.2s;
                }
                .btn-upload-photo:hover {
                    background: #f8fafc;
                    border-color: var(--primary-color);
                    color: var(--primary-color);
                }
                .item-actions {
                    display: flex;
                    gap: 10px;
                    flex-direction: column;
                }
                .btn-action {
                    padding: 8px 16px;
                    border: 1px solid var(--border-color);
                    background: white;
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    font-size: 0.9rem;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    width: 120px;
                    justify-content: center;
                }
                .btn-action:hover {
                    background: #f8fafc;
                }
                .btn-action.approve.active {
                    background: #22c55e;
                    color: white;
                    border-color: #22c55e;
                }
                .btn-action.reject.active {
                    background: #ef4444;
                    color: white;
                    border-color: #ef4444;
                }
            
            `}</style>
        </div >
    );
};

export default ChecklistForm;
