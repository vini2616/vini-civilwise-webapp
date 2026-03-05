import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { generateAccountCSV } from '../utils/exportUtils';
import SearchableSelect from './SearchableSelect';
import AddNewModal from './AddNewModal';
import { checkPermission, canEnterData, canEditDelete } from '../utils/permissions';

const Cashbook = ({ currentUser }) => {
    const { users, transactions, addTransaction, updateTransaction, deleteTransaction, customCategories, addCustomCategory, savedParties, addSavedParty } = useData();


    // Permission Logic
    const permission = checkPermission(currentUser, 'cashbook');
    const isAdmin = permission === 'full_control'; // Admin view (all users)
    const canAdd = canEnterData(permission);
    const canEdit = canEditDelete(permission);

    if (permission === 'no_access') {
        return (
            <div className="cashbook-container text-center py-8">
                <h2 className="text-xl text-red-600">🚫 Access Denied</h2>
                <p className="text-muted">You do not have permission to view this module.</p>
            </div>
        );
    }

    const [selectedUser, setSelectedUser] = useState(isAdmin ? null : currentUser);

    // Calculate balances for all users (for Admin view)
    const userBalances = useMemo(() => {
        const balances = {};
        users.forEach(u => balances[u._id || u.id] = 0);
        transactions.forEach(t => {
            // Only include Cashbook entries
            if (!t.isCashbook) return;

            // Find matching user (robust check)
            const tUserId = t.userId && (t.userId._id || t.userId).toString();
            const user = users.find(u => (u.id || u._id).toString() === tUserId);

            if (user) {
                const userId = user._id || user.id;
                const amount = Number(t.amount) || 0;
                // Income/Credit = Positive, Expense/Debit = Negative
                if (t.type === 'income' || t.type === 'credit') balances[userId] += amount;
                else balances[userId] -= amount;
            }
        });
        return balances;
    }, [users, transactions]);

    // If Admin and no user selected, show User Grid
    if (isAdmin && !selectedUser) {
        return (
            <div className="cashbook-container fade-in">
                <div className="page-header">
                    <div>
                        <h2 className="page-title">💰 Staff Cashbooks</h2>
                        <p className="page-subtitle">Select a user to view their ledger</p>
                    </div>
                </div>
                <div className="users-grid">
                    {users.map(user => {
                        const balance = userBalances[user._id || user.id] || 0;
                        return (
                            <div key={user.id} className="user-card" onClick={() => setSelectedUser(user)}>
                                <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
                                <div className="user-info">
                                    <h3>{user.name}</h3>
                                    <p>{user.role}</p>
                                    <p className={`user-balance ${balance < 0 ? 'negative' : balance > 0 ? 'positive' : 'neutral'}`}>
                                        {balance < 0 ? '-' : ''}₹{Math.abs(balance).toLocaleString()}
                                    </p>
                                </div>
                                <div className="arrow">→</div>
                            </div>
                        );
                    })}
                </div>
                <style>{`
                    .cashbook-container { padding: 24px; max-width: 1200px; margin: 0 auto; }
                    .page-header { margin-bottom: 32px; }
                    .page-title { font-size: 1.8rem; font-weight: 700; color: #1e293b; margin: 0; }
                    .page-subtitle { color: #64748b; margin: 4px 0 0 0; }
                    
                    .users-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                        gap: 20px;
                    }
                    .user-card {
                        background: white;
                        padding: 20px;
                        border-radius: 12px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                        display: flex;
                        align-items: center;
                        gap: 15px;
                        cursor: pointer;
                        transition: transform 0.2s, box-shadow 0.2s;
                        border: 1px solid #e2e8f0;
                    }
                    .user-card:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                        border-color: #3b82f6;
                    }
                    .user-avatar {
                        width: 48px;
                        height: 48px;
                        background: #3b82f6;
                        color: white;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1.2rem;
                        font-weight: bold;
                    }
                    .user-info h3 { margin: 0; font-size: 1.1rem; color: #1e293b; }
                    .user-info p { margin: 2px 0 0 0; color: #64748b; font-size: 0.9rem; }
                    .user-balance { font-weight: 700; font-size: 0.95rem; margin-top: 4px; }
                    .user-balance.negative { color: #dc2626; }
                    .user-balance.positive { color: #166534; }
                    .user-balance.neutral { color: #64748b; }
                    .arrow { margin-left: auto; color: #cbd5e1; font-size: 1.5rem; }
                    .fade-in { animation: fadeIn 0.3s ease-out; }
                `}</style>
            </div>
        );
    }

    // --- LEDGER VIEW (Account-like UI) ---
    return <UserLedger
        currentUser={currentUser}
        targetUser={selectedUser}
        onBack={isAdmin ? () => setSelectedUser(null) : null}
        data={{ transactions, addTransaction, updateTransaction, deleteTransaction, customCategories, addCustomCategory, savedParties, addSavedParty }}
        permissions={{ canAdd, isAdmin }}
        permission={permission}
    />;
};

// Separated Component for the Ledger View to keep things clean
const UserLedger = ({ currentUser, targetUser, onBack, data, permissions, permission }) => {
    const { canAdd, isAdmin } = permissions;
    const { transactions, addTransaction, updateTransaction, deleteTransaction, customCategories, addCustomCategory, savedParties, addSavedParty } = data;

    const [showModal, setShowModal] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [filterType, setFilterType] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Custom Input States
    const [addModal, setAddModal] = useState({ isOpen: false, type: null, value: '' });

    const openAddModal = (type, value) => {
        setAddModal({ isOpen: true, type, value });
    };

    const closeAddModal = () => {
        setAddModal({ isOpen: false, type: null, value: '' });
    };

    const handleSaveNewItem = (newValue) => {
        if (!newValue || !newValue.trim()) return;
        const val = newValue.trim();

        if (addModal.type === 'category') {
            addCustomCategory(val);
            setFormData(prev => ({ ...prev, category: val }));
        } else if (addModal.type === 'party') {
            addSavedParty(val);
            setFormData(prev => ({ ...prev, partyName: val }));
        }
        closeAddModal();
    };

    // Form State
    const [formData, setFormData] = useState({
        type: 'expense',
        category: '',
        partyName: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        note: '',
        mode: 'cash',
        billImage: null,
        paymentProof: null
    });

    // Categories
    const defaultCategories = {
        income: ['Salary', 'Advance', 'Reimbursement', 'Other'],
        expense: ['Food', 'Travel', 'Material', 'Fuel', 'Other']
    };

    const availableCategories = useMemo(() => ({
        income: [...defaultCategories.income, ...customCategories],
        expense: [...defaultCategories.expense, ...customCategories]
    }), [customCategories]);

    const availableParties = useMemo(() => {
        const historicalParties = transactions.map(t => t.partyName).filter(Boolean);
        const safeSavedParties = Array.isArray(savedParties) ? savedParties : [];
        return [...new Set([...safeSavedParties, ...historicalParties])].sort();
    }, [transactions, savedParties]);

    // Filter Transactions for TARGET USER
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const tUserId = t.userId && (t.userId._id || t.userId).toString();
            const targetId = (targetUser.id || targetUser._id).toString();

            const matchesUser = tUserId === targetId;
            const isCashbookEntry = !!t.isCashbook; // Loose check for Cashbook entries
            const matchesType = filterType === 'all' || t.type === filterType;
            const matchesSearch = (t.note || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (t.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (t.partyName || '').toLowerCase().includes(searchTerm.toLowerCase());
            return matchesUser && isCashbookEntry && matchesType && matchesSearch;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [transactions, targetUser.id, filterType, searchTerm]);

    const stats = useMemo(() => {
        return filteredTransactions.reduce((acc, t) => {
            const amount = Number(t.amount) || 0;
            if (t.type === 'income' || t.type === 'credit') {
                acc.income += amount;
                acc.balance += amount;
            } else {
                acc.expense += amount;
                acc.balance -= amount;
            }
            return acc;
        }, { income: 0, expense: 0, balance: 0 });
    }, [filteredTransactions]);

    // Handlers (Same as Account.jsx but adapted)
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };



    const handleFileChange = (e, field) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setFormData(prev => ({ ...prev, [field]: reader.result }));
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const transactionData = {
            ...formData,
            categoryId: formData.category, // Mapped from form
            amount: Number(formData.amount),
            userId: targetUser._id || targetUser.id, // IMPORTANT: Save as Target User (Handle _id/id)
            userName: targetUser.name,
            userRole: targetUser.role,
            isCashbook: true // Mark as Cashbook entry
        };

        if (editingTransaction) {
            updateTransaction(editingTransaction._id || editingTransaction.id, transactionData);
        } else {
            addTransaction({ ...transactionData, id: Date.now() });
        }
        closeModal();
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingTransaction(null);
        setFormData({
            type: 'expense', category: '', partyName: '', amount: '',
            date: new Date().toISOString().split('T')[0], note: '', mode: 'cash',
            billImage: null, paymentProof: null
        });
    };

    const handleEdit = (t) => {
        setEditingTransaction(t);
        // Normalize type from DB (credit/debit) to Form (income/expense)
        let formType = t.type;
        if (formType === 'credit') formType = 'income';
        if (formType === 'debit') formType = 'expense';

        setFormData({
            type: formType, category: t.category, partyName: t.partyName, amount: t.amount,
            date: t.date ? new Date(t.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            note: t.note || '', mode: t.mode || 'cash',
            billImage: t.billImage, paymentProof: t.paymentProof
        });
        setShowModal(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('Delete this entry?')) deleteTransaction(id);
    };

    const [viewingImage, setViewingImage] = useState(null);

    const viewBill = (imageStr) => {
        setViewingImage(imageStr);
    };



    return (
        <div className="cashbook-container fade-in">
            {/* Header */}
            <div className="page-header">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <button onClick={onBack} className="back-btn">← Back</button>
                    )}
                    <div>
                        <h2 className="page-title">{targetUser.name}'s Cashbook</h2>
                        <p className="page-subtitle">Personal Ledger</p>
                    </div>
                </div>
                <div className="header-actions">
                    <button onClick={() => generateAccountCSV(filteredTransactions)} className="btn btn-outline">📊 Export</button>
                    {canAdd && <button onClick={() => setShowModal(true)} className="btn btn-primary">+ Add Entry</button>}
                </div>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card income">
                    <div className="stat-icon">💰</div>
                    <div className="stat-info"><span className="stat-label">Total Credit</span><span className="stat-value">₹{stats.income.toLocaleString()}</span></div>
                </div>
                <div className="stat-card expense">
                    <div className="stat-icon">💸</div>
                    <div className="stat-info"><span className="stat-label">Total Debit</span><span className="stat-value">₹{stats.expense.toLocaleString()}</span></div>
                </div>
                <div className="stat-card balance">
                    <div className="stat-icon">⚖️</div>
                    <div className="stat-info">
                        <span className="stat-label">Net Balance</span>
                        <span className={`stat-value ${stats.balance >= 0 ? 'text-success' : 'text-danger'}`}>₹{stats.balance.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <div className="filter-group">
                    {[
                        { id: 'all', label: 'All' },
                        { id: 'income', label: 'Credit' },
                        { id: 'expense', label: 'Debit' }
                    ].map(f => (
                        <button key={f.id} className={`filter-btn ${filterType === f.id ? 'active' : ''}`} onClick={() => setFilterType(f.id)}>
                            {f.label}
                        </button>
                    ))}
                </div>
                <div className="search-wrapper">
                    <span className="search-icon">🔍</span>
                    <input type="text" placeholder="Search transactions..." className="search-input" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </div>

            {/* Table */}
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Party / Description</th>
                            <th>Category</th>
                            <th>Mode</th>
                            <th>Amount</th>
                            <th>Bill</th>
                            {permission !== 'view_only' && permission !== 'no_access' && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransactions.length > 0 ? (
                            filteredTransactions.map(t => (
                                <tr key={t._id || t.id}>
                                    <td>{new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                    <td>
                                        <div className="font-medium">{t.partyName || 'Unknown'}</div>
                                        <div className="text-xs text-muted">{t.note || '-'}</div>
                                        {t.enteredBy && <div className="text-xs text-muted" style={{ fontSize: '0.7em', marginTop: '2px' }}>By: {t.enteredBy}{t.editedBy ? `, Mod: ${t.editedBy}` : ''}</div>}
                                    </td>
                                    <td><span className="badge">{t.category || 'General'}</span></td>
                                    <td className="capitalize">{t.mode}</td>
                                    <td className={`font-bold ${(t.type === 'income' || t.type === 'credit') ? 'text-success' : 'text-danger'}`}>
                                        {(t.type === 'income' || t.type === 'credit') ? '+' : '-'}₹{Number(t.amount).toLocaleString()}
                                    </td>
                                    <td>
                                        <div className="flex flex-col gap-1">
                                            {t.billImage && <button onClick={() => viewBill(t.billImage)} className="btn-link text-xs">📎 Bill</button>}
                                            {t.paymentProof && <button onClick={() => viewBill(t.paymentProof)} className="btn-link text-xs">📷 Proof</button>}
                                        </div>
                                    </td>
                                    {permission !== 'view_only' && permission !== 'no_access' && (
                                        <td>
                                            {canEditDelete(permission, t.createdAt) && (
                                                <div className="action-buttons">
                                                    <button onClick={() => handleEdit(t)} className="btn-icon edit">✏️</button>
                                                    <button onClick={() => handleDelete(t._id || t.id)} className="btn-icon delete">🗑️</button>
                                                </div>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={permission !== 'view_only' && permission !== 'no_access' ? "7" : "6"} className="text-center py-8 text-muted">No entries found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {viewingImage && (
                <div className="modal-overlay" onClick={() => setViewingImage(null)}>
                    <div className="modal-content" style={{ maxWidth: '90vw', maxHeight: '90vh', width: 'auto', padding: '10px', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                            <button onClick={() => setViewingImage(null)} className="close-btn" style={{ fontSize: '2rem', lineHeight: '1' }}>&times;</button>
                        </div>
                        {viewingImage.startsWith('data:application/pdf') ? (
                            <iframe src={viewingImage} style={{ width: '100%', height: '80vh', border: 'none' }} title="Bill PDF"></iframe>
                        ) : (
                            <img src={viewingImage} alt="Bill" style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }} />
                        )}
                    </div>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}</h3>
                            <button onClick={closeModal} className="close-btn">×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Type</label>
                                    <div className="type-selector">
                                        <label className={`type-option ${formData.type === 'income' ? 'selected income' : ''}`}>
                                            <input type="radio" name="type" value="income" checked={formData.type === 'income'} onChange={handleInputChange} />
                                            Credit
                                        </label>
                                        <label className={`type-option ${formData.type === 'expense' ? 'selected expense' : ''}`}>
                                            <input type="radio" name="type" value="expense" checked={formData.type === 'expense'} onChange={handleInputChange} />
                                            Debit
                                        </label>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Category</label>
                                    <SearchableSelect
                                        options={(availableCategories[formData.type] || []).map(c => ({ label: c, value: c }))}
                                        value={formData.category}
                                        onChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
                                        placeholder="Select Category"
                                        onAddNew={(val) => openAddModal('category', val)}
                                        addNewLabel="Add New Category"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Party Name</label>
                                    <SearchableSelect
                                        options={availableParties.map(p => ({ label: p, value: p }))}
                                        value={formData.partyName}
                                        onChange={(val) => setFormData(prev => ({ ...prev, partyName: val }))}
                                        placeholder="Select Party"
                                        onAddNew={(val) => openAddModal('party', val)}
                                        addNewLabel="Add New Party"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Amount (₹)</label>
                                    <input type="number" name="amount" value={formData.amount} onChange={handleInputChange} className="form-input" required min="0" />
                                </div>
                                <div className="form-group">
                                    <label>Date</label>
                                    <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="form-input" required />
                                </div>
                                <div className="form-group">
                                    <label>Mode</label>
                                    <select name="mode" value={formData.mode} onChange={handleInputChange} className="form-input">
                                        <option value="cash">Cash</option>
                                        <option value="online">Online</option>
                                        <option value="cheque">Cheque</option>
                                    </select>
                                </div>
                                <div className="form-group full-width">
                                    <label>Note</label>
                                    <textarea name="note" value={formData.note} onChange={handleInputChange} className="form-input" rows="2" placeholder="Details..."></textarea>
                                </div>
                                <div className="form-group full-width">
                                    <label>Bill Image</label>
                                    <input type="file" accept="image/*" onChange={e => handleFileChange(e, 'billImage')} className="form-input" />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={closeModal} className="btn btn-outline">Cancel</button>
                                <button type="submit" className="btn btn-primary">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Styles (Reused from Account.jsx) */}
            <style>{`
                .cashbook-container { padding: 24px; max-width: 1200px; margin: 0 auto; font-family: 'Inter', sans-serif; }
                .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
                .page-title { font-size: 1.8rem; font-weight: 700; color: #1e293b; margin: 0; }
                .page-subtitle { color: #64748b; margin: 4px 0 0 0; }
                .header-actions { display: flex; gap: 12px; }
                .back-btn { background: none; border: none; color: #64748b; font-weight: 600; cursor: pointer; font-size: 1rem; margin-right: 10px; }
                .back-btn:hover { color: #3b82f6; text-decoration: underline; }

                .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 32px; }
                .stat-card { background: white; padding: 24px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 20px; }
                .stat-icon { width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.75rem; }
                .stat-card.income .stat-icon { background: #dcfce7; color: #166534; }
                .stat-card.expense .stat-icon { background: #fee2e2; color: #991b1b; }
                .stat-card.balance .stat-icon { background: #e0f2fe; color: #075985; }
                .stat-info { display: flex; flex-direction: column; }
                .stat-label { font-size: 0.875rem; color: #64748b; font-weight: 500; }
                .stat-value { font-size: 1.5rem; font-weight: 700; color: #0f172a; }

                .filters-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 16px; }
                .filter-group { display: flex; background: #f1f5f9; padding: 4px; border-radius: 8px; }
                .filter-btn { padding: 8px 16px; border: none; background: transparent; border-radius: 6px; font-weight: 500; color: #64748b; cursor: pointer; }
                .filter-btn.active { background: white; color: #0f172a; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                .search-wrapper { position: relative; width: 300px; }
                .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
                .search-input { width: 100%; padding: 10px 16px 10px 40px; border: 1px solid #e2e8f0; border-radius: 8px; outline: none; }

                .table-container { background: white; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); overflow: hidden; }
                .data-table { width: 100%; border-collapse: collapse; }
                .data-table th { background: #f8fafc; padding: 16px; text-align: left; font-weight: 600; color: #475569; font-size: 0.875rem; }
                .data-table td { padding: 16px; border-bottom: 1px solid #e2e8f0; color: #1e293b; }
                .badge { background: #f1f5f9; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 500; color: #475569; }
                .text-success { color: #166534; }
                .text-danger { color: #dc2626; }
                .text-muted { color: #94a3b8; }
                .font-medium { font-weight: 500; }
                .font-bold { font-weight: 700; }
                .text-xs { font-size: 0.75rem; }
                .capitalize { text-transform: capitalize; }
                .flex { display: flex; }
                .flex-col { flex-direction: column; }
                .gap-1 { gap: 4px; }
                .gap-2 { gap: 8px; }
                .gap-4 { gap: 16px; }
                .items-center { align-items: center; }

                .btn { padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; }
                .btn-primary { background: #3b82f6; color: white; }
                .btn-primary:hover { background: #2563eb; }
                .btn-outline { background: white; border: 1px solid #e2e8f0; color: #475569; }
                .btn-outline:hover { background: #f8fafc; border-color: #cbd5e1; }
                .btn-sm { padding: 6px 12px; font-size: 0.875rem; }
                .btn-link { background: none; border: none; color: #3b82f6; cursor: pointer; padding: 0; text-align: left; }
                .btn-link:hover { text-decoration: underline; }
                .btn-icon { background: none; border: none; font-size: 1.2rem; cursor: pointer; padding: 4px; border-radius: 4px; }
                .btn-icon:hover { background: #f1f5f9; }
                .btn-icon.delete:hover { color: #dc2626; background: #fee2e2; }

                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 50; backdrop-filter: blur(4px); }
                .modal-content { background: white; border-radius: 16px; width: 100%; max-width: 500px; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); max-height: 90vh; overflow-y: auto; }
                .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
                .modal-header h3 { margin: 0; font-size: 1.25rem; color: #0f172a; }
                .close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #94a3b8; }
                .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
                .full-width { grid-column: span 2; }
                .form-group label { display: block; margin-bottom: 8px; font-size: 0.875rem; font-weight: 500; color: #475569; }
                .form-input { width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; outline: none; }
                .form-input:focus { border-color: #3b82f6; }
                .type-selector { display: flex; background: #f1f5f9; padding: 4px; border-radius: 8px; }
                .type-option { flex: 1; text-align: center; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 0.875rem; font-weight: 500; color: #64748b; }
                .type-option input { display: none; }
                .type-option.selected { background: white; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
                .type-option.selected.income { color: #166534; }
                .type-option.selected.expense { color: #991b1b; }
                .modal-actions { margin-top: 24px; display: flex; justify-content: flex-end; gap: 12px; }
                .fade-in { animation: fadeIn 0.3s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>

            <AddNewModal
                isOpen={addModal.isOpen}
                onClose={closeAddModal}
                onSave={handleSaveNewItem}
                title={`Add New ${addModal.type === 'category' ? 'Category' : 'Party'}`}
                initialValue={addModal.value}
                label={addModal.type === 'category' ? 'Category Name' : 'Company / Person Name'}
            />
        </div>
    );
};

export default Cashbook;
