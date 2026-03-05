import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { checkPermission, canEditDelete } from '../../utils/permissions';

const TemplateManager = ({ onNavigate }) => {
    const { checklistTemplates, addChecklistTemplate, deleteChecklistTemplate, currentUser } = useData();
    const permission = checkPermission(currentUser, 'checklist');
    const canManage = canEditDelete(permission); // Only Admins/Editors

    const [showModal, setShowModal] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [newTemplateItems, setNewTemplateItems] = useState([{ id: 1, text: '' }]);

    const handleAddItem = () => {
        setNewTemplateItems([...newTemplateItems, { id: Date.now(), text: '' }]);
    };

    const handleItemChange = (id, text) => {
        setNewTemplateItems(newTemplateItems.map(item => item.id === id ? { ...item, text } : item));
    };

    const handleRemoveItem = (id) => {
        setNewTemplateItems(newTemplateItems.filter(item => item.id !== id));
    };

    const handleSaveTemplate = async () => {
        if (!newTemplateName || newTemplateItems.some(i => !i.text)) return;

        const newTemplate = {
            id: `tpl_${Date.now()}`,
            name: newTemplateName,
            items: newTemplateItems.map((item, index) => ({ id: index + 1, text: item.text }))
        };

        await addChecklistTemplate(newTemplate);
        setShowModal(false);
        setNewTemplateName('');
        setNewTemplateItems([{ id: 1, text: '' }]);
    };

    return (
        <div className="template-manager">
            <div className="page-header">
                <button className="btn-back" onClick={() => onNavigate('checklist')}>
                    ← Back
                </button>
                <h1>Manage Templates</h1>
                {canManage && (
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        + New Template
                    </button>
                )}
            </div>

            <div className="templates-list">
                {checklistTemplates.map(template => {
                    let safeItems = template.items;
                    if (typeof safeItems === 'string') {
                        try { safeItems = JSON.parse(safeItems); } catch (e) { safeItems = []; }
                    }
                    if (!Array.isArray(safeItems)) safeItems = [];

                    return (
                        <div key={template._id || template.id} className="template-card">
                            <div className="card-header">
                                <h3>{template.name}</h3>
                                {canManage && <button className="btn-delete" onClick={() => deleteChecklistTemplate(template._id || template.id)}>🗑️</button>}
                            </div>
                            <ul className="template-items">
                                {safeItems.slice(0, 3).map((item, idx) => (
                                    <li key={item.id || idx}>{item.text}</li>
                                ))}
                                {safeItems.length > 3 && <li className="more-items">+{safeItems.length - 3} more items</li>}
                            </ul>
                        </div>
                    );
                })}
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Create New Template</h2>
                        <div className="form-group">
                            <label>Template Name</label>
                            <input
                                type="text"
                                placeholder="e.g., Plastering Checklist"
                                value={newTemplateName}
                                onChange={(e) => setNewTemplateName(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Checklist Items</label>
                            {newTemplateItems.map((item, index) => (
                                <div key={item.id} className="item-row">
                                    <span>{index + 1}.</span>
                                    <input
                                        type="text"
                                        placeholder="Checklist item..."
                                        value={item.text}
                                        onChange={(e) => handleItemChange(item.id, e.target.value)}
                                    />
                                    {newTemplateItems.length > 1 && (
                                        <button className="btn-remove" onClick={() => handleRemoveItem(item.id)}>×</button>
                                    )}
                                </div>
                            ))}
                            <button className="btn-add-item" onClick={handleAddItem}>+ Add Item</button>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSaveTemplate}>Save Template</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .template-manager {
                    padding: 20px;
                    max-width: 1200px;
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
                    font-size: 1.1rem;
                    color: var(--primary-color);
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 50%;
                    transition: background 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .btn-back:hover {
                    background: #f1f5f9;
                }
                .templates-list {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 24px;
                }
                .template-card {
                    background: white;
                    padding: 24px;
                    border-radius: 16px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                    border: 1px solid #e2e8f0;
                    transition: all 0.3s ease;
                }
                .template-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                }
                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 12px;
                    border-bottom: 2px solid #f8fafc;
                }
                .card-header h3 {
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: #1e293b;
                }
                .btn-delete {
                    background: #fee2e2;
                    border: none;
                    cursor: pointer;
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #ef4444;
                    transition: all 0.2s;
                }
                .btn-delete:hover {
                    background: #fecaca;
                    transform: scale(1.05);
                }
                .template-items {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                .template-items li {
                    padding: 8px 0;
                    color: #64748b;
                    font-size: 0.95rem;
                    border-bottom: 1px solid #f1f5f9;
                    display: flex;
                    align-items: center;
                }
                .template-items li:before {
                    content: "•";
                    color: var(--primary-color);
                    font-weight: bold;
                    margin-right: 8px;
                }
                .template-items li:last-child {
                    border-bottom: none;
                }
                .more-items {
                    font-style: italic;
                    color: var(--primary-color) !important;
                    font-weight: 500;
                    margin-top: 8px;
                    display: block;
                }
                .more-items:before {
                    display: none !important;
                }
                
                /* Modal Styles */
                .modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(15, 23, 42, 0.6);
                    backdrop-filter: blur(4px);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                    animation: fadeIn 0.2s ease-out;
                }
                .modal-content {
                    background: white;
                    padding: 32px;
                    border-radius: 24px;
                    width: 90%;
                    max-width: 600px;
                    max-height: 85vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    animation: slideUp 0.3s ease-out;
                }
                .modal-content h2 {
                    margin-top: 0;
                    margin-bottom: 24px;
                    font-size: 1.5rem;
                    color: #0f172a;
                    border-bottom: 2px solid #f1f5f9;
                    padding-bottom: 16px;
                }
                .form-group {
                    margin-bottom: 24px;
                }
                .form-group label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                    color: #334155;
                    font-size: 0.95rem;
                }
                .form-group input[type="text"] {
                    width: 100%;
                    padding: 12px 16px;
                    border: 2px solid #e2e8f0;
                    border-radius: 12px;
                    font-size: 1rem;
                    transition: all 0.2s;
                    outline: none;
                }
                .form-group input[type="text"]:focus {
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }
                .item-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 12px;
                    background: #f8fafc;
                    padding: 8px;
                    border-radius: 12px;
                    border: 1px solid transparent;
                    transition: all 0.2s;
                }
                .item-row:focus-within {
                    background: white;
                    border-color: #e2e8f0;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }
                .item-row span {
                    font-weight: 600;
                    color: #94a3b8;
                    width: 24px;
                    text-align: center;
                }
                .item-row input {
                    border: none !important;
                    background: transparent !important;
                    padding: 8px !important;
                    box-shadow: none !important;
                }
                .btn-remove {
                    background: white;
                    color: #ef4444;
                    border: 1px solid #fee2e2;
                    width: 28px;
                    height: 28px;
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                    flex-shrink: 0;
                }
                .btn-remove:hover {
                    background: #fee2e2;
                    transform: rotate(90deg);
                }
                .btn-add-item {
                    background: #f0f9ff;
                    border: 2px dashed #bae6fd;
                    color: #0284c7;
                    width: 100%;
                    padding: 12px;
                    border-radius: 12px;
                    cursor: pointer;
                    margin-top: 16px;
                    font-weight: 600;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }
                .btn-add-item:hover {
                    background: #e0f2fe;
                    border-color: #7dd3fc;
                    transform: translateY(-1px);
                }
                .modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    margin-top: 32px;
                    padding-top: 20px;
                    border-top: 2px solid #f1f5f9;
                }
                .btn {
                    padding: 12px 24px;
                    border-radius: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 1rem;
                }
                .btn-secondary {
                    background: white;
                    border: 2px solid #e2e8f0;
                    color: #64748b;
                }
                .btn-secondary:hover {
                    background: #f8fafc;
                    border-color: #cbd5e1;
                    color: #475569;
                }
                .btn-primary {
                    background: var(--primary-color);
                    border: 2px solid var(--primary-color);
                    color: white;
                    box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);
                }
                .btn-primary:hover {
                    filter: brightness(110%);
                    transform: translateY(-1px);
                    box-shadow: 0 6px 8px -1px rgba(59, 130, 246, 0.3);
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default TemplateManager;
