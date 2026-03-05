import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { api } from '../services/api';
import './Inventory.css';
import { checkPermission, canEnterData, canEditDelete } from '../utils/permissions';

const Inventory = () => {
    const { inventory, addFlat, updateFlat, deleteFlat, deleteFlats, currentUser } = useData();

    // Permission Logic
    const permission = checkPermission(currentUser, 'inventory');
    const canAdd = canEnterData(permission);
    const canEdit = canEditDelete(permission);

    if (permission === 'no_access') {
        return (
            <div className="inventory-container flex flex-col items-center justify-center py-20">
                <h2 className="text-xl text-red-600 font-bold mb-2">🚫 Access Denied</h2>
                <p className="text-gray-500">You do not have permission to view the Inventory module.</p>
            </div>
        );
    }

    // View Modes: 'setup', 'folders', 'flat-details'
    const [viewMode, setViewMode] = useState(inventory.length === 0 ? 'setup' : 'folders');

    // Navigation State
    const [currentPath, setCurrentPath] = useState([]); // ['Tower A', 'Floor 1']
    const [selectedFlat, setSelectedFlat] = useState(null);

    // Extra Work Form State
    const [showExtraWorkModal, setShowExtraWorkModal] = useState(false);
    const [newExtraWork, setNewExtraWork] = useState({ description: '', cost: '', proof: null });

    // Payment Form State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [newPayment, setNewPayment] = useState({ amount: '', date: new Date().toISOString().split('T')[0], mode: 'Cash' });
    const [editingWorkIndex, setEditingWorkIndex] = useState(null);

    // Setup Wizard State
    const [setupStep, setSetupStep] = useState(1);
    const [setupData, setSetupData] = useState({
        buildings: '', // "A, B, C"
        floorsPerBuilding: {}, // { A: 5, B: 5 }
        flatsPerFloor: {}, // { A: 4, B: 4 }
    });

    // Helper to get unique items for current level
    const currentItems = useMemo(() => {
        if (viewMode !== 'folders') return [];

        // Level 0: Buildings
        if (currentPath.length === 0) {
            const buildings = [...new Set(inventory.map(f => f.block))];
            return buildings.sort().map(b => ({ type: 'folder', name: b, label: `Tower ${b}` }));
        }

        // Level 1: Floors (inside a Building)
        if (currentPath.length === 1) {
            const building = currentPath[0];
            const floors = [...new Set(inventory.filter(f => f.block === building).map(f => f.floor))];
            return floors.sort((a, b) => Number(a) - Number(b)).map(f => ({ type: 'folder', name: f, label: `Floor ${f}` }));
        }

        // Level 2: Flats (inside a Floor)
        if (currentPath.length === 2) {
            const [building, floor] = currentPath;
            const flats = inventory.filter(f => f.block === building && f.floor == floor);
            return flats.sort((a, b) => a.flatNumber.localeCompare(b.flatNumber, undefined, { numeric: true })).map(f => ({ type: 'file', data: f }));
        }

        return [];
    }, [inventory, currentPath, viewMode]);

    // --- Setup Wizard Logic ---
    const handleSetupSubmit = () => {
        const buildings = setupData.buildings.split(',').map(b => b.trim()).filter(b => b);

        if (setupStep === 1) {
            if (buildings.length === 0) return alert('Please enter at least one building name');
            const initialFloors = {};
            const initialFlats = {};
            buildings.forEach(b => {
                initialFloors[b] = 5;
                initialFlats[b] = 4;
            });
            setSetupData(prev => ({ ...prev, floorsPerBuilding: initialFloors, flatsPerFloor: initialFlats }));
            setSetupStep(2);
            return;
        }

        if (setupStep === 2) {
            const newFlats = [];
            buildings.forEach(block => {
                const floors = Number(setupData.floorsPerBuilding[block]) || 0;
                const flatsCount = Number(setupData.flatsPerFloor[block]) || 0;

                for (let f = 1; f <= floors; f++) {
                    for (let n = 1; n <= flatsCount; n++) {
                        const flatNum = `${f}${String(n).padStart(2, '0')}`;
                        newFlats.push({
                            flatNumber: flatNum,
                            floor: String(f),
                            block: block,
                            type: '2BHK',
                            area: '',
                            rate: '',
                            status: 'Available',
                            buyerName: '',
                            buyerAddress: '',
                            buyerMobile: '',
                            totalAmount: 0,
                            paidAmount: 0,
                            extraWork: [],
                            documents: [],
                            paymentHistory: []
                        });
                    }
                }
            });

            newFlats.forEach(flat => addFlat(flat));
            setViewMode('folders');
            setSetupStep(1);
        }
    };

    // --- Navigation Logic ---
    const handleFolderClick = (item) => {
        if (item.type === 'folder') {
            setCurrentPath(prev => [...prev, item.name]);
        } else {
            // Helper to safe parse JSON fields
            const parseField = (field) => {
                if (Array.isArray(field)) return field;
                if (typeof field === 'string') {
                    try { return JSON.parse(field); } catch (e) { return []; }
                }
                return [];
            };

            const flatData = {
                ...item.data,
                paymentHistory: parseField(item.data.paymentHistory),
                extraWork: parseField(item.data.extraWork),
                documents: parseField(item.data.documents)
            };
            setSelectedFlat(flatData);
            setViewMode('flat-details');
        }
    };

    const handleBack = () => {
        if (viewMode === 'flat-details') {
            // Auto-save on back
            if (selectedFlat) {
                updateFlat(selectedFlat); // Save to context/backend
            }
            setViewMode('folders');
            setSelectedFlat(null);
        } else if (currentPath.length > 0) {
            setCurrentPath(prev => prev.slice(0, -1));
        }
    };

    const handleDeleteFolder = (e, item) => {
        e.stopPropagation();

        const password = window.prompt(`Enter password to delete ${item.label} and ALL its contents:`);
        if (password !== 'AlwaysCivilWise') {
            if (password !== null) alert('Incorrect Password!');
            return;
        }

        let flatsToDelete = [];

        // Level 0: Delete Building
        if (currentPath.length === 0) {
            const building = item.name;
            flatsToDelete = inventory.filter(f => f.block === building).map(f => f.id || f._id);
        }
        // Level 1: Delete Floor
        else if (currentPath.length === 1) {
            const building = currentPath[0];
            const floor = item.name;
            flatsToDelete = inventory.filter(f => f.block === building && f.floor === floor).map(f => f.id || f._id);
        }

        if (flatsToDelete.length > 0) {
            deleteFlats(flatsToDelete);
        }
    };

    // --- Flat Details Logic ---
    const handleSaveFlatDetails = (e) => {
        e.preventDefault();
        updateFlat(selectedFlat);
        alert('Flat details saved!');
    };

    const calculateTotalPaid = (flat) => {
        // If paymentHistory exists, sum it up. Otherwise fallback to legacy paidAmount.
        if (Array.isArray(flat.paymentHistory) && flat.paymentHistory.length > 0) {
            return flat.paymentHistory.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        }
        return Number(flat.paidAmount) || 0;
    };

    const calculatePending = (flat) => {
        let total = Number(flat.totalAmount) || 0;
        if (total === 0 && flat.area && flat.rate) {
            total = Number(flat.area) * Number(flat.rate);
        }
        const paid = calculateTotalPaid(flat);
        const extra = (flat.extraWork || []).reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
        return total + extra - paid;
    };

    const handleFileUpload = async (e, type, index = null) => {
        const file = e.target.files[0];
        if (!file) return;

        // Create FormData for upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('siteId', selectedFlat.siteId || currentUser.siteId || 1);
        formData.append('name', file.name);
        formData.append('type', 'Inventory Proof');
        formData.append('category', 'inventory_proof');

        try {
            const uploadedDoc = await api.uploadDocument(currentUser.token, formData);

            if (!uploadedDoc || !uploadedDoc.url) {
                alert('Upload failed');
                return;
            }

            const fileData = {
                name: file.name,
                url: uploadedDoc.url,
                date: new Date().toLocaleDateString()
            };

            if (type === 'document') {
                setSelectedFlat(prev => ({
                    ...prev,
                    documents: [...(prev.documents || []), fileData]
                }));
            } else if (type === 'extraWorkProof' && index !== null) {
                const updatedExtraWork = [...selectedFlat.extraWork];
                updatedExtraWork[index].proof = fileData;
                setSelectedFlat(prev => ({ ...prev, extraWork: updatedExtraWork }));
            } else if (type === 'newExtraWorkProof') {
                setNewExtraWork(prev => ({ ...prev, proof: fileData }));
            }
        } catch (error) {
            console.error("Upload error:", error);
            alert("Failed to upload file");
        }
    };

    const handleSaveExtraWork = () => {
        if (!newExtraWork.description || !newExtraWork.cost) {
            alert('Please enter description and cost');
            return;
        }

        setSelectedFlat(prev => {
            const updatedWork = [...(prev.extraWork || [])];

            if (editingWorkIndex !== null) {
                const original = updatedWork[editingWorkIndex];
                const workItem = {
                    description: newExtraWork.description,
                    cost: Number(newExtraWork.cost),
                    proof: newExtraWork.proof,
                    createdAt: original.createdAt || new Date().toISOString()
                };
                updatedWork[editingWorkIndex] = workItem;
            } else {
                const workItem = {
                    description: newExtraWork.description,
                    cost: Number(newExtraWork.cost),
                    proof: newExtraWork.proof,
                    createdAt: new Date().toISOString()
                };
                updatedWork.push(workItem);
            }

            return { ...prev, extraWork: updatedWork };
        });

        setNewExtraWork({ description: '', cost: '', proof: null });
        setEditingWorkIndex(null);
        setShowExtraWorkModal(false);
    };

    const handleEditWork = (index) => {
        const work = selectedFlat.extraWork[index];
        setNewExtraWork({
            description: work.description,
            cost: work.cost,
            proof: work.proof
        });
        setEditingWorkIndex(index);
        setShowExtraWorkModal(true);
    };

    const handleDeleteWork = (index) => {
        if (window.confirm('Are you sure you want to delete this extra work item?')) {
            setSelectedFlat(prev => {
                const updatedWork = [...(prev.extraWork || [])];
                updatedWork.splice(index, 1);
                return { ...prev, extraWork: updatedWork };
            });
        }
    };

    const handleAddPayment = () => {
        if (!newPayment.amount || !newPayment.date) {
            alert('Please enter amount and date');
            return;
        }

        const paymentEntry = {
            id: Date.now(),
            amount: Number(newPayment.amount),
            date: newPayment.date,
            mode: newPayment.mode
        };

        setSelectedFlat(prev => {
            const updatedHistory = [...(prev.paymentHistory || []), paymentEntry];
            // Also update the legacy paidAmount field for backward compatibility if needed, 
            // but primarily we rely on history now.
            const newTotalPaid = updatedHistory.reduce((sum, p) => sum + p.amount, 0);
            return {
                ...prev,
                paymentHistory: updatedHistory,
                paidAmount: newTotalPaid
            };
        });

        setNewPayment({ amount: '', date: new Date().toISOString().split('T')[0], mode: 'Cash' });
        setShowPaymentModal(false);
    };

    // --- Render ---
    return (
        <div className="inventory-container">

            {/* Header */}
            <div className="inventory-header">
                <div className="inventory-title">
                    {(viewMode === 'flat-details' || (viewMode === 'folders' && currentPath.length > 0)) && (
                        <button onClick={handleBack} className="back-button" title="Go Back">
                            ⬅️
                        </button>
                    )}
                    <span>
                        {viewMode === 'setup' ? 'Project Setup' :
                            viewMode === 'flat-details' ? `Flat ${selectedFlat?.block}-${selectedFlat?.flatNumber}` :
                                currentPath.length === 0 ? 'Inventory Overview' :
                                    currentPath.join(' > ')}
                    </span>
                </div>

                {viewMode === 'folders' && canAdd && (
                    <button onClick={() => setViewMode('setup')} className="setup-button">
                        ⚙️ New Setup
                    </button>
                )}
            </div>

            {/* Setup Wizard */}
            {viewMode === 'setup' && (
                <div className="setup-wizard">
                    <h3 className="wizard-step-title">
                        {setupStep === 1 ? 'Step 1: Define Buildings' : 'Step 2: Configure Floors & Flats'}
                    </h3>

                    {setupStep === 1 ? (
                        <div>
                            <div className="wizard-input-group">
                                <label className="wizard-label">Enter Building Names (comma separated)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. A, B, C or Tower 1, Tower 2"
                                    className="wizard-input"
                                    value={setupData.buildings}
                                    onChange={e => setSetupData({ ...setupData, buildings: e.target.value })}
                                />
                                <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>We will create folders for each building.</p>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {setupData.buildings.split(',').map(b => b.trim()).filter(b => b).map(block => (
                                <div key={block} className="building-config-card">
                                    <h4 className="building-title">🏢 Tower {block}</h4>
                                    <div className="config-grid">
                                        <div>
                                            <label className="wizard-label">Total Floors</label>
                                            <input
                                                type="number"
                                                className="wizard-input"
                                                value={setupData.floorsPerBuilding[block]}
                                                onChange={e => setSetupData({
                                                    ...setupData,
                                                    floorsPerBuilding: { ...setupData.floorsPerBuilding, [block]: e.target.value }
                                                })}
                                            />
                                        </div>
                                        <div>
                                            <label className="wizard-label">Flats per Floor</label>
                                            <input
                                                type="number"
                                                className="wizard-input"
                                                value={setupData.flatsPerFloor[block]}
                                                onChange={e => setSetupData({
                                                    ...setupData,
                                                    flatsPerFloor: { ...setupData.flatsPerFloor, [block]: e.target.value }
                                                })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="wizard-actions">
                        {setupStep === 2 && (
                            <button onClick={() => setSetupStep(1)} className="btn-secondary">
                                Back
                            </button>
                        )}
                        <button onClick={handleSetupSubmit} className="btn-primary">
                            {setupStep === 1 ? 'Next' : 'Generate Inventory'}
                        </button>
                    </div>
                </div>
            )}

            {/* Folder View */}
            {viewMode === 'folders' && (
                <div className="folder-grid">
                    {currentItems.map((item, idx) => (
                        <div
                            key={idx}
                            onClick={() => handleFolderClick(item)}
                            className={`folder-item ${item.type === 'file' ?
                                (item.data.status === 'Sold' ? 'status-sold' :
                                    item.data.status === 'Booked' ? 'status-booked' : 'status-available') : ''}`}
                        >
                            <div className="folder-icon">
                                {item.type === 'folder' ? '📁' : '🏠'}
                            </div>
                            <div className="folder-name">
                                {item.type === 'folder' ? item.label : item.data.flatNumber}
                            </div>
                            {item.type === 'file' && (
                                <div className="status-badge">
                                    {item.data.status}
                                </div>
                            )}
                            {item.type === 'folder' && canEdit && (
                                <button
                                    className="delete-folder-btn"
                                    onClick={(e) => handleDeleteFolder(e, item)}
                                    title="Delete Folder"
                                >
                                    🗑️
                                </button>
                            )}
                        </div>
                    ))}
                    {currentItems.length === 0 && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                            No items found. Try running the setup again.
                        </div>
                    )}
                </div>
            )}

            {/* Flat Details View */}
            {viewMode === 'flat-details' && selectedFlat && (
                <div className="flat-details-container">
                    <div className="flat-header">
                        <h3 className="flat-title">Flat Details: {selectedFlat.flatNumber}</h3>
                        <span className={`status-badge ${selectedFlat.status === 'Available' ? 'status-available' :
                            selectedFlat.status === 'Sold' ? 'status-sold' : 'status-booked'
                            }`} style={{ fontSize: '14px', padding: '6px 12px' }}>
                            {selectedFlat.status}
                        </span>
                    </div>

                    <form onSubmit={handleSaveFlatDetails} className="form-section">
                        {/* Basic Info */}
                        <div className="section-title">
                            Basic Information
                            {selectedFlat.enteredBy && <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#6b7280', marginLeft: '10px' }}>(Entered by: {selectedFlat.enteredBy}{selectedFlat.editedBy ? `, Edited by: ${selectedFlat.editedBy}` : ''})</span>}
                        </div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Type</label>
                                <select
                                    value={selectedFlat.type}
                                    onChange={e => setSelectedFlat({ ...selectedFlat, type: e.target.value })}
                                >
                                    <option>1BHK</option>
                                    <option>2BHK</option>
                                    <option>3BHK</option>
                                    <option>Penthouse</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Area (sq ft)</label>
                                <input
                                    type="number"
                                    value={selectedFlat.area}
                                    onChange={e => {
                                        const newArea = e.target.value;
                                        const newTotal = Number(newArea) * Number(selectedFlat.rate || 0);
                                        setSelectedFlat({
                                            ...selectedFlat,
                                            area: newArea,
                                            totalAmount: newTotal
                                        });
                                    }}
                                />
                            </div>
                            <div className="form-group">
                                <label>Rate (per sq ft)</label>
                                <input
                                    type="number"
                                    value={selectedFlat.rate}
                                    onChange={e => {
                                        const newRate = e.target.value;
                                        const newTotal = Number(selectedFlat.area || 0) * Number(newRate);
                                        setSelectedFlat({
                                            ...selectedFlat,
                                            rate: newRate,
                                            totalAmount: newTotal
                                        });
                                    }}
                                />
                            </div>
                            <div className="form-group">
                                <label>Status</label>
                                <select
                                    value={selectedFlat.status}
                                    onChange={e => setSelectedFlat({ ...selectedFlat, status: e.target.value })}
                                >
                                    <option>Available</option>
                                    <option>Booked</option>
                                    <option>Sold</option>
                                </select>
                            </div>
                        </div>

                        {/* Buyer & Payment Section */}
                        {(selectedFlat.status === 'Sold' || selectedFlat.status === 'Booked') && (
                            <div className="buyer-section">
                                <div className="section-title">
                                    {selectedFlat.status === 'Booked' ? '👤 Booking Details' : '👤 Buyer & Sales Details'}
                                </div>

                                <div className="form-grid" style={{ gridTemplateColumns: selectedFlat.status === 'Booked' ? '1fr 1fr' : '2fr 1fr 1fr' }}>
                                    <div className="form-group">
                                        <label>Buyer Name</label>
                                        <input
                                            type="text"
                                            value={selectedFlat.buyerName}
                                            onChange={e => setSelectedFlat({ ...selectedFlat, buyerName: e.target.value })}
                                            placeholder="Enter buyer name"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Mobile</label>
                                        <input
                                            type="text"
                                            value={selectedFlat.buyerMobile}
                                            onChange={e => setSelectedFlat({ ...selectedFlat, buyerMobile: e.target.value })}
                                            placeholder="Enter mobile number"
                                        />
                                    </div>
                                    {selectedFlat.status === 'Sold' && (
                                        <div className="form-group">
                                            <label>Address</label>
                                            <input
                                                type="text"
                                                value={selectedFlat.buyerAddress}
                                                onChange={e => setSelectedFlat({ ...selectedFlat, buyerAddress: e.target.value })}
                                                placeholder="Enter full address"
                                            />
                                        </div>
                                    )}
                                </div>

                                {selectedFlat.status === 'Sold' && (
                                    <>
                                        {/* Documents Section */}
                                        <div style={{ marginBottom: '24px' }}>
                                            <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px', color: '#64748b' }}>Documents</label>
                                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                <input
                                                    type="file"
                                                    id="doc-upload"
                                                    style={{ display: 'none' }}
                                                    onChange={(e) => handleFileUpload(e, 'document')}
                                                />
                                                <label htmlFor="doc-upload" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    📎 Upload Document
                                                </label>
                                                {(selectedFlat.documents || []).map((doc, idx) => (
                                                    <div key={idx} style={{ background: 'white', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        📄 {doc.name}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="payment-card">
                                            <div className="payment-summary">
                                                <div className="amount-box total">
                                                    <div className="amount-label">Total Deal Value</div>
                                                    <div className="amount-value">₹{Number(selectedFlat.totalAmount || (Number(selectedFlat.area) * Number(selectedFlat.rate)) || 0).toLocaleString()}</div>
                                                </div>
                                                <div className="amount-box paid">
                                                    <div className="amount-label">Amount Paid</div>
                                                    <div className="amount-value">₹{calculateTotalPaid(selectedFlat).toLocaleString()}</div>
                                                </div>
                                                <div className="amount-box pending">
                                                    <div className="amount-label">Pending Amount</div>
                                                    <div className="amount-value">₹{calculatePending(selectedFlat).toLocaleString()}</div>
                                                </div>
                                            </div>

                                            <div style={{ marginTop: '24px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                    <label style={{ fontWeight: '600', color: '#374151' }}>Payment History</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPaymentModal(true)}
                                                        className="add-item-btn"
                                                    >
                                                        + Add Payment
                                                    </button>
                                                </div>

                                                <div className="payment-history-list" style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: '#f9fafb', padding: '10px 16px', fontSize: '13px', fontWeight: '600', color: '#4b5563' }}>
                                                        <div>Date</div>
                                                        <div>Mode</div>
                                                        <div style={{ textAlign: 'right' }}>Amount</div>
                                                    </div>
                                                    {(selectedFlat.paymentHistory || []).length > 0 ? (
                                                        (selectedFlat.paymentHistory || []).map((payment, idx) => (
                                                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '10px 16px', borderTop: '1px solid #e5e7eb', fontSize: '14px' }}>
                                                                <div>{payment.date}</div>
                                                                <div>{payment.mode}</div>
                                                                <div style={{ textAlign: 'right', fontWeight: '500' }}>₹{payment.amount.toLocaleString()}</div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                                                            No payments recorded yet.
                                                        </div>
                                                    )}
                                                </div>

                                                <div style={{ marginTop: '16px' }}>
                                                    <label style={{ fontSize: '14px', color: '#4b5563' }}>Update Total Deal Value</label>
                                                    <input
                                                        type="number"
                                                        className="wizard-input"
                                                        style={{ marginTop: '4px' }}
                                                        value={selectedFlat.totalAmount}
                                                        onChange={e => setSelectedFlat({ ...selectedFlat, totalAmount: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            {/* Extra Work */}
                                            <div style={{ marginTop: '24px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                    <label style={{ fontWeight: '600', color: '#374151' }}>Extra Work / Changes</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setNewExtraWork({ description: '', cost: '', proof: null });
                                                            setEditingWorkIndex(null);
                                                            setShowExtraWorkModal(true);
                                                        }}
                                                        className="add-item-btn"
                                                    >
                                                        + Add Item
                                                    </button>
                                                </div>
                                                <div className="extra-work-list">
                                                    {(selectedFlat.extraWork || []).map((work, idx) => (
                                                        <div key={idx} className="extra-work-item" style={{ flexDirection: 'column', gap: '8px', position: 'relative' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                                <div>
                                                                    <div style={{ fontWeight: '500' }}>{work.description}</div>
                                                                    <div style={{ fontWeight: '600' }}>₹{Number(work.cost).toLocaleString()}</div>
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                                    {canEditDelete(permission, work.createdAt) && <button type="button" onClick={() => handleEditWork(idx)} style={{ fontSize: '16px', background: 'none', border: 'none', cursor: 'pointer' }} title="Edit">✏️</button>}
                                                                    {canEditDelete(permission, work.createdAt) && <button type="button" onClick={() => handleDeleteWork(idx)} style={{ fontSize: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'red' }} title="Delete">🗑️</button>}
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
                                                                {work.proof ? (
                                                                    <span style={{ color: '#166534' }}>
                                                                        ✓ Proof: <a
                                                                            href={work.proof.url.startsWith('http') ? work.proof.url : `${import.meta.env.VITE_API_URL}${work.proof.url}`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            style={{ color: '#2563eb', textDecoration: 'underline' }}
                                                                        >
                                                                            {work.proof.name}
                                                                        </a>
                                                                    </span>
                                                                ) : (
                                                                    <span style={{ color: '#991b1b' }}>No Proof</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {(selectedFlat.extraWork || []).length === 0 && (
                                                        <p style={{ color: '#9ca3af', fontSize: '14px', fontStyle: 'italic' }}>No extra work added.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        <div className="wizard-actions">
                            <button
                                type="button"
                                onClick={() => setViewMode('folders')}
                                className="btn-secondary"
                            >
                                Cancel
                            </button>
                            {canAdd && (
                                <button
                                    type="submit"
                                    className="btn-primary"
                                >
                                    Save Changes
                                </button>
                            )}
                        </div>
                    </form>

                    {/* Extra Work Modal */}
                    {showExtraWorkModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div className="bg-white p-6 rounded-lg shadow-xl w-96" style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '400px' }}>
                                <h3 className="text-lg font-bold mb-4" style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
                                    {editingWorkIndex !== null ? 'Edit Extra Work' : 'Add Extra Work'}
                                </h3>

                                <div className="mb-4" style={{ marginBottom: '16px' }}>
                                    <label className="block text-sm font-medium mb-1" style={{ display: 'block', marginBottom: '4px' }}>Description</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded"
                                        style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                                        value={newExtraWork.description}
                                        onChange={e => setNewExtraWork({ ...newExtraWork, description: e.target.value })}
                                        placeholder="e.g. False Ceiling"
                                    />
                                </div>

                                <div className="mb-4" style={{ marginBottom: '16px' }}>
                                    <label className="block text-sm font-medium mb-1" style={{ display: 'block', marginBottom: '4px' }}>Cost</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 border rounded"
                                        style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                                        value={newExtraWork.cost}
                                        onChange={e => setNewExtraWork({ ...newExtraWork, cost: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>

                                <div className="mb-6" style={{ marginBottom: '24px' }}>
                                    <label className="block text-sm font-medium mb-1" style={{ display: 'block', marginBottom: '4px' }}>Proof (Optional)</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="file"
                                            id="new-work-proof"
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                            onChange={(e) => handleFileUpload(e, 'newExtraWorkProof')}
                                        />
                                        <label htmlFor="new-work-proof" className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}>
                                            Upload Image Proof
                                        </label>
                                        {newExtraWork.proof && (
                                            <a
                                                href={newExtraWork.proof.url.startsWith('http') ? newExtraWork.proof.url : `${import.meta.env.VITE_API_URL}${newExtraWork.proof.url}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ fontSize: '12px', color: '#2563eb', textDecoration: 'underline' }}
                                            >
                                                {newExtraWork.proof.name}
                                            </a>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                    <button
                                        onClick={() => setShowExtraWorkModal(false)}
                                        className="btn-secondary"
                                        style={{ padding: '8px 16px' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveExtraWork}
                                        className="btn-primary"
                                        style={{ padding: '8px 16px' }}
                                    >
                                        {editingWorkIndex !== null ? 'Update Item' : 'Add Item'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Payment Modal */}
                    {showPaymentModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div className="bg-white p-6 rounded-lg shadow-xl w-96" style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '400px' }}>
                                <h3 className="text-lg font-bold mb-4" style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Add Payment</h3>

                                <div className="mb-4" style={{ marginBottom: '16px' }}>
                                    <label className="block text-sm font-medium mb-1" style={{ display: 'block', marginBottom: '4px' }}>Amount</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 border rounded"
                                        style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                                        value={newPayment.amount}
                                        onChange={e => setNewPayment({ ...newPayment, amount: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>

                                <div className="mb-4" style={{ marginBottom: '16px' }}>
                                    <label className="block text-sm font-medium mb-1" style={{ display: 'block', marginBottom: '4px' }}>Date</label>
                                    <input
                                        type="date"
                                        className="w-full p-2 border rounded"
                                        style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                                        value={newPayment.date}
                                        onChange={e => setNewPayment({ ...newPayment, date: e.target.value })}
                                    />
                                </div>

                                <div className="mb-6" style={{ marginBottom: '24px' }}>
                                    <label className="block text-sm font-medium mb-1" style={{ display: 'block', marginBottom: '4px' }}>Mode</label>
                                    <select
                                        className="w-full p-2 border rounded"
                                        style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                                        value={newPayment.mode}
                                        onChange={e => setNewPayment({ ...newPayment, mode: e.target.value })}
                                    >
                                        <option>Cash</option>
                                        <option>Cheque</option>
                                        <option>UPI</option>
                                        <option>Bank Transfer</option>
                                    </select>
                                </div>

                                <div className="flex justify-end gap-2" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                    <button
                                        onClick={() => setShowPaymentModal(false)}
                                        className="btn-secondary"
                                        style={{ padding: '8px 16px' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddPayment}
                                        className="btn-primary"
                                        style={{ padding: '8px 16px' }}
                                    >
                                        Add Payment
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Inventory;
