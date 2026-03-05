
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { checkPermission, canEnterData, canEditDelete } from '../utils/permissions';
import { generateMaterialsCSV } from '../utils/exportUtils';
import SearchableSelect from './SearchableSelect';
import AddNewModal from './AddNewModal';

const Materials = () => {
    const { materials, addMaterialTransaction, updateMaterialTransaction, deleteMaterialTransaction, activeSite, savedSuppliers, addSavedSupplier, savedMaterialNames, addSavedMaterialName, contacts, addContact, currentUser, savedUnits, addSavedUnit } = useData();
    const [activeTab, setActiveTab] = useState('summary'); // summary, inward, outward, history

    const permission = checkPermission(currentUser, 'materials');
    const canAdd = canEnterData(permission);
    const canEdit = canEditDelete(permission);

    // Filter materials for active site
    const siteMaterials = useMemo(() => {
        // eslint-disable-next-line eqeqeq
        return materials.filter(m => m.siteId == activeSite);
    }, [materials, activeSite]);

    // Calculate Stock Summary
    const stockSummary = useMemo(() => {
        const summary = {};
        siteMaterials.forEach(m => {
            const name = m.name || m.materialName; // Handle DB vs Local
            if (!name) return;

            if (!summary[name]) {
                summary[name] = { name: name, quantity: 0, unit: m.unit };
            }
            const qty = Number(m.quantity) || 0;
            if (m.type === 'inward') {
                summary[name].quantity += qty;
            } else {
                summary[name].quantity -= qty;
            }
            // Update unit if not set (or take latest)
            if (m.unit) summary[name].unit = m.unit;
        });
        return Object.values(summary);
    }, [siteMaterials]);

    return (
        <div className="materials-container fade-in">
            <div className="page-header">
                <h2 className="page-title">🧱 Materials Management</h2>
                <p className="page-subtitle">Track inward and outward stock</p>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>📊 Stock Summary</button>
                {canAdd && <button className={`tab-btn ${activeTab === 'inward' ? 'active' : ''}`} onClick={() => setActiveTab('inward')}>📥 Inward (Add)</button>}
                {canAdd && <button className={`tab-btn ${activeTab === 'outward' ? 'active' : ''}`} onClick={() => setActiveTab('outward')}>📤 Outward (Use)</button>}
                <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>📜 History</button>
            </div>

            <div className="tab-content">
                {activeTab === 'summary' && <StockSummary summary={stockSummary} />}
                {activeTab === 'inward' && canAdd && <InwardForm onAdd={addMaterialTransaction} existingMaterials={stockSummary.map(s => s.name)} savedSuppliers={savedSuppliers} onAddSupplier={addSavedSupplier} savedMaterialNames={savedMaterialNames} onAddMaterial={addSavedMaterialName} contacts={contacts} addContact={addContact} savedUnits={savedUnits} addSavedUnit={addSavedUnit} />}
                {activeTab === 'outward' && canAdd && <OutwardForm onAdd={addMaterialTransaction} availableStock={stockSummary} savedUnits={savedUnits} addSavedUnit={addSavedUnit} />}
                {activeTab === 'history' && <HistoryLog transactions={siteMaterials} onDelete={deleteMaterialTransaction} onEdit={updateMaterialTransaction} savedSuppliers={savedSuppliers} permission={permission} />}
            </div>

            <style>{`
                .materials-container { padding: 24px; max-width: 1200px; margin: 0 auto; font-family: 'Inter', sans-serif; }
                .page-header { margin-bottom: 24px; }
                .page-title { font-size: 1.8rem; font-weight: 700; color: #1e293b; margin: 0; }
                .page-subtitle { color: #64748b; margin: 4px 0 0 0; }

                .tabs { display: flex; gap: 10px; margin-bottom: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 1px; overflow-x: auto; }
                .tab-btn { padding: 10px 20px; background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-weight: 600; color: #64748b; white-space: nowrap; }
                .tab-btn.active { color: #3b82f6; border-bottom-color: #3b82f6; }
                .tab-btn:hover:not(.active) { color: #1e293b; }

                .card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
                
                .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px; }
                .form-group label { display: block; margin-bottom: 8px; font-size: 0.875rem; font-weight: 500; color: #475569; }
                .form-input { width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; outline: none; }
                .form-input:focus { border-color: #3b82f6; }
                
                .btn { padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; }
                .btn-primary { background: #3b82f6; color: white; }
                .btn-primary:hover { background: #2563eb; }
                .btn-outline { background: white; border: 1px solid #e2e8f0; color: #475569; }
                .btn-outline:hover { background: #f8fafc; border-color: #cbd5e1; }
                .btn-danger { background: #fee2e2; color: #dc2626; }
                .btn-danger:hover { background: #fecaca; }
                .btn-sm { padding: 6px 12px; font-size: 0.875rem; }

                .table-container { overflow-x: auto; }
                .data-table { width: 100%; border-collapse: collapse; }
                .data-table th { background: #f8fafc; padding: 12px; text-align: left; font-weight: 600; color: #475569; font-size: 0.875rem; }
                .data-table td { padding: 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b; }
                .badge { padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; }
                .badge.inward { background: #dcfce7; color: #166534; }
                .badge.outward { background: #fee2e2; color: #991b1b; }
                
                .stock-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
                .stock-card { background: white; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center; }
                .stock-name { font-weight: 600; color: #475569; margin-bottom: 8px; }
                .stock-qty { font-size: 1.5rem; font-weight: 700; color: #0f172a; }
                .stock-unit { font-size: 0.875rem; color: #94a3b8; margin-left: 4px; }

                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 50; backdrop-filter: blur(4px); }
                .modal-content { background: white; border-radius: 16px; width: 100%; max-width: 500px; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); max-height: 90vh; overflow-y: auto; }
                .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
                .modal-header h3 { margin: 0; font-size: 1.25rem; color: #0f172a; }
                .close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #94a3b8; }

                .fade-in { animation: fadeIn 0.3s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

const StockSummary = ({ summary }) => {
    if (summary.length === 0) return <div className="text-center text-muted py-8">No materials in stock.</div>;
    return (
        <div className="stock-grid fade-in">
            {summary.map((item, index) => (
                <div key={index} className="stock-card">
                    <div className="stock-name">{item.name}</div>
                    <div>
                        <span className="stock-qty">{item.quantity}</span>
                        <span className="stock-unit">{item.unit}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};

const InwardForm = ({ onAdd, existingMaterials, savedSuppliers, onAddSupplier, savedMaterialNames, onAddMaterial, contacts, addContact, savedUnits, addSavedUnit }) => {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        materialName: '',
        quantity: '',
        unit: 'bags',
        supplier: '',
        challanImage: null,
        notes: ''
    });

    const [addModal, setAddModal] = useState({ isOpen: false, type: null, value: '' });

    const openAddModal = (type, value) => {
        setAddModal({ isOpen: true, type, value });
    };

    const closeAddModal = () => {
        setAddModal({ isOpen: false, type: null, value: '' });
    };

    const handleSaveNewItem = async (newValue) => {
        if (!newValue || !newValue.trim()) return;
        const val = newValue.trim();

        if (addModal.type === 'unit') {
            if (addSavedUnit) {
                await addSavedUnit(val);
                setFormData(prev => ({ ...prev, unit: val }));
            }
        } else if (addModal.type === 'material') {
            if (onAddMaterial) {
                onAddMaterial(val);
                setFormData(prev => ({ ...prev, materialName: val }));
            }
        } else if (addModal.type === 'supplier') {
            if (addContact) {
                await addContact({
                    companyName: val,
                    type: 'Vendor',
                    mobileNumber: '',
                    address: '',
                    gstNumber: ''
                });
            }
            if (onAddSupplier) onAddSupplier(val);
            setFormData(prev => ({ ...prev, supplier: val }));
        }
        closeAddModal();
    };

    const unitOptions = (savedUnits || ['bags', 'kg', 'tons']).map(u => ({ label: u, value: u }));

    const handleAddUnit = (newUnit) => openAddModal('unit', newUnit);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setFormData(prev => ({ ...prev, challanImage: reader.result }));
            reader.readAsDataURL(file);
        }
    };

    const handleAddMaterial = (name) => openAddModal('material', name);

    const handleAddSupplier = (name) => openAddModal('supplier', name);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Show loading state if possible or just wait
        try {
            // Map form data to Backend Schema (Material.ts)
            const payload = {
                ...formData,
                name: formData.materialName, // Schema requires 'name'
                type: 'inward', // 'inward' or 'outward'
                quantity: Number(formData.quantity) // Ensure number
            };

            const res = await onAdd(payload);
            if (res && res.success) {
                alert('Material Added Successfully!');
                setFormData({ ...formData, materialName: '', quantity: '', supplier: '', challanImage: null, notes: '' });
            } else {
                alert('Failed to save: ' + (res?.message || 'Unknown Error'));
            }
        } catch (error) {
            console.error("Save error:", error);
            alert('Error saving material');
        }
    };

    // Robust Options Mapping (handling strings & objects)
    const materialOptions = [...new Set([...(savedMaterialNames || []), ...(existingMaterials || [])])].map(m => {
        const label = typeof m === 'object' && m !== null ? (m.name || m.materialName || '') : String(m || '');
        return { label, value: label };
    }).filter(o => o.value);

    const supplierOptions = [...(savedSuppliers || []), ...(contacts || []).filter(c => c.type && c.type.toLowerCase() === 'vendor')].map(s => {
        const val = typeof s === 'object' && s !== null ? (s.companyName || s.name || '') : String(s || '');
        return { label: val, value: val };
    }).filter(o => o.value);

    return (
        <div className="card fade-in">
            <form onSubmit={handleSubmit}>
                <div className="form-grid">
                    <div className="form-group">
                        <label>Date</label>
                        <input type="date" required className="form-input" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Material Name</label>
                        <SearchableSelect
                            options={materialOptions}
                            value={formData.materialName}
                            onChange={(val) => setFormData({ ...formData, materialName: val })}
                            placeholder="Select Material"
                            onAddNew={handleAddMaterial}
                            addNewLabel="Add New Material"
                        />
                    </div>
                    <div className="form-group">
                        <label>Quantity</label>
                        <input type="number" required min="0" className="form-input" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Unit</label>
                        <SearchableSelect
                            options={unitOptions}
                            value={formData.unit}
                            onChange={(val) => setFormData({ ...formData, unit: val })}
                            placeholder="Select Unit"
                            onAddNew={handleAddUnit}
                            addNewLabel="Add New Unit"
                        />
                    </div>
                    <div className="form-group">
                        <label>Supplier Name</label>
                        <SearchableSelect
                            options={supplierOptions}
                            value={formData.supplier}
                            onChange={(val) => setFormData({ ...formData, supplier: val })}
                            placeholder="Select Supplier"
                            onAddNew={handleAddSupplier}
                            addNewLabel="Add New Supplier"
                        />
                    </div>
                    <div className="form-group">
                        <label>Challan Photo</label>
                        <input type="file" accept="image/*" className="form-input" onChange={handleFileChange} />
                    </div>
                </div>
                <button type="submit" className="btn btn-primary">Save Inward Entry</button>
            </form>
            <AddNewModal
                isOpen={addModal.isOpen}
                onClose={closeAddModal}
                onSave={handleSaveNewItem}
                title={`Add New ${addModal.type === 'unit' ? 'Unit' : addModal.type === 'material' ? 'Material' : 'Supplier'}`}
                initialValue={addModal.value}
                label={addModal.type === 'unit' ? 'Unit Name' : addModal.type === 'material' ? 'Material Name' : 'Supplier Name'}
            />
        </div>
    );
};

const OutwardForm = ({ onAdd, availableStock, savedUnits, addSavedUnit }) => {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        materialName: '',
        quantity: '',
        unit: 'bags', // Default
        usedFor: '',
        notes: ''
    });
    const [addModal, setAddModal] = useState({ isOpen: false, type: null, value: '' });

    const openAddModal = (type, value) => {
        setAddModal({ isOpen: true, type, value });
    };

    const closeAddModal = () => {
        setAddModal({ isOpen: false, type: null, value: '' });
    };

    const handleSaveNewItem = async (newValue) => {
        if (!newValue || !newValue.trim()) return;
        const val = newValue.trim();

        if (addModal.type === 'unit') {
            if (addSavedUnit) {
                await addSavedUnit(val);
                setFormData(prev => ({ ...prev, unit: val }));
            }
        }
        closeAddModal();
    };

    const unitOptions = (savedUnits || ['bags', 'kg', 'tons']).map(u => ({ label: u, value: u }));

    const handleAddUnit = (newUnit) => openAddModal('unit', newUnit);

    const selectedMaterial = availableStock.find(s => s.name === formData.materialName);

    // Auto-update unit when material is selected
    useEffect(() => {
        if (selectedMaterial && selectedMaterial.unit) {
            setFormData(prev => ({ ...prev, unit: selectedMaterial.unit }));
        }
    }, [formData.materialName, availableStock]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation: Check if requested quantity > stock
        if (selectedMaterial && Number(formData.quantity) > selectedMaterial.quantity) {
            const confirm = window.confirm(`Warning: Insufficient Stock! Available: ${selectedMaterial.quantity} ${selectedMaterial.unit}. Do you want to proceed anyway?`);
            if (!confirm) return;
        }

        try {
            const payload = {
                ...formData,
                name: formData.materialName, // Schema requires 'name'
                type: 'outward',
                quantity: Number(formData.quantity)
            };

            const res = await onAdd(payload);
            if (res && res.success) {
                alert('Material Deducted Successfully!');
                setFormData({ ...formData, quantity: '', usedFor: '', notes: '' });
            } else {
                alert('Failed to save: ' + (res?.message || 'Unknown Error'));
            }
        } catch (error) {
            console.error("Save error:", error);
            alert('Error saving material');
        }
    };

    return (
        <div className="card fade-in">
            <form onSubmit={handleSubmit}>
                <div className="form-grid">
                    <div className="form-group">
                        <label>Date</label>
                        <input type="date" required className="form-input" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Material Name</label>
                        <select required className="form-input" value={formData.materialName} onChange={e => setFormData({ ...formData, materialName: e.target.value })}>
                            <option value="">Select Material</option>
                            {availableStock.filter(s => s.quantity > 0).map(s => (
                                <option key={s.name} value={s.name}>{s.name} (Avail: {s.quantity} {s.unit})</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Quantity to Deduct</label>
                        <div className="input-group" style={{ display: 'flex', gap: '0.5rem' }}>
                            <input type="number" required min="0" className="form-input" style={{ flex: 1 }} value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} />
                            <div style={{ width: '150px' }}>
                                <SearchableSelect
                                    options={unitOptions}
                                    value={formData.unit}
                                    onChange={(val) => setFormData({ ...formData, unit: val })}
                                    placeholder="Select Unit"
                                    onAddNew={handleAddUnit}
                                    addNewLabel="Add New Unit"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Used For / Location</label>
                        <input type="text" placeholder="e.g. Slab Casting" className="form-input" value={formData.usedFor} onChange={e => setFormData({ ...formData, usedFor: e.target.value })} />
                    </div>
                </div>
                <button type="submit" className="btn btn-primary">Save Outward Entry</button>
            </form>
            <AddNewModal
                isOpen={addModal.isOpen}
                onClose={closeAddModal}
                onSave={handleSaveNewItem}
                title="Add New Unit"
                initialValue={addModal.value}
                label="Unit Name"
            />
        </div >
    );
};

const HistoryLog = ({ transactions, onDelete, onEdit, savedSuppliers, permission }) => {
    const [editingTransaction, setEditingTransaction] = useState(null);

    const viewImage = (img) => {
        const win = window.open("");
        win.document.write(`<img src="${img}" style="max-width:100%;" />`);
    };

    const handleEditClick = (t) => {
        setEditingTransaction(t);
    };

    const handleSaveEdit = (e) => {
        e.preventDefault();
        onEdit(editingTransaction);
        setEditingTransaction(null);
    };

    return (
        <div className="card fade-in table-container">
            <div className="flex justify-end mb-4">
                <button onClick={() => generateMaterialsCSV(transactions)} className="btn btn-outline btn-sm">
                    📊 Export Excel
                </button>
            </div>
            <table className="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Material</th>
                        <th>Qty</th>
                        <th>Details</th>
                        <th>Challan</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).map(t => (
                        <tr key={t._id || t.id}>
                            <td>{t.date}</td>
                            <td><span className={`badge ${t.type}`}>{t.type.toUpperCase()}</span></td>
                            <td>{t.materialName}</td>
                            <td>{t.quantity} {t.unit}</td>
                            <td>
                                {t.type === 'inward' ? (
                                    <span className="text-xs text-muted">Supplier: {t.supplier || '-'}</span>
                                ) : (
                                    <span className="text-xs text-muted">Used: {t.usedFor || '-'}</span>
                                )}
                            </td>
                            <td>
                                {t.challanImage ? (
                                    <button onClick={() => viewImage(t.challanImage)} className="text-primary text-xs underline">View</button>
                                ) : '-'}
                            </td>
                            <td>
                                {canEditDelete(permission, t.createdAt) && (
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEditClick(t)} className="btn-icon">✏️</button>
                                        <button onClick={() => { if (window.confirm('Delete?')) onDelete(t._id || t.id) }} className="btn-danger" style={{ padding: '4px 8px', fontSize: '0.8rem' }}>🗑️</button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                    {transactions.length === 0 && <tr><td colSpan="7" className="text-center py-4">No records found.</td></tr>}
                </tbody>
            </table>

            {/* Edit Modal */}
            {editingTransaction && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Edit Transaction</h3>
                            <button onClick={() => setEditingTransaction(null)} className="close-btn">×</button>
                        </div>
                        <form onSubmit={handleSaveEdit}>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Date</label>
                                    <input type="date" required className="form-input" value={editingTransaction.date} onChange={e => setEditingTransaction({ ...editingTransaction, date: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Material Name</label>
                                    <input type="text" className="form-input" value={editingTransaction.materialName} onChange={e => setEditingTransaction({ ...editingTransaction, materialName: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Quantity</label>
                                    <input type="number" required className="form-input" value={editingTransaction.quantity} onChange={e => setEditingTransaction({ ...editingTransaction, quantity: e.target.value })} />
                                </div>
                                {editingTransaction.type === 'inward' ? (
                                    <div className="form-group">
                                        <label>Supplier</label>
                                        <select className="form-input" value={editingTransaction.supplier} onChange={e => setEditingTransaction({ ...editingTransaction, supplier: e.target.value })}>
                                            <option value="">Select Supplier</option>
                                            {savedSuppliers.map(s => {
                                                const val = typeof s === 'object' && s !== null ? (s.companyName || s.name || '') : s;
                                                return <option key={val} value={val}>{val}</option>;
                                            })}
                                            <option value={editingTransaction.supplier}>{editingTransaction.supplier}</option>
                                        </select>
                                    </div>
                                ) : (
                                    <div className="form-group">
                                        <label>Used For</label>
                                        <input type="text" className="form-input" value={editingTransaction.usedFor} onChange={e => setEditingTransaction({ ...editingTransaction, usedFor: e.target.value })} />
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setEditingTransaction(null)} className="btn btn-outline">Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Materials;
