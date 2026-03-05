import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import './CompanySelector.css';

const CompanySelector = () => {
    const { companies, activeCompanyId, switchCompany, addCompany, updateCompany, deleteCompany, restoreCompany, getDeletedCompanies, restoreCompanyFromTrash, currentUser } = useData();
    const [isOpen, setIsOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null); // null means adding new
    const [companyToDelete, setCompanyToDelete] = useState(null);

    const [deletePassword, setDeletePassword] = useState('');

    // Recycle Bin
    const [showRecycleBin, setShowRecycleBin] = useState(false);
    const [deletedCompanies, setDeletedCompanies] = useState([]);

    const openRecycleBin = async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        console.log("Opening Company Recycle Bin...");
        try {
            const trash = await getDeletedCompanies();
            console.log("Deleted Companies:", trash);

            if (Array.isArray(trash)) {
                setDeletedCompanies(trash);
                setShowRecycleBin(true);
                setIsOpen(false);
            } else {
                alert("Failed to fetch deleted companies. API returned invalid format.");
            }
        } catch (err) {
            console.error(err);
            alert("Error opening recycle bin");
        }
    };

    const handleRestoreFromTrash = async (companyId) => {
        if (window.confirm("Are you sure you want to restore this company?")) {
            await restoreCompanyFromTrash(companyId);
            setShowRecycleBin(false);
        }
    };

    const [formData, setFormData] = useState({
        name: '',
        gst: '',
        mobile: '',
        address: ''
    });

    const dropdownRef = useRef(null);

    const activeCompany = companies.find(c => (c.id || c._id) === activeCompanyId) || companies[0];

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleOpenModal = (company = null) => {
        if (company) {
            setEditingCompany(company);
            setFormData({
                name: company.name,
                gst: company.gst || '',
                mobile: company.mobile,
                address: company.address || '',
                accountHolderName: company.accountHolderName || '',
                bankName: company.bankName || '',
                accountNumber: company.accountNumber || '',
                ifscCode: company.ifscCode || '',
                branch: company.branch || ''
            });
        } else {
            setEditingCompany(null);
            setFormData({
                name: '', gst: '', mobile: '', address: '',
                accountHolderName: '', bankName: '', accountNumber: '', ifscCode: '', branch: ''
            });
        }
        setIsModalOpen(true);
        setIsOpen(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.name && formData.mobile) {
            if (editingCompany) {
                updateCompany({ ...editingCompany, ...formData });
            } else {
                try {
                    const newComp = await addCompany(formData);
                    if (newComp && (newComp.id || newComp._id)) {
                        switchCompany(newComp.id || newComp._id);
                    }
                } catch (error) {
                    console.error("Failed to create company:", error);
                    alert(error.message || "Failed to create company. Please try again.");
                }
            }
            setIsModalOpen(false);
        } else {
            alert('Name and Mobile are required');
        }
    };

    const handleDeleteClick = (e, company) => {
        e.stopPropagation();
        setCompanyToDelete(company);
        setDeletePassword('');
        setIsDeleteConfirmOpen(true);
        setIsOpen(false);
    };

    const confirmDelete = () => {
        if (companyToDelete) {
            if (deletePassword === 'AlwaysVini') {
                deleteCompany(companyToDelete.id || companyToDelete._id);
                setIsDeleteConfirmOpen(false);
                setCompanyToDelete(null);
            } else {
                alert('Incorrect Password!');
            }
        }
    };

    return (
        <div className="company-selector-wrapper" ref={dropdownRef}>
            <div className="company-selector-trigger" onClick={() => setIsOpen(!isOpen)}>
                <span className="company-label">Company</span>
                <span className="selected-company-name">{activeCompany?.name || 'Select Company'}</span>
                <span className="selector-arrow">▼</span>
            </div>

            {isOpen && (
                <div className="company-dropdown-menu">
                    <div className="company-list">
                        {companies.map(comp => (
                            <div
                                key={comp.id || comp._id}
                                className={`company-item ${(comp.id || comp._id) === activeCompanyId ? 'active' : ''}`}
                                onClick={() => {
                                    switchCompany(comp.id || comp._id);
                                    setIsOpen(false);
                                }}
                            >
                                <span className="company-item-name">{comp.name}</span>
                                <div className="company-actions">
                                    {currentUser?.username === 'vini' && (
                                        <>
                                            <button
                                                className="action-btn"
                                                onClick={(e) => { e.stopPropagation(); handleOpenModal(comp); }}
                                                title="Edit"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className="action-btn delete"
                                                onClick={(e) => handleDeleteClick(e, comp)}
                                                title="Delete"
                                            >
                                                🗑️
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="company-list-actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px' }}>
                        {currentUser?.username === 'vini' && (
                            <>
                                <button className="add-company-btn" onClick={() => handleOpenModal(null)} style={{ width: '100%' }}>
                                    <span>+</span> New Company
                                </button>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        className="restore-company-btn"
                                        onClick={() => document.getElementById('restore-company-input').click()}
                                        style={{ flex: 1, background: '#22c55e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '8px' }}
                                    >
                                        <span>📂</span> Upload Zip
                                    </button>
                                    <button
                                        className="recycle-bin-btn"
                                        onClick={openRecycleBin}
                                        style={{ flex: 1, background: '#f97316', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '8px' }}
                                    >
                                        <span>🗑️</span> Recycle Bin
                                    </button>
                                </div>

                                <input
                                    type="file"
                                    id="restore-company-input"
                                    style={{ display: 'none' }}
                                    accept=".zip"
                                    onChange={async (e) => {
                                        if (e.target.files?.[0]) {
                                            const formData = new FormData();
                                            formData.append('backup', e.target.files[0]);
                                            await restoreCompany(formData);
                                            e.target.value = ''; // Reset
                                            setIsOpen(false);
                                        }
                                    }}
                                />
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="company-modal-overlay">
                    <div className="company-modal" style={{ width: '95vw', maxWidth: '1000px', height: '90vh', display: 'flex', flexDirection: 'column' }}>
                        <div className="company-modal-header">
                            <h3>{editingCompany ? 'Edit Company' : 'Add New Company'}</h3>
                            <button className="company-modal-close" onClick={() => setIsModalOpen(false)}>×</button>
                        </div>
                        <div className="company-modal-body" style={{ flex: 1, overflow: 'hidden', padding: 0 }}>
                            <form onSubmit={handleSubmit} className="company-modal-form" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 0 }}>
                                <div className="scrollable-content" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label>Company Name *</label>
                                            <input
                                                className="form-input"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>GST Number</label>
                                            <input
                                                className="form-input"
                                                value={formData.gst}
                                                onChange={e => setFormData({ ...formData, gst: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Mobile Number *</label>
                                            <input
                                                className="form-input"
                                                value={formData.mobile}
                                                onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="form-group form-full-width">
                                            <label>Address</label>
                                            <textarea
                                                className="form-input"
                                                rows="2"
                                                value={formData.address}
                                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <h4 className="section-subtitle">Bank Details</h4>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label>Account Holder Name</label>
                                            <input
                                                className="form-input"
                                                value={formData.accountHolderName || ''}
                                                onChange={e => setFormData({ ...formData, accountHolderName: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Bank Name</label>
                                            <input
                                                className="form-input"
                                                value={formData.bankName || ''}
                                                onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Account Number</label>
                                            <input
                                                className="form-input"
                                                value={formData.accountNumber || ''}
                                                onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>IFSC Code</label>
                                            <input
                                                className="form-input"
                                                value={formData.ifscCode || ''}
                                                onChange={e => setFormData({ ...formData, ifscCode: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Branch</label>
                                            <input
                                                className="form-input"
                                                value={formData.branch || ''}
                                                onChange={e => setFormData({ ...formData, branch: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="company-modal-actions" style={{ padding: '16px 24px', borderTop: '1px solid #eee', marginTop: 0, justifyContent: 'flex-end', background: '#fff' }}>
                                    <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary">{editingCompany ? 'Save Changes' : 'Add Company'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteConfirmOpen && (
                <div className="company-modal-overlay">
                    <div className="company-modal">
                        <div className="company-modal-header" style={{ background: '#dc2626' }}>
                            <h3>Delete Company</h3>
                            <button className="company-modal-close" onClick={() => setIsDeleteConfirmOpen(false)}>×</button>
                        </div>
                        <div className="company-modal-body">
                            <p className="mb-4">Are you sure you want to delete <strong>{companyToDelete?.name}</strong>? This action cannot be undone.</p>
                            <p className="mb-4 text-sm text-gray-500">
                                <strong>Note:</strong> A backup of this company's data will be downloaded automatically.
                            </p>
                            <div className="form-group mb-4">
                                <label>Enter Password to Confirm</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    placeholder="Enter password"
                                />
                            </div>
                            <div className="company-modal-actions">
                                <button className="btn btn-outline" onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</button>
                                <button className="btn btn-danger" onClick={confirmDelete}>Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Recycle Bin Modal */}
            {showRecycleBin && (
                <div className="company-modal-overlay">
                    <div className="company-modal" style={{ maxWidth: '600px' }}>
                        <div className="company-modal-header">
                            <div className="header-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span className="header-icon">🗑️</span>
                                <h3>Company Recycle Bin</h3>
                            </div>
                            <button className="company-modal-close" onClick={() => setShowRecycleBin(false)}>×</button>
                        </div>
                        <div className="recycle-bin-list" style={{ maxHeight: '400px', overflowY: 'auto', padding: '10px' }}>
                            {deletedCompanies.length === 0 ? (
                                <p className="text-center text-gray-500" style={{ padding: '20px' }}>No deleted companies found.</p>
                            ) : (
                                deletedCompanies.map(comp => (
                                    <div key={comp._id || comp.id} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '12px',
                                        borderBottom: '1px solid #eee',
                                        background: '#f9fafb',
                                        marginBottom: '8px',
                                        borderRadius: '6px'
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: '600' }}>{comp.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#888' }}>
                                                Deleted: {comp.deletedAt ? new Date(comp.deletedAt).toLocaleDateString() : 'Unknown'}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRestoreFromTrash(comp._id || comp.id)}
                                            className="btn btn-sm btn-primary"
                                            style={{ background: '#22c55e', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', color: 'white' }}
                                        >
                                            ♻️ Restore
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="company-modal-actions" style={{ padding: '10px 20px' }}>
                            <button onClick={() => setShowRecycleBin(false)} className="btn btn-outline">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompanySelector;
