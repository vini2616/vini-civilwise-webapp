import React, { useState, useEffect } from 'react';
import { generateManpowerPaymentsCSV, generateManpowerSummaryCSV } from '../utils/exportUtils';
import { checkPermission, canEnterData, canEditDelete } from '../utils/permissions';
import { useData } from '../context/DataContext';
import SearchableSelect from './SearchableSelect';

const ManPower = ({ currentUser }) => {
    const {
        savedTrades, savedContractors, contacts,
        manpowerList, manpowerAttendance, manpowerPayments,
        addManpower, updateManpower, deleteManpower,
        saveAttendance,
        addManpowerPayment, deleteManpowerPayment,
        addSavedTrade, addSavedContractor
    } = useData();

    const permission = checkPermission(currentUser, 'man-power');
    const isAdmin = permission === 'full_control';
    const canEdit = canEnterData(permission);
    const canDelete = canEditDelete(permission);
    const canModify = canEditDelete(permission);

    if (permission === 'no_access') {
        return (
            <div className="manpower-container text-center py-8">
                <h2 className="text-xl text-red-600">🚫 Access Denied</h2>
                <p className="text-muted">You do not have permission to view this module.</p>
            </div>
        );
    }

    const [activeTab, setActiveTab] = useState('resources');

    // UI States
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // Form States
    const [formData, setFormData] = useState({
        name: '',
        type: 'Skilled',
        trade: '',
        rate: '',
        contractor: ''
    });

    const [paymentForm, setPaymentForm] = useState({
        manpowerId: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        note: ''
    });

    // --- Resource Management Functions ---
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Frontend Validation
        if (!formData.name || !formData.trade || !formData.rate) {
            alert("Please fill in all required fields: Name, Trade, and Rate.");
            return;
        }

        let result;
        if (editingItem) {
            result = await updateManpower({ ...formData, id: editingItem._id || editingItem.id });
        } else {
            result = await addManpower(formData);
        }

        if (result && result.success) {
            closeModal();
        } else {
            alert(`Failed to save: ${result?.message || 'Unknown Error'}`);
        }
    };

    const openAddModal = () => {
        setEditingItem(null);
        setFormData({ name: '', type: 'Skilled', trade: '', rate: '', contractor: '' });
        setShowModal(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setFormData(item);
        setShowModal(true);
    };

    const deleteItem = async (id) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            await deleteManpower(id);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingItem(null);
    };

    // --- Attendance Functions ---
    // --- Attendance Functions ---
    const getAttendanceStatus = (id, date) => {
        const dailyDoc = manpowerAttendance.find(d => d.date === date);
        let records = [];
        if (dailyDoc && dailyDoc.records) {
            if (Array.isArray(dailyDoc.records)) records = dailyDoc.records;
            else if (typeof dailyDoc.records === 'string') {
                try { records = JSON.parse(dailyDoc.records); } catch (e) { records = []; }
            }
        }
        const record = records.find(r => (r.manpowerId === id || (r.manpowerId && r.manpowerId._id === id)));
        return record ? record : { status: '', overtime: 0 };
    };

    const updateAttendance = async (id, field, value) => {
        const dailyDoc = manpowerAttendance.find(d => d.date === selectedDate);
        let records = [];
        if (dailyDoc && dailyDoc.records) {
            if (Array.isArray(dailyDoc.records)) records = [...dailyDoc.records];
            else if (typeof dailyDoc.records === 'string') {
                try { records = JSON.parse(dailyDoc.records); } catch (e) { records = []; }
            }
        }

        const workerIndex = records.findIndex(r => (r.manpowerId === id || (r.manpowerId && r.manpowerId._id === id)));
        if (workerIndex >= 0) {
            records[workerIndex] = { ...records[workerIndex], [field]: value };
        } else {
            records.push({
                manpowerId: id,
                status: field === 'status' ? value : '',
                overtime: field === 'overtime' ? value : 0
            });
        }

        await saveAttendance(selectedDate, records);
    };

    // --- Payment Functions ---
    // --- Payment Functions ---
    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        await addManpowerPayment(paymentForm);
        setPaymentForm({ ...paymentForm, amount: '', note: '' });
        alert('Payment Recorded!');
    };

    const deletePayment = async (id) => {
        if (window.confirm('Delete this payment?')) {
            await deleteManpowerPayment(id);
        }
    };

    // --- Summary Calculations ---
    // --- Summary Calculations ---
    const getSummary = (id) => {
        const person = manpowerList.find(p => (p.id || p._id) === id);
        const rate = Number(person?.rate) || 0;

        // Flatten attendance from daily docs to records for this person
        let myAttendance = [];
        manpowerAttendance.forEach(day => {
            let records = day.records;
            if (typeof records === 'string') {
                try { records = JSON.parse(records); } catch (e) { records = []; }
            }
            if (records && Array.isArray(records)) {
                const rec = records.find(r => r.manpowerId === id || (r.manpowerId && r.manpowerId._id === id));
                if (rec) myAttendance.push(rec);
            }
        });


        const daysWorked = myAttendance.reduce((sum, a) => {
            if (a.status === 'P') return sum + 1;
            if (a.status === 'HD') return sum + 0.5;
            return sum;
        }, 0);

        const totalOT = myAttendance.reduce((sum, a) => sum + (Number(a.overtime) || 0), 0);
        // Assuming OT rate is hourly, calculated as (Daily Rate / 8) * OT Hours
        const hourlyRate = rate / 8;
        const otAmount = totalOT * hourlyRate;

        const totalEarnings = (daysWorked * rate) + otAmount;

        const myPayments = manpowerPayments.filter(p => p.manpowerId == id);
        const totalPaid = myPayments.reduce((sum, p) => sum + Number(p.amount), 0);

        return { daysWorked, totalOT, totalEarnings, totalPaid, balance: totalEarnings - totalPaid };
    };

    return (
        <div className="manpower-container">
            <div className="page-header">
                <h2>Man-power Management</h2>
                <div className="tabs">
                    <button className={`tab-btn ${activeTab === 'resources' ? 'active' : ''}`} onClick={() => setActiveTab('resources')}>👥 Resources</button>
                    <button className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>📅 Attendance</button>
                    <button className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}>💰 Payments</button>
                    <button className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>📊 Summary</button>
                </div>
            </div>

            {/* --- RESOURCES TAB --- */}
            {activeTab === 'resources' && (
                <>
                    <div className="flex justify-end mb-4">
                        {canEdit && <button onClick={openAddModal} className="btn btn-primary">+ Add Resource</button>}
                    </div>
                    <div className="card table-card">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Trade</th>
                                    <th>Rate (₹)</th>
                                    <th>Contractor</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {manpowerList.map(item => (
                                    <tr key={item.id || item._id}>
                                        <td>
                                            <div className="font-medium">{item.name}</div>
                                            {item.enteredBy && <div className="text-xs text-muted">Created by: {item.enteredBy}</div>}
                                            {item.editedBy && <div className="text-xs text-muted">Edited by: {item.editedBy}</div>}
                                        </td>
                                        <td><span className={`badge ${item.type.toLowerCase()}`}>{item.type}</span></td>
                                        <td>{item.trade}</td>
                                        <td>₹{item.rate}</td>
                                        <td>{item.contractor || '-'}</td>
                                        <td>
                                            <div className="actions">
                                                {canModify && <button onClick={() => openEditModal(item)} className="btn-icon">✏️</button>}
                                                {canDelete && <button onClick={() => deleteItem(item.id || item._id)} className="btn-icon text-danger">🗑️</button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* --- ATTENDANCE TAB --- */}
            {activeTab === 'attendance' && (
                <div className="attendance-view">
                    <div className="date-selector-card">
                        <div className="date-selector-wrapper">
                            <label>📅 Select Date</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="premium-date-input"
                                disabled={permission === 'data_entry'}
                                title={permission === 'data_entry' ? "Data Entry user cannot change date" : "Select Date"}
                            />
                        </div>
                        <div className="attendance-stats">
                            <div className="stat-item">
                                <span className="stat-label">Total</span>
                                <span className="stat-value">{manpowerList.length}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Present</span>
                                <span className="stat-value text-success">
                                    {manpowerList.filter(m => getAttendanceStatus(m.id, selectedDate).status === 'P').length}
                                </span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Absent</span>
                                <span className="stat-value text-danger">
                                    {manpowerList.filter(m => getAttendanceStatus(m.id, selectedDate).status === 'A').length}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="workers-grid">
                        {manpowerList.map(item => {
                            const record = getAttendanceStatus(item.id || item._id, selectedDate);
                            return (
                                <div key={item.id || item._id} className={`worker-card ${record.status ? 'status-' + record.status.toLowerCase() : ''}`}>
                                    <div className="worker-info">
                                        <div className="worker-avatar">{item.name.charAt(0)}</div>
                                        <div>
                                            <div className="worker-name">{item.name}</div>
                                            <div className="worker-trade">{item.trade}</div>
                                        </div>
                                    </div>

                                    <div className="attendance-controls">
                                        <div className="status-selector">
                                            <button
                                                className={`status-chip ${record.status === 'P' ? 'active present' : ''}`}
                                                onClick={() => canEdit && updateAttendance(item.id || item._id, 'status', 'P')}
                                                disabled={!canEdit}
                                            >Present</button>
                                            <button
                                                className={`status-chip ${record.status === 'HD' ? 'active halfday' : ''}`}
                                                onClick={() => canEdit && updateAttendance(item.id || item._id, 'status', 'HD')}
                                                disabled={!canEdit}
                                            >Half Day</button>
                                            <button
                                                className={`status-chip ${record.status === 'A' ? 'active absent' : ''}`}
                                                onClick={() => canEdit && updateAttendance(item.id || item._id, 'status', 'A')}
                                                disabled={!canEdit}
                                            >Absent</button>
                                        </div>

                                        <div className="ot-control">
                                            <label>Overtime</label>
                                            <div className="ot-input-wrapper">
                                                <input
                                                    type="number"
                                                    value={record.overtime}
                                                    onChange={(e) => canEdit && updateAttendance(item.id || item._id, 'overtime', e.target.value)}
                                                    placeholder="0"
                                                    disabled={!canEdit}
                                                />
                                                <span>Hrs</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* --- PAYMENTS TAB --- */}
            {activeTab === 'payments' && (
                <div className="grid grid-cols-2 gap-6" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div className="card">
                        <h3 className="mb-4 font-bold">Record Payment</h3>
                        {canEdit ? (
                            <form onSubmit={handlePaymentSubmit} className="premium-form">
                                <div className="form-group">
                                    <label>Select Person</label>
                                    <select
                                        className="form-input"
                                        value={paymentForm.manpowerId}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, manpowerId: e.target.value })}
                                        required
                                    >
                                        <option value="">-- Select --</option>
                                        <option value="">-- Select --</option>
                                        {manpowerList.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name} ({p.trade})</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Amount (₹)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={paymentForm.amount}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={paymentForm.date}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Note</label>
                                    <input
                                        className="form-input"
                                        value={paymentForm.note}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                                        placeholder="Advance / Settlement"
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary w-full">Record Payment</button>
                            </form>
                        ) : (
                            <div className="text-muted text-center py-8">
                                You do not have permission to record payments.
                            </div>
                        )}
                    </div>
                    <div className="card">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold">Recent Payments</h3>
                            <button onClick={() => generateManpowerPaymentsCSV(manpowerList, manpowerPayments)} className="btn btn-outline btn-sm">
                                📥 Export Excel
                            </button>
                        </div>
                        <div className="payment-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {manpowerPayments.sort((a, b) => new Date(b.date) - new Date(a.date)).map(p => {
                                const person = manpowerList.find(m => (m.id || m._id) == p.manpowerId);
                                return (
                                    <div key={p.id || p._id} className="payment-item p-3 border-b flex justify-between items-center">
                                        <div>
                                            <div className="font-bold">{person?.name || 'Unknown'}</div>
                                            <div className="text-sm text-muted">{p.date} • {p.note}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-success font-bold">₹{p.amount}</div>
                                            {canEditDelete(permission, p.createdAt) && <button onClick={() => deletePayment(p.id || p._id)} className="btn-icon text-danger" title="Delete Payment">🗑️</button>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* --- SUMMARY TAB --- */}
            {activeTab === 'summary' && (
                <div className="card table-card">
                    <div className="flex justify-end mb-4 p-4 pb-0">
                        <button onClick={() => generateManpowerSummaryCSV(manpowerList, manpowerAttendance, manpowerPayments)} className="btn btn-outline btn-sm">
                            📥 Export Excel
                        </button>
                    </div>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Days Worked</th>
                                <th>Total OT (Hrs)</th>
                                <th>Total Earnings</th>
                                <th>Total Paid</th>
                                <th>Remaining Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {manpowerList.map(item => {
                                const summary = getSummary(item.id || item._id);
                                return (
                                    <tr key={item.id || item._id}>
                                        <td>{item.name}</td>
                                        <td>{summary.daysWorked}</td>
                                        <td>{summary.totalOT}</td>
                                        <td className="font-bold">₹{summary.totalEarnings.toFixed(0)}</td>
                                        <td className="text-success">₹{summary.totalPaid}</td>
                                        <td>
                                            <span className={`font-bold ${summary.balance > 0 ? 'text-danger' : 'text-success'}`}>
                                                ₹{summary.balance.toFixed(0)}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* --- MODAL (Same as before) --- */}
            {showModal && (
                <div className="popup-overlay">
                    <div className="popup-content modal premium-modal" style={{ maxWidth: '1000px', width: '90vw' }}>
                        <div className="popup-header">
                            <div className="header-title">
                                <span className="header-icon">{editingItem ? '✏️' : '👷'}</span>
                                <h3>{editingItem ? 'Edit Resource' : 'Add New Resource'}</h3>
                            </div>
                            <button onClick={closeModal} className="close-btn">×</button>
                        </div>
                        <form onSubmit={handleSubmit} className="premium-form">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Name / Description</label>
                                    <div className="input-wrapper">
                                        <span className="input-icon">👤</span>
                                        <input required name="name" value={formData.name} onChange={handleInputChange} className="form-input with-icon" placeholder="Name" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Type</label>
                                    <div className="input-wrapper">
                                        <span className="input-icon">🛠️</span>
                                        <select name="type" value={formData.type} onChange={handleInputChange} className="form-input with-icon">
                                            <option>Skilled</option>
                                            <option>Unskilled</option>
                                            <option>Semi-Skilled</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Trade</label>
                                    <div className="input-wrapper">
                                        <span className="input-icon">🏗️</span>
                                        <SearchableSelect
                                            options={(savedTrades || []).map(t => {
                                                const label = typeof t === 'object' && t !== null ? (t.name || t.trade || '') : String(t || '');
                                                return { label, value: label };
                                            })}
                                            onAddNew={(val) => {
                                                addSavedTrade(val);
                                                setFormData({ ...formData, trade: val });
                                            }}
                                            value={formData.trade}
                                            onChange={(val) => setFormData({ ...formData, trade: val })}
                                            placeholder="Select Trade"
                                            addNewLabel="Add Trade"
                                            className="form-input with-icon"
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Daily Rate (₹)</label>
                                    <div className="input-wrapper">
                                        <span className="input-icon">💰</span>
                                        <input type="number" name="rate" value={formData.rate} onChange={handleInputChange} className="form-input with-icon" placeholder="800" />
                                    </div>
                                </div>
                                <div className="form-group full-width">
                                    <label>Contractor (Optional)</label>
                                    <div className="input-wrapper">
                                        <span className="input-icon">🏢</span>
                                        <SearchableSelect
                                            options={[...(savedContractors || []), ...(contacts || []).filter(c => c.type && c.type.toLowerCase() === 'contractor')].map(c => {
                                                const label = typeof c === 'string' ? c : (c.companyName || c.name);
                                                return { label, value: label };
                                            })}
                                            onAddNew={(val) => {
                                                addSavedContractor(val);
                                                setFormData({ ...formData, contractor: val });
                                            }}
                                            value={formData.contractor}
                                            onChange={(val) => setFormData({ ...formData, contractor: val })}
                                            placeholder="Select Contractor"
                                            addNewLabel="Add Contractor"
                                            className="form-input with-icon"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={closeModal} className="btn btn-outline">Cancel</button>
                                <button type="submit" className="btn btn-primary">
                                    <span>{editingItem ? 'Update' : 'Add'}</span>
                                    <span className="btn-arrow">→</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
                .tabs { display: flex; gap: 8px; background: #f1f5f9; padding: 4px; border-radius: 12px; }
                .tab-btn { padding: 8px 16px; border: none; background: none; border-radius: 8px; cursor: pointer; font-weight: 600; color: #64748b; transition: all 0.2s; }
                .tab-btn.active { background: white; color: var(--primary-color); box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
                
                .data-table { width: 100%; border-collapse: collapse; }
                .data-table th, .data-table td { padding: 16px; text-align: left; border-bottom: 1px solid var(--border-color); }
                .data-table th { font-weight: 600; color: var(--text-light); background: var(--bg-secondary); }
                
                .badge { padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
                .badge.skilled { background: #dbeafe; color: #1e40af; }
                .badge.unskilled { background: #f3f4f6; color: #374151; }
                .badge.semi-skilled { background: #ffedd5; color: #9a3412; }
                
                .status-toggle { display: inline-flex; background: #f1f5f9; padding: 4px; border-radius: 8px; gap: 4px; }
                .status-option { padding: 6px 12px; border: none; background: transparent; border-radius: 6px; font-weight: 600; font-size: 0.85rem; color: #64748b; cursor: pointer; transition: all 0.2s; min-width: 36px; }
                .status-option:hover { background: rgba(0,0,0,0.05); }
                .status-option.active { color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .status-option.active.present { background: #22c55e; }
                .status-option.active.absent { background: #ef4444; }
                .status-option.active.halfday { background: #f59e0b; }
                
                .text-success { color: #059669; }
                .text-danger { color: #dc2626; }
                .text-muted { color: #6b7280; }
                .font-medium { font-weight: 500; }
                .font-bold { font-weight: 700; }
                
                .actions { display: flex; gap: 8px; }
                .btn-icon { background: none; border: none; cursor: pointer; font-size: 1.1rem; padding: 4px; border-radius: 4px; }
                .btn-icon:hover { background: var(--bg-secondary); }
                .form-group.full-width { grid-column: span 2; }
                .w-20 { width: 80px; }
                .w-full { width: 100%; }
                /* --- New Attendance UI --- */
                .attendance-view { display: flex; flex-direction: column; gap: 24px; }
                
                .date-selector-card { 
                    background: white; padding: 20px; border-radius: 16px; 
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                    display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;
                }
                .date-selector-wrapper { display: flex; flex-direction: column; gap: 8px; }
                .date-selector-wrapper label { font-size: 0.85rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
                .premium-date-input { 
                    padding: 10px 16px; border: 2px solid #e2e8f0; border-radius: 10px; 
                    font-size: 1rem; font-weight: 600; color: #1e293b; outline: none; transition: all 0.2s;
                }
                .premium-date-input:focus { border-color: var(--primary-color); box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
                
                .attendance-stats { display: flex; gap: 24px; }
                .stat-item { display: flex; flex-direction: column; align-items: center; }
                .stat-label { font-size: 0.75rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; }
                .stat-value { font-size: 1.5rem; font-weight: 800; color: #1e293b; line-height: 1.2; }
                
                .workers-grid { 
                    display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; 
                }
                
                .worker-card { 
                    background: white; border-radius: 16px; padding: 20px; 
                    box-shadow: 0 2px 4px rgba(0,0,0,0.02); border: 1px solid #f1f5f9;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); position: relative; overflow: hidden;
                }
                .worker-card:hover { transform: translateY(-2px); box-shadow: 0 12px 20px -8px rgba(0, 0, 0, 0.1); border-color: #e2e8f0; }
                
                .worker-card.status-p { border-left: 4px solid #22c55e; }
                .worker-card.status-a { border-left: 4px solid #ef4444; }
                .worker-card.status-hd { border-left: 4px solid #f59e0b; }
                
                .worker-info { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
                .worker-avatar { 
                    width: 48px; height: 48px; background: linear-gradient(135deg, #3b82f6, #2563eb); 
                    color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center;
                    font-weight: 700; font-size: 1.2rem; box-shadow: 0 4px 6px -2px rgba(37, 99, 235, 0.3);
                }
                .worker-name { font-weight: 700; color: #1e293b; font-size: 1.05rem; }
                .worker-trade { font-size: 0.85rem; color: #64748b; font-weight: 500; background: #f8fafc; padding: 2px 8px; border-radius: 6px; display: inline-block; margin-top: 4px; }
                
                .attendance-controls { display: flex; flex-direction: column; gap: 16px; }
                
                .status-selector { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; background: #f8fafc; padding: 4px; border-radius: 10px; }
                .status-chip { 
                    padding: 8px; border: none; background: transparent; border-radius: 8px; 
                    font-weight: 600; font-size: 0.8rem; color: #64748b; cursor: pointer; transition: all 0.2s;
                }
                .status-chip:hover { background: rgba(255,255,255,0.5); }
                .status-chip.active { background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.05); color: #1e293b; }
                .status-chip.active.present { color: #16a34a; background: #dcfce7; }
                .status-chip.active.absent { color: #dc2626; background: #fee2e2; }
                .status-chip.active.halfday { color: #d97706; background: #fef3c7; }
                
                .ot-control { display: flex; align-items: center; justify-content: space-between; padding-top: 12px; border-top: 1px solid #f1f5f9; }
                .ot-control label { font-size: 0.85rem; font-weight: 600; color: #64748b; }
                .ot-input-wrapper { display: flex; align-items: center; gap: 8px; background: #f8fafc; padding: 4px 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
                .ot-input-wrapper input { 
                    width: 40px; border: none; background: transparent; font-weight: 700; color: #1e293b; text-align: right; outline: none;
                }
                .ot-input-wrapper span { font-size: 0.75rem; color: #94a3b8; font-weight: 600; }
            `}</style>
        </div>
    );
};

export default ManPower;
