import React, { useState, useRef, useEffect } from 'react';
import Calculator from './Calculator';
import CalendarWidget from './CalendarWidget';
import CompanySelector from './CompanySelector';
import { useData } from '../context/DataContext';
import './TopBar.css';
import logo from '../assets/logo.png';

const TopBar = ({ user, onLogout, onNavigate }) => {
    const { sites, addSite, updateSite, deleteSite, restoreSite, activeCompanyId, activeSite, setActiveSite, refreshData } = useData();
    const [showCalculator, setShowCalculator] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const handleSync = async () => {
        if (refreshData) {
            setRefreshing(true);
            await refreshData();
            setTimeout(() => setRefreshing(false), 500);
        }
    };

    // Site Dropdown State
    const [showSiteDropdown, setShowSiteDropdown] = useState(false);

    // Filter sites for active company
    console.log("TopBar Debug: ActiveCompanyId:", activeCompanyId);
    console.log("TopBar Debug: All Sites:", sites);
    const companySites = Array.isArray(sites) ? sites.filter(site => {
        const match = site.companyId && activeCompanyId && site.companyId.toString() === activeCompanyId.toString();
        // console.log(`Site ${site.name} (${site.companyId}) matches ${activeCompanyId}? ${match}`);
        return match;
    }) : [];

    // Find the currently active site object
    const selectedSite = companySites.find(s => (s.id || s._id) === activeSite) || companySites[0] || null;
    const [showAddSiteModal, setShowAddSiteModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [siteToDelete, setSiteToDelete] = useState(null);

    // Forms
    const [newSiteName, setNewSiteName] = useState('');
    const [newSiteAddress, setNewSiteAddress] = useState('');
    const [deletePassword, setDeletePassword] = useState('');

    // Recycle Bin State
    const [showRecycleBin, setShowRecycleBin] = useState(false);
    const [deletedSites, setDeletedSites] = useState([]);

    const { getDeletedSites, restoreSiteFromTrash } = useData();

    const openRecycleBin = async () => {
        if (activeCompanyId) {
            const trash = await getDeletedSites(activeCompanyId);
            if (Array.isArray(trash)) {
                setDeletedSites(trash);
                setShowRecycleBin(true);
                setShowSiteDropdown(false);
            } else {
                alert("Failed to fetch deleted sites.");
            }
        } else {
            alert("Please select a company first.");
        }
    };

    const handleRestoreFromTrash = async (siteId) => {
        if (window.confirm("Are you sure you want to restore this site?")) {
            await restoreSiteFromTrash(siteId);
            setShowRecycleBin(false);
            // Optionally refresh deleted list if we want to keep modal open
        }
    };

    const dropdownRef = useRef(null);

    const isAdmin = user?.username === 'vini';

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowSiteDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Sync selected site if sites change or company changes
    useEffect(() => {
        // If we have sites for this company
        if (companySites.length > 0) {
            // Check if current activeSite belongs to this company
            const isSelectedValid = activeSite && companySites.find(s => (s.id || s._id) === activeSite);

            if (!isSelectedValid) {
                // If not valid (or null), switch to the first available site for this company
                const firstSiteId = companySites[0].id || companySites[0]._id;
                setActiveSite(firstSiteId);
            }
        } else {
            // No sites for this company, reset selection
            if (activeSite !== null) {
                setActiveSite(null);
            }
        }
    }, [sites, activeCompanyId, activeSite, setActiveSite]);

    // Edit State
    const [editingSite, setEditingSite] = useState(null);

    const handleEditClick = (e, site) => {
        e.stopPropagation();
        setEditingSite(site);
        setNewSiteName(site.name);
        setNewSiteAddress(site.address);
        setShowAddSiteModal(true);
        setShowSiteDropdown(false);
    };

    const handleAddSite = async (e) => {
        e.preventDefault();
        if (!activeCompanyId) {
            alert("Please select a company first.");
            return;
        }
        if (newSiteName && newSiteAddress) {
            try {
                if (editingSite) {
                    // Update Mode
                    const result = await updateSite({ ...editingSite, name: newSiteName, address: newSiteAddress });
                    if (result && (result.id || result._id)) {
                        setEditingSite(null);
                        setNewSiteName('');
                        setNewSiteAddress('');
                        setShowAddSiteModal(false);
                        setShowSiteDropdown(false);
                        // Optional: setActiveSite(result.id || result._id);
                    } else {
                        alert("Failed to update site.");
                    }
                } else {
                    // Create Mode
                    const result = await addSite({ name: newSiteName, address: newSiteAddress });
                    if (result && (result.id || result._id)) {
                        setNewSiteName('');
                        setNewSiteAddress('');
                        setShowAddSiteModal(false);
                        setShowSiteDropdown(false);
                        setActiveSite(result.id || result._id);
                    } else {
                        alert("Failed to create site.");
                    }
                }
            } catch (error) {
                console.error("Error saving site:", error);
                alert("An error occurred while saving the site.");
            }
        }
    };

    const initiateDelete = (e, site) => {
        e.stopPropagation(); // Prevent selecting the site
        setSiteToDelete(site);
        setDeletePassword('');
        setShowDeleteConfirm(true);
        setShowSiteDropdown(false);
    };

    const deletePasswordRef = useRef(null);

    const handleDeleteSite = (e) => {
        e.preventDefault();
        // Use state instead of ref for reliability
        if (deletePassword === 'AlwaysCivilWise') {
            deleteSite(siteToDelete.id || siteToDelete._id);
            setShowDeleteConfirm(false);
            setSiteToDelete(null);
            setDeletePassword('');
        } else {
            alert('Incorrect Password!');
        }
    };

    return (
        <>
            <header className="topbar">
                <div className="topbar-left">
                    <div className="brand" onClick={() => onNavigate('dashboard')}>
                        <img src={logo} alt="CivilWise" className="brand-logo-small" />
                    </div>
                </div>

                <div className="topbar-center">
                    <CompanySelector />

                    <div className="site-selector-container" ref={dropdownRef}>
                        <div
                            className="site-selector-trigger"
                            onClick={() => setShowSiteDropdown(!showSiteDropdown)}
                        >
                            <span className="site-label">Site</span>
                            <span className="selected-site-name">{selectedSite ? selectedSite.name : 'Select Site'}</span>
                            <span className="selector-arrow">▼</span>
                        </div>

                        {showSiteDropdown && (
                            <div className="site-dropdown-menu">
                                {companySites.length === 0 && (
                                    <div className="p-3 text-center text-gray-500 text-sm">No sites found</div>
                                )}
                                {companySites.map(site => (
                                    <div
                                        key={site.id}
                                        className={`site-option ${activeSite === (site.id || site._id) ? 'active' : ''}`}
                                        onClick={() => {
                                            setActiveSite(site.id || site._id);
                                            setShowSiteDropdown(false);
                                        }}
                                    >
                                        <div className="site-info">
                                            <span className="site-option-name">{site.name}</span>
                                            <span className="site-option-address">{site.address}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            {isAdmin && (
                                                <button
                                                    className="edit-site-btn"
                                                    onClick={(e) => handleEditClick(e, site)}
                                                    title="Edit Site"
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        fontSize: '1.1rem'
                                                    }}
                                                >
                                                    ✏️
                                                </button>
                                            )}
                                            {isAdmin && (
                                                <button
                                                    className="delete-site-btn"
                                                    onClick={(e) => initiateDelete(e, site)}
                                                    title="Delete Site"
                                                >
                                                    🗑️
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {isAdmin && (
                                    <button
                                        className="add-site-btn"
                                        onClick={() => {
                                            setEditingSite(null);
                                            setNewSiteName('');
                                            setNewSiteAddress('');
                                            setShowAddSiteModal(true);
                                            setShowSiteDropdown(false);
                                        }}
                                    >
                                        <span>+</span> Add New Site
                                    </button>
                                )}
                                {isAdmin && (
                                    <>
                                        <button
                                            className="restore-site-btn"
                                            onClick={() => document.getElementById('restore-site-input').click()}
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                background: '#22c55e',
                                                color: 'white',
                                                border: 'none',
                                                marginTop: '5px',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '5px'
                                            }}
                                        >
                                            <span>📂</span> Upload Backup Zip
                                        </button>
                                        <input
                                            type="file"
                                            id="restore-site-input"
                                            style={{ display: 'none' }}
                                            accept=".zip"
                                            onChange={async (e) => {
                                                if (e.target.files?.[0]) {
                                                    const formData = new FormData();
                                                    formData.append('backup', e.target.files[0]);
                                                    await restoreSite(formData);
                                                    e.target.value = ''; // Reset
                                                    setShowSiteDropdown(false);
                                                }
                                            }}
                                        />
                                        <button
                                            className="recycle-bin-btn"
                                            onClick={openRecycleBin}
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                background: '#f97316', // Orange
                                                color: 'white',
                                                border: 'none',
                                                marginTop: '5px',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '5px'
                                            }}
                                        >
                                            <span>🗑️</span> Recycle Bin ({deletedSites.length > 0 ? deletedSites.length : 'View'})
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="topbar-right">
                    <button
                        className="date-display"
                        onClick={() => setShowCalendar(true)}
                    >
                        📅 {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </button>

                    <button
                        className={`btn btn-outline btn-sm ${refreshing ? 'spinning' : ''}`}
                        onClick={handleSync}
                        title="Sync Data"
                    >
                        🔄 Sync
                    </button>

                    <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setShowCalculator(true)}
                    >
                        🧮 Calculator
                    </button>

                    <div className="user-profile-container">
                        <button
                            className="user-profile"
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                        >
                            <div className="avatar">{user?.name?.charAt(0).toUpperCase()}</div>
                            <span className="username">{user?.name}</span>
                            <span className="dropdown-arrow">▼</span>
                        </button>

                        {showProfileMenu && (
                            <div className="dropdown-menu">
                                <div className="dropdown-header">
                                    <strong>{user?.name}</strong>
                                    <span className="role-badge">{user?.role}</span>
                                </div>
                                <button className="dropdown-item">👤 My Profile</button>
                                <button className="dropdown-item">⚙️ Settings</button>
                                <div className="dropdown-divider"></div>
                                <button onClick={onLogout} className="dropdown-item text-danger">
                                    🚪 Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Modals */}
            {showAddSiteModal && (
                <div className="popup-overlay">
                    <div className="popup-content modal premium-modal">
                        <div className="popup-header">
                            <div className="header-title">
                                <span className="header-icon">🏗️</span>
                                <h3>{editingSite ? 'Edit Site' : 'Add New Site'}</h3>
                            </div>
                            <button onClick={() => { setShowAddSiteModal(false); setEditingSite(null); }} className="close-btn">×</button>
                        </div>
                        <form onSubmit={handleAddSite} className="premium-form">
                            <div className="form-group">
                                <label>Site Name</label>
                                <div className="input-wrapper">
                                    <span className="input-icon">📍</span>
                                    <input
                                        required
                                        value={newSiteName}
                                        onChange={(e) => setNewSiteName(e.target.value)}
                                        className="form-input with-icon"
                                        placeholder="e.g. Green Valley Project"
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Address</label>
                                <div className="input-wrapper">
                                    <span className="input-icon">🗺️</span>
                                    <input
                                        required
                                        value={newSiteAddress}
                                        onChange={(e) => setNewSiteAddress(e.target.value)}
                                        className="form-input with-icon"
                                        placeholder="e.g. 123 Main St, City"
                                    />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowAddSiteModal(false)} className="btn btn-outline">Cancel</button>
                                <button type="submit" className="btn btn-primary">
                                    <span>{editingSite ? 'Update Site' : 'Create Site'}</span>
                                    <span className="btn-arrow">→</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showDeleteConfirm && (
                <div className="popup-overlay" style={{ zIndex: 9999 }}>
                    <div className="popup-content modal">
                        <div className="popup-header">
                            <h3>Delete Site</h3>
                            <button onClick={() => setShowDeleteConfirm(false)} className="close-btn">×</button>
                        </div>
                        <form onSubmit={handleDeleteSite}>
                            <p className="confirm-text">
                                Are you sure you want to delete <strong>{siteToDelete?.name}</strong>?
                                This action cannot be undone.
                            </p>
                            <div className="form-group">
                                <label>Enter Password to Confirm</label>
                                <input
                                    type="password"
                                    required
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    className="form-input"
                                    placeholder="Enter password"
                                    autoFocus
                                    autoComplete="off"
                                    style={{ position: 'relative', zIndex: 10001 }}
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowDeleteConfirm(false)} className="btn btn-outline">Cancel</button>
                                <button type="submit" className="btn btn-danger">Delete Site</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showRecycleBin && (
                <div className="popup-overlay">
                    <div className="popup-content modal" style={{ maxWidth: '600px' }}>
                        <div className="popup-header">
                            <div className="header-title">
                                <span className="header-icon">🗑️</span>
                                <h3>Recycle Bin (Last 15 Days)</h3>
                            </div>
                            <button onClick={() => setShowRecycleBin(false)} className="close-btn">×</button>
                        </div>
                        <div className="recycle-bin-list" style={{ maxHeight: '400px', overflowY: 'auto', padding: '10px' }}>
                            {deletedSites.length === 0 ? (
                                <p className="text-center text-gray-500">No deleted sites found.</p>
                            ) : (
                                deletedSites.map(site => (
                                    <div key={site.id || site._id} style={{
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
                                            <div style={{ fontWeight: '600' }}>{site.name}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#666' }}>{site.address}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#888' }}>
                                                Deleted: {new Date(site.deletedAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRestoreFromTrash(site.id || site._id)}
                                            className="btn btn-sm btn-primary"
                                            style={{ background: '#22c55e', border: 'none' }}
                                        >
                                            ♻️ Restore
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="modal-actions">
                            <button onClick={() => setShowRecycleBin(false)} className="btn btn-outline">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {showCalculator && <Calculator onClose={() => setShowCalculator(false)} />}
            {showCalendar && <CalendarWidget onClose={() => setShowCalendar(false)} />}
        </>
    );
};

export default TopBar;
