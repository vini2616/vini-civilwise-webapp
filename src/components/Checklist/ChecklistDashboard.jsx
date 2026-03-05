import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { checkPermission, canEditDelete } from '../../utils/permissions';

const ChecklistDashboard = ({ onNavigate, setPageData }) => {
    const { checklists, checklistTemplates, addChecklist, updateChecklist, deleteChecklist, currentUser } = useData();
    const permission = checkPermission(currentUser, 'checklist');
    const [showNewModal, setShowNewModal] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [newChecklistName, setNewChecklistName] = useState('');

    // Edit/Delete State
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedChecklist, setSelectedChecklist] = useState(null);
    const [editName, setEditName] = useState('');

    // Analytics Logic Removed - Moved to ChecklistAnalytics.jsx

    const handleCreateChecklist = async () => {
        if (!selectedTemplate) return;

        // Use loose comparison or string conversion to ensure match
        const template = checklistTemplates.find(t => String(t._id || t.id) === String(selectedTemplate));

        if (!template) {
            console.error("Template not found for ID:", selectedTemplate);
            alert("Selected template not found. Please refresh the page.");
            return;
        }

        try {
            let templateItems = template.items;

            // Fix: Parse items if they are a string
            if (typeof templateItems === 'string') {
                try {
                    templateItems = JSON.parse(templateItems);
                } catch (e) {
                    console.warn("Failed to parse template items JSON:", e);
                    templateItems = [];
                }
            }

            // Ensure it is an array
            if (!Array.isArray(templateItems)) {
                console.warn("Template items is not an array:", templateItems);
                templateItems = [];
            }

            const newChecklist = {
                templateId: template._id || template.id,
                templateName: template.name,
                name: newChecklistName || `${template.name} - ${new Date().toLocaleDateString()}`,
                items: templateItems.map((item, index) => ({
                    ...item,
                    id: item.id || `item-${Date.now()}-${index}`, // Ensure valid ID
                    status: 'Pending',
                    remark: '',
                    photos: []
                })),
                progress: 0,
                status: 'In Progress'
            };

            const result = await addChecklist(newChecklist);

            // Check specific success condition if addChecklist returns it, or assume success if it completed without error
            // DataContext's addChecklist returns { success: true, ... } on success, or undefined/void on failure usually
            if (result && result.success) {
                setShowNewModal(false);
                setNewChecklistName('');
                setSelectedTemplate('');
            } else {
                // If it returned something else or undefined, it might have failed
                // But existing DataContext might just return nothing on failure check?
                // Let's check DataContext again. It returns undefined if auth fails or catch block hit.
                // So if result is falsy, it failed.
                console.error("Checklist creation failed or returned no result");
                // If it's a silent failure in DataContext (e.g. catch), we should alert
                // However, previously it was `await addChecklist(...)` then `setShowNewModal(false)` unconditionally
                // which suggests it blindly closed. If it didn't close, it means code THREW before closing.
                // Now we are safe.

                // If result is undefined, we assume failure now.
                if (!result) {
                    alert("Failed to start inspection. Please check your connection or try logging in again.");
                } else {
                    setShowNewModal(false);
                    setNewChecklistName('');
                    setSelectedTemplate('');
                }
            }
        } catch (error) {
            console.error("Error creating checklist:", error);
            alert("An error occurred: " + error.message);
        }
    };

    const handleOpenChecklist = (checklist) => {
        setPageData(checklist);
        onNavigate('checklist-form');
    };

    const handleEditClick = (e, checklist) => {
        e.stopPropagation();
        setSelectedChecklist(checklist);
        setEditName(checklist.name);
        setShowEditModal(true);
    };

    const handleDeleteClick = (e, checklist) => {
        e.stopPropagation();
        setSelectedChecklist(checklist);
        setShowDeleteModal(true);
    };

    const handleSaveEdit = () => {
        if (!editName.trim()) return;
        const id = selectedChecklist._id || selectedChecklist.id;
        updateChecklist(id, { ...selectedChecklist, name: editName });
        setShowEditModal(false);
        setSelectedChecklist(null);
    };

    const handleConfirmDelete = () => {
        const id = selectedChecklist._id || selectedChecklist.id;
        deleteChecklist(id);
        setShowDeleteModal(false);
        setSelectedChecklist(null);
    };

    return (
        <div className="checklist-dashboard">
            <div className="page-header">
                <div>
                    <h1>Checklists</h1>
                    <p className="text-muted">Manage and track site inspections.</p>
                </div>
                <div className="header-actions">
                    {/* Restrict Template Management to users who can Edit/Delete (Admins) */}
                    {canEditDelete(permission) && (
                        <button className="btn btn-secondary" onClick={() => onNavigate('checklist-templates')}>
                            Manage Templates
                        </button>
                    )}
                    <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
                        + New Checklist
                    </button>
                </div>
            </div>

            <div className="checklists-grid">
                {checklists.length === 0 ? (
                    <div className="empty-state">
                        <p>No active checklists. Start a new inspection!</p>
                    </div>
                ) : (
                    checklists.map(checklist => {
                        // Safe parsing of items for display logic
                        let safeItems = checklist.items;
                        if (typeof safeItems === 'string') {
                            try { safeItems = JSON.parse(safeItems); } catch (e) { safeItems = []; }
                        }
                        if (!Array.isArray(safeItems)) safeItems = [];

                        // Ensure all items have IDs (retroactive fix for existing bad data)
                        safeItems = safeItems.map((i, idx) => ({ ...i, id: i.id || `fixed-${idx}` }));

                        return (
                            <div key={checklist._id || checklist.id} className="checklist-card" onClick={() => handleOpenChecklist({ ...checklist, items: safeItems })}>
                                <div className="card-header">
                                    <h3>{checklist.name}</h3>
                                    {canEditDelete(permission, checklist.createdAt) && (
                                        <div className="card-actions">
                                            <button className="btn-icon edit" onClick={(e) => handleEditClick(e, checklist)} title="Edit Name">✎</button>
                                            <button className="btn-icon delete" onClick={(e) => handleDeleteClick(e, checklist)} title="Delete Checklist">🗑️</button>
                                        </div>
                                    )}
                                </div>
                                <div className="card-body">
                                    <div className="status-row">
                                        <span className={`status-badge ${(safeItems.some(i => i.status === 'Rejected') ? 'rejected' : (checklist.status || 'In Progress').toLowerCase().replace(' ', '-'))}`}>
                                            {checklist.status || 'In Progress'}
                                        </span>
                                    </div>
                                    <p><strong>Template:</strong> {checklist.templateName}</p>
                                    <p><strong>Date:</strong> {new Date(checklist.createdAt).toLocaleDateString()}</p>
                                    <div className="progress-bar-container">
                                        <div className="progress-bar" style={{ width: `${checklist.progress}%` }}></div>
                                    </div>
                                    <p className="progress-text">{Math.round(checklist.progress || 0)}% Completed</p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* New Checklist Modal */}
            {showNewModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Start New Checklist</h2>
                        <div className="form-group">
                            <label>Select Template</label>
                            <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}>
                                <option value="">-- Select a Template --</option>
                                {checklistTemplates.map(t => (
                                    <option key={t._id || t.id} value={t._id || t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Checklist Name (Optional)</label>
                            <input
                                type="text"
                                placeholder="e.g., Block A - First Floor Slab"
                                value={newChecklistName}
                                style={{ zIndex: 2002, position: 'relative', color: '#000' }}
                                onChange={(e) => setNewChecklistName(e.target.value)}
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowNewModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleCreateChecklist} disabled={!selectedTemplate}>
                                Start Inspection
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Rename Checklist</h2>
                        <div className="form-group">
                            <label>Checklist Name</label>
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSaveEdit}>Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Delete Checklist</h2>
                        <p>Are you sure you want to delete <strong>{selectedChecklist?.name}</strong>? This action cannot be undone.</p>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                            <button className="btn btn-danger" onClick={handleConfirmDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .checklist-dashboard {
                    padding: 20px;
                }
                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 30px;
                }
                .header-actions {
                    display: flex;
                    gap: 10px;
                }
                
                .checklists-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 20px;
                }
                .checklist-card {
                    background: white;
                    border-radius: var(--radius-lg);
                    padding: 20px;
                    box-shadow: var(--shadow-sm);
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                    border: 1px solid var(--border-color);
                    position: relative;
                }
                .checklist-card:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
                }
                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 15px;
                }
                .card-header h3 {
                    margin: 0;
                    font-size: 1.1rem;
                    color: var(--text-color);
                    flex: 1;
                    padding-right: 10px;
                }
                .card-actions {
                    display: flex;
                    gap: 5px;
                }
                .btn-icon {
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 1.1rem;
                    padding: 4px;
                    border-radius: 4px;
                    transition: background 0.2s;
                    opacity: 0.6;
                }
                .btn-icon:hover {
                    background: #f1f5f9;
                    opacity: 1;
                }
                .btn-icon.delete:hover {
                    color: #ef4444;
                    background: #fee2e2;
                }
                .btn-icon.edit:hover {
                    color: #3b82f6;
                    background: #dbeafe;
                }
                .status-row {
                    margin-bottom: 10px;
                }
                .status-badge {
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    display: inline-block;
                }
                .status-badge.in-progress { background: #e0f2fe; color: #0369a1; }
                .status-badge.completed { background: #dcfce7; color: #15803d; }
                .card-body p {
                    margin: 5px 0;
                    font-size: 0.9rem;
                    color: var(--text-light);
                }
                .progress-bar-container {
                    height: 6px;
                    background: #f1f5f9;
                    border-radius: 3px;
                    margin-top: 15px;
                    overflow: hidden;
                }
                .progress-bar {
                    height: 100%;
                    background: var(--primary-color);
                    transition: width 0.3s ease;
                }
                .progress-text {
                    font-size: 0.8rem;
                    text-align: right;
                    margin-top: 4px;
                }
                .empty-state {
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 40px;
                    background: #f8fafc;
                    border-radius: var(--radius-lg);
                    color: var(--text-light);
                }
                .modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 2000;
                }
                .modal-content {
                    background: white;
                    padding: 30px;
                    border-radius: var(--radius-lg);
                    width: 100%;
                    max-width: 500px;
                }
                .form-group {
                    margin-bottom: 20px;
                }
                .form-group label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 500;
                }
                .form-group select, .form-group input {
                    width: 100%;
                    padding: 10px;
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                }
                .modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    margin-top: 30px;
                }
                .btn-danger {
                    background: #ef4444;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    font-weight: 600;
                }
                .btn-danger:hover {
                    background: #dc2626;
                }
            `}</style>
        </div>
    );
};

export default ChecklistDashboard;
