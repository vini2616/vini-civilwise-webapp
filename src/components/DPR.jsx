import React, { useState, useEffect } from 'react';
import { generateDPRPDF } from '../utils/pdfGenerator';
import { useData } from '../context/DataContext';
import { checkPermission, canEnterData, canEditDelete } from '../utils/permissions';

import { firestoreService } from '../services/firestoreService';
import SearchableSelect from './SearchableSelect';

const DPR = ({ onNavigate, currentUser }) => {
    const { sites, activeSite, addMaterialTransaction, deleteMaterialsForDPR, materials, savedSuppliers, addSavedSupplier, deleteSavedSupplier, savedContractors, addSavedContractor, deleteSavedContractor, savedTrades, addSavedTrade, deleteSavedTrade, savedMaterialNames, addSavedMaterialName, deleteSavedMaterialName, savedMaterialTypes, addSavedMaterialType, dprs, addDPR, updateDPR, contacts, addContact } = useData();
    const [loading, setLoading] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [history, setHistory] = useState([]);

    const [currentId, setCurrentId] = useState(null);

    // Dynamic Storage Keys based on Active Site
    const STORAGE_KEY_DATA = `vini_dpr_data_${activeSite}`;

    const permission = checkPermission(currentUser, 'dpr');

    if (permission === 'no_access') {
        return (
            <div className="dpr-container text-center py-8">
                <h2 className="text-xl text-red-600">🚫 Access Denied</h2>
                <p className="text-muted">You do not have permission to view this module.</p>
                <button onClick={() => onNavigate('dashboard')} className="btn btn-outline mt-4">Go to Dashboard</button>
            </div>
        );
    }


    // ... (permissions logic unchanged) ...
    const canAdd = canEnterData(permission);
    // Determine if the currently loaded report can be edited
    // New reports (no ID) are always editable if permission allows adding
    // Existing reports are editable only if they are recent enough for data_entry users



    // Strict Owner-only permission for deleting dropdown items
    const canDeleteDropdown = currentUser?.role === 'Owner' || currentUser?.permission === 'full_control';

    const initialState = {
        id: null,
        projectInfo: { projectName: '', location: '', dprNo: '', date: new Date().toISOString().split('T')[0] },
        manpower: [{ id: 1, trade: '', skilled: 0, unskilled: 0, total: 0, note: '' }],
        workStarted: [{ id: 1, description: '', location: '', note: '' }],
        equipment: [{ id: 1, name: '', hours: 0, fuel: 0, note: '' }],
        materials: [{ id: 1, name: '', unit: '', quantity: 0, received: 0, consumed: 0, balance: 0, note: '' }],
        work: [{ id: 1, description: '', location: '', quantity: 0, unit: '', progress: 0, note: '' }],
        reconciliation: [{ id: 1, item: '', unit: '', theory: '', actual: '', diff: 0, note: '' }],
        planTomorrow: '',
        remarks: { hindrances: '', safety: '' },
        signatures: { prepared: '', reviewed: '', approved: '' }
    };

    const [data, setData] = useState(initialState);

    const reportCreatedAt = data?.createdAt || data?.timestamp;
    const canEditReport = !currentId ? true : canEditDelete(permission, reportCreatedAt);

    const isViewOnly = !canAdd || !canEditReport;
    const canEdit = !isViewOnly;
    const canDelete = canEdit; // If you can edit the report, you can delete rows
    const canDownload = canAdd; // Allow download if you can access data entry
    const [activeTab, setActiveTab] = useState('morning');

    const [vendors, setVendors] = useState([]);
    const [contractors, setContractors] = useState([]);
    const [quickAddModal, setQuickAddModal] = useState({ visible: false, type: '', value: '', mobile: '' });



    // Update History from Context
    useEffect(() => {
        if (dprs) {
            // Map backend DPRs to history format if needed, or just use directly
            // Backend DPR structure matches frontend mostly, but let's ensure compatibility
            const formattedHistory = dprs.map(d => ({
                id: d._id || d.id,
                date: d.projectInfo.date,
                project: d.projectInfo.projectName,
                data: d, // The full DPR object
                photos: d.photos || []
            }));
            setHistory(formattedHistory);
        }
    }, [dprs]);

    // Auto-fill Project Info from Active Site
    useEffect(() => {
        if (activeSite && sites && sites.length > 0) {
            const currentSiteObj = sites.find(s => s.id === activeSite || s._id === activeSite);
            if (currentSiteObj) {
                setData(prev => ({
                    ...prev,
                    projectInfo: {
                        ...prev.projectInfo,
                        projectName: currentSiteObj.name || prev.projectInfo.projectName,
                        location: currentSiteObj.location || prev.projectInfo.location
                    }
                }));
            }
        }
    }, [activeSite, sites]);

    // Load Data when Active Site Changes
    const [isLoaded, setIsLoaded] = useState(false);

    // Load Data when Active Site Changes
    useEffect(() => {
        // Load Current Draft (Keep LocalStorage for draft resilience)
        try {
            const saved = localStorage.getItem(STORAGE_KEY_DATA);
            if (saved) {
                const parsed = JSON.parse(saved);
                const currentSiteObj = sites?.find(s => s.id === activeSite || s._id === activeSite);
                const properProjectName = currentSiteObj ? currentSiteObj.name : '';
                const properLocation = currentSiteObj ? currentSiteObj.location : '';

                // Helper to safely parse potential JSON strings
                const safeParse = (val, fallback) => {
                    if (!val) return fallback;
                    if (typeof val === 'string') {
                        try {
                            const result = JSON.parse(val);
                            return result || fallback;
                        } catch (e) {
                            return fallback;
                        }
                    }
                    return val;
                };

                const loadedProjectInfo = safeParse(parsed.projectInfo, {});

                setData({
                    ...initialState,
                    ...parsed,
                    projectInfo: {
                        ...initialState.projectInfo,
                        ...(typeof loadedProjectInfo === 'object' ? loadedProjectInfo : {}),
                        // Force update project name if available to correct missing data
                        projectName: properProjectName || loadedProjectInfo?.projectName || '',
                        location: properLocation || loadedProjectInfo?.location || ''
                    },
                    manpower: safeParse(parsed.manpower, initialState.manpower),
                    workStarted: safeParse(parsed.workStarted, initialState.workStarted),
                    equipment: safeParse(parsed.equipment, initialState.equipment),
                    materials: safeParse(parsed.materials, initialState.materials),
                    work: safeParse(parsed.work, initialState.work),
                    reconciliation: safeParse(parsed.reconciliation, initialState.reconciliation),
                    planTomorrow: parsed.planTomorrow || '',
                    remarks: { ...initialState.remarks, ...(safeParse(parsed.remarks, {})) },
                    signatures: { ...initialState.signatures, ...(safeParse(parsed.signatures, {})) }
                });
                setCurrentId(parsed.id || null);

                // Auto-switch tab based on content
                // Auto-switch tab based on content
                const checkHasData = (arr, fields) => {
                    if (!arr || !Array.isArray(arr) || arr.length === 0) return false;
                    return arr.some(item => item && fields.some(f => {
                        const val = item[f];
                        if (val === null || val === undefined) return false;
                        const s = val.toString().trim();
                        return s !== '' && s !== '0';
                    }));
                };

                const pManpower = safeParse(parsed.manpower, []);
                const pWorkStarted = safeParse(parsed.workStarted, []);
                const pEquipment = safeParse(parsed.equipment, []);
                const pMaterials = safeParse(parsed.materials, []);
                const pWork = safeParse(parsed.work, []);
                const pReconciliation = safeParse(parsed.reconciliation, []);

                const hasMorning = checkHasData(pManpower, ['trade', 'skilled', 'unskilled', 'total', 'note']) ||
                    checkHasData(pWorkStarted, ['description', 'location', 'note']);

                const hasEvening = checkHasData(pEquipment, ['name', 'qty', 'hours']) ||
                    checkHasData(pMaterials, ['name', 'qty', 'received']) ||
                    checkHasData(pWork, ['desc', 'qty', 'progress']) ||
                    checkHasData(pReconciliation, ['item', 'actual']);

                if (parsed.type === 'Morning Report') {
                    setActiveTab('morning');
                } else if (parsed.type === 'Evening Report') {
                    setActiveTab('evening');
                } else {
                    if (hasEvening && !hasMorning) {
                        setActiveTab('evening');
                    } else {
                        setActiveTab('morning');
                    }
                }
            } else {
                setData(initialState);
                setCurrentId(null);
            }
        } catch (e) {
            console.error("Error parsing saved DPR data", e);
            setData(initialState);
            setCurrentId(null);
        } finally {
            setIsLoaded(true);
        }
    }, [activeSite]);

    // Save Data Effect (Auto-save draft to LocalStorage)
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data));
        }
    }, [data, activeSite, isLoaded]);

    // Check for existing report on date change
    const [existingReport, setExistingReport] = useState(null);

    useEffect(() => {
        if (data.projectInfo.date && history.length > 0) {
            const found = history.find(h =>
                h.date === data.projectInfo.date &&
                h.project === data.projectInfo.projectName &&
                h.id !== currentId
            );
            setExistingReport(found || null);
        } else {
            setExistingReport(null);
        }
    }, [data.projectInfo.date, data.projectInfo.projectName, history, currentId]);

    const loadExistingReport = () => {
        if (existingReport) {
            if (window.confirm(`Load existing report for ${existingReport.date}? Current unsaved changes will be lost.`)) {
                setData({
                    ...initialState,
                    ...existingReport.data,
                    id: existingReport.id
                });
                setCurrentId(existingReport.id);
                setPhotos(existingReport.photos || []);
                setExistingReport(null);
            }
        }
    };

    // Quick Add State
    const [activeQuickAdd, setActiveQuickAdd] = useState(null);
    const [quickAddForm, setQuickAddForm] = useState({ name: '', mobile: '', address: '', type: '' });

    const handleQuickAdd = (type, value, rowId, section, field) => {
        setActiveQuickAdd({ type, value, rowId, section, field });
        setQuickAddForm({ name: value, mobile: '', address: '', type: type === 'vendor' ? 'Vendor' : type === 'contractor' ? 'Contractor' : '' });
    };

    const handleDeleteTrade = (name) => {
        deleteSavedTrade(name);
    };

    const handleDeleteMaterial = (name) => {
        deleteSavedMaterialName(name);
    };

    const handleDeleteContractor = async (name) => {
        const contact = contractors.find(c => c.companyName === name);
        if (contact && (contact.id || contact._id)) {
            await deleteContact(contact.id || contact._id);
        }
    };

    const handleDeleteVendor = async (name) => {
        const contact = vendors.find(v => v.companyName === name);
        if (contact && (contact.id || contact._id)) {
            await deleteContact(contact.id || contact._id);
        }
    };

    const submitQuickAdd = async () => {
        if (!quickAddForm.name) return;

        if (activeQuickAdd.type === 'contractor') {
            const newContractor = {
                companyName: quickAddForm.name,
                mobileNumber: quickAddForm.mobile,
                address: quickAddForm.address,
                type: 'Contractor',
                gstNumber: ''
            };
            await addContact(newContractor);



        } else if (activeQuickAdd.type === 'vendor') {
            const newVendor = {
                companyName: quickAddForm.name,
                mobileNumber: quickAddForm.mobile,
                address: quickAddForm.address,
                type: 'Vendor',
                gstNumber: ''
            };
            await addContact(newVendor);



        } else if (activeQuickAdd.type === 'trade') {
            addSavedTrade(quickAddForm.name);
        } else if (activeQuickAdd.type === 'material') {
            addSavedMaterialName(quickAddForm.name);
        }

        if (activeQuickAdd.rowId && activeQuickAdd.section && activeQuickAdd.field) {
            updateRow(activeQuickAdd.section, activeQuickAdd.rowId, activeQuickAdd.field, quickAddForm.name);
        }

        setActiveQuickAdd(null);
    };

    // Handlers (unchanged)
    const handleInfoChange = (e) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, projectInfo: { ...prev.projectInfo, [name]: value } }));
    };

    const handleRemarkChange = (e) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, remarks: { ...prev.remarks, [name]: value } }));
    };

    const handleSignatureChange = (e) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, signatures: { ...prev.signatures, [name]: value } }));
    };

    // Table Handlers
    const addRow = (section, template) => {
        setData(prev => ({
            ...prev,
            [section]: [...prev[section], { ...template, id: Date.now() }]
        }));
    };

    const removeRow = (section, id) => {
        setData(prev => ({
            ...prev,
            [section]: prev[section].filter(row => row.id !== id)
        }));
    };

    const updateRow = (section, id, field, value) => {
        setData(prev => {
            const updated = prev[section].map(row => {
                if (row.id === id) {
                    const newRow = { ...row, [field]: value };
                    if (section === 'manpower') {
                        newRow.total = (Number(newRow.skilled) || 0) + (Number(newRow.unskilled) || 0);
                    }
                    if (section === 'reconciliation') {
                        newRow.diff = (Number(newRow.actual) || 0) - (Number(newRow.theory) || 0);
                    }
                    return newRow;
                }
                return row;
            });
            return { ...prev, [section]: updated };
        });
    };

    // Photo Handler with Compression
    const handlePhotoUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length + photos.length > 6) {
            alert("Max 6 photos allowed");
            return;
        }

        const compressImage = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = (event) => {
                    const img = new Image();
                    img.src = event.target.result;
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 800;
                        const MAX_HEIGHT = 800;
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > MAX_WIDTH) {
                                height *= MAX_WIDTH / width;
                                width = MAX_WIDTH;
                            }
                        } else {
                            if (height > MAX_HEIGHT) {
                                width *= MAX_HEIGHT / height;
                                height = MAX_HEIGHT;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress to 70% quality JPEG
                    };
                    img.onerror = (e) => reject(new Error("Failed to load image"));
                };
                reader.onerror = (e) => reject(new Error("Failed to read file"));
            });
        };

        setLoading("Processing Photos...");
        try {
            const compressedPhotos = await Promise.all(files.map(file => compressImage(file)));
            setPhotos(prev => [...prev, ...compressedPhotos]);
        } catch (error) {
            console.error("Error compressing photos:", error);
            alert("Error processing photos");
        } finally {
            setLoading(null);
        }
    };

    // New Day
    const handleNewDay = () => {
        if (window.confirm("Start New Day? This will clear daily data but keep project info.")) {
            const currentNo = data.projectInfo.dprNo;
            const match = currentNo.match(/(\d+)$/);
            let newNo = currentNo;
            if (match) {
                const num = parseInt(match[1]) + 1;
                newNo = currentNo.replace(/(\d+)$/, num.toString().padStart(match[1].length, '0'));
            }

            setData(prev => ({
                ...initialState,
                projectInfo: { ...prev.projectInfo, dprNo: newNo, date: new Date().toISOString().split('T')[0] }
            }));
            setCurrentId(null);
            setPhotos([]);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Save Report (Firestore)
    const saveReport = async (skipPdf = false, reportType = 'DPR') => {
        // Validation
        const currentSiteObj = sites?.find(s => s.id === activeSite || s._id === activeSite);
        if (!activeSite || !currentSiteObj || activeSite === 1 || activeSite === '1') {
            // If activeSite is 1, it's likely the default dummy site which doesn't exist in backend
            // Check if it's actually in sites list with that ID?
            if (!currentSiteObj) {
                alert("Please create and select a valid Site first. 'Main Office' (ID 1) might be a placeholder.");
                return;
            }
        }

        if (!data.projectInfo.projectName || !data.projectInfo.dprNo || !data.projectInfo.date) {
            alert("Please fill in Project Name, DPR No, and Date before saving.");
            return;
        }
        setLoading(skipPdf ? 'Saving...' : 'Generating PDF...');
        await new Promise(r => setTimeout(r, 100));

        try {
            // Generate consistent ID for this save operation
            const reportId = currentId || Date.now().toString();

            // Merge photos into the payload
            const dataToSave = { ...data, photos };

            // Prepare Data for Local Storage (Bypassing Firestore as requested)
            const reportData = {
                date: data.projectInfo.date,
                dprNo: data.projectInfo.dprNo,
                project: data.projectInfo.projectName,
                type: reportType,
                data: JSON.parse(JSON.stringify(dataToSave)), // Deep copy using the updated data
                photos: [...photos],
                id: reportId, // Use the consistent reportId
                siteId: activeSite,
                timestamp: new Date().toISOString()
            };

            // Save to Backend
            let savedId;
            if (currentId) {
                const res = await updateDPR(currentId, dataToSave);
                if (res.success) {
                    savedId = res.dpr._id || res.dpr.id;
                } else {
                    // Smart Recovery for "DPR not found" (e.g. after database wipe)
                    if (res.message && (res.message.toLowerCase().includes('not found') || res.message.includes('Cast to ObjectId failed'))) {
                        console.warn("DPR ID invalid/not found, creating new record instead...");
                        // Strip ID to force creation
                        const { id, _id, ...newData } = dataToSave;
                        const createRes = await addDPR(newData);
                        if (createRes.success) {
                            savedId = createRes.dpr._id || createRes.dpr.id;
                        } else {
                            throw new Error(createRes.message);
                        }
                    } else {
                        throw new Error(res.message);
                    }
                }
            } else {
                const res = await addDPR(dataToSave);
                if (res.success) {
                    savedId = res.dpr._id || res.dpr.id;
                } else {
                    throw new Error(res.message);
                }
            }

            setCurrentId(savedId);

            // Clear loading BEFORE alert to prevent stuck UI
            setLoading(null);

            // Force a small delay to allow React to re-render and remove the overlay
            await new Promise(r => setTimeout(r, 200));

            if (skipPdf) {
                // Use setTimeout to push alert to the end of the event loop
                setTimeout(() => {
                    alert(`${reportType} saved successfully!`);
                }, 10);
            } else {
                await generateDPRPDF(data, photos, 'save');
            }
        } catch (err) {
            console.error(err);
            setLoading(null);
            await new Promise(r => setTimeout(r, 200));
            setTimeout(() => {
                alert("Error saving: " + err.message);
            }, 10);
        }
    };

    const generatePDF = () => saveReport(false, 'DPR');
    const handleSaveDraft = () => saveReport(true, 'Evening Report');
    const handleSaveMorning = () => saveReport(true, 'Morning Report');

    // Safety Checks
    if (!currentUser) {
        return <div className="p-8 text-center">Loading user profile...</div>;
    }

    if (!data || !data.projectInfo || !Array.isArray(data.manpower)) {
        return (
            <div className="p-8 text-center text-red-600">
                <h3>⚠️ Data Error</h3>
                <p>The DPR data seems corrupted.</p>
                <button
                    onClick={() => {
                        localStorage.removeItem(STORAGE_KEY_DATA);
                        window.location.reload();
                    }}
                    className="btn btn-primary mt-4"
                >
                    Reset Data & Fix
                </button>
                <pre className="mt-4 text-xs text-left bg-gray-100 p-2 overflow-auto max-h-40">
                    {JSON.stringify(data, null, 2)}
                </pre>
            </div>
        );
    }

    return (
        <div className="dpr-container">
            {loading && (
                <div className="popup-overlay">
                    <div className="text-white font-bold text-xl">{loading}</div>
                </div>
            )}
            <div className="page-header">
                <h2>Daily Progress Report</h2>
                <div className="actions flex gap-2 items-center">
                    {/* Date Picker for PDF */}
                    <div className="flex flex-col items-end">
                        <input
                            type="date"
                            className={`form-input ${existingReport ? 'border-yellow-500' : ''}`}
                            style={{ padding: '8px', width: 'auto', borderColor: existingReport ? '#f59e0b' : '#cbd5e1' }}
                            name="date"
                            value={data.projectInfo.date}
                            onChange={handleInfoChange}
                            disabled={isViewOnly}
                            title="Select Date for Report"
                        />
                        {existingReport && (
                            <button
                                onClick={loadExistingReport}
                                className="text-xs text-yellow-600 hover:text-yellow-700 underline mt-1 font-medium"
                                title="Click to load the existing report for this date"
                            >
                                ⚠️ Load Existing
                            </button>
                        )}
                    </div>

                    <button onClick={() => onNavigate('dpr-history')} className="btn btn-outline">
                        📜 History
                    </button>
                    {(canAdd) && (
                        <button onClick={handleNewDay} className="btn btn-outline">
                            <span style={{ marginRight: '8px' }}>🔄</span> Start New Day
                        </button>
                    )}
                </div>
            </div>

            {/* Debug Info - Remove later */}
            <div className="text-xs text-gray-400 text-center mb-2">
                Permission: {permission} | Role: {currentUser?.role}
            </div>

            {/* Improved Tabs UI */}
            <div className="flex justify-center mb-8">
                <div className="p-1.5 rounded-2xl inline-flex shadow-sm border border-gray-100 bg-white">
                    <button
                        onClick={() => setActiveTab('morning')}
                        className={`px-8 py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-3 ${activeTab === 'morning' ? 'shadow-md transform scale-105' : 'hover:bg-gray-50'}`}
                        style={{
                            background: activeTab === 'morning' ? 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)' : 'transparent',
                            color: activeTab === 'morning' ? 'white' : '#64748b',
                        }}
                    >
                        <span style={{ fontSize: '1.2rem' }}>🌅</span>
                        Morning Section
                    </button>
                    <button
                        onClick={() => setActiveTab('evening')}
                        className={`px-8 py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-3 ${activeTab === 'evening' ? 'shadow-md transform scale-105' : 'hover:bg-gray-50'}`}
                        style={{
                            background: activeTab === 'evening' ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' : 'transparent',
                            color: activeTab === 'evening' ? 'white' : '#64748b',
                            marginLeft: '8px'
                        }}
                    >
                        <span style={{ fontSize: '1.2rem' }}>🌇</span>
                        Evening Section
                    </button>
                </div>
            </div>



            <div className="premium-form">
                {/* Project Info - Always Visible */}
                <section className="card mb-6 premium-card">
                    <h3 className="section-title">📌 Project Information</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Project Name</label>
                            <input className="form-input" name="projectName" value={data.projectInfo.projectName} onChange={handleInfoChange} placeholder="Enter Project Name" disabled={isViewOnly} />
                        </div>
                        <div className="form-group">
                            <label>Location</label>
                            <input className="form-input" name="location" value={data.projectInfo.location} onChange={handleInfoChange} placeholder="Site Location" disabled={isViewOnly} />
                        </div>
                        <div className="form-group">
                            <label>DPR No</label>
                            <input className="form-input" name="dprNo" value={data.projectInfo.dprNo} onChange={handleInfoChange} disabled={isViewOnly} />
                        </div>

                        <div className="form-group">
                            <label>Weather</label>
                            <SearchableSelect
                                options={[
                                    { label: 'Sunny ☀️', value: 'Sunny ☀️' },
                                    { label: 'Cloudy ☁️', value: 'Cloudy ☁️' },
                                    { label: 'Rainy 🌧️', value: 'Rainy 🌧️' },
                                    { label: 'Windy 💨', value: 'Windy 💨' }
                                ]}
                                value={data.projectInfo.weather}
                                onChange={(val) => handleInfoChange({ target: { name: 'weather', value: val } })}
                                placeholder="Select Weather"
                                disabled={isViewOnly}
                            />
                        </div>
                        <div className="form-group">
                            <label>Temp (°C)</label>
                            <input type="number" className="form-input" name="temp" value={data.projectInfo.temp} onChange={handleInfoChange} placeholder="30" disabled={isViewOnly} />
                        </div>
                    </div>
                </section>

                {/* MORNING SECTION CONTENT */}
                {activeTab === 'morning' && (
                    <>
                        {/* Manpower */}
                        <section className="card mb-6 premium-card">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="section-title">👷 Manpower (Morning)</h3>
                                {canEdit && <button onClick={() => addRow('manpower', { trade: '', contractor: '', skilled: 0, unskilled: 0, total: 0, note: '' })} className="btn btn-sm btn-primary">+ Add Row</button>}
                            </div>
                            <div className="table-responsive">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Trade</th>
                                            <th>Contractor</th>
                                            <th style={{ width: '80px' }}>Skilled</th>
                                            <th style={{ width: '80px' }}>Unskilled</th>
                                            <th style={{ width: '80px' }}>Total</th>
                                            <th>Note</th>
                                            <th style={{ width: '50px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.manpower.map(row => (
                                            <tr key={row.id}>
                                                <td>
                                                    <SearchableSelect
                                                        options={(savedTrades || []).map(t => {
                                                            const label = typeof t === 'object' && t !== null ? (t.name || t.trade || '') : String(t || '');
                                                            return { label, value: label };
                                                        })}
                                                        value={row.trade}
                                                        onChange={(val) => updateRow('manpower', row.id, 'trade', val)}
                                                        placeholder="Select Trade"
                                                        disabled={isViewOnly}
                                                        onAddNew={(val) => handleQuickAdd('trade', val)}
                                                        addNewLabel="Add New Trade"
                                                        onDelete={canDeleteDropdown ? handleDeleteTrade : null}
                                                    />
                                                </td>
                                                <td>
                                                    <SearchableSelect
                                                        options={[...(savedContractors || []), ...(contacts || []).filter(c => c.type && c.type.toLowerCase() === 'contractor')].map(c => {
                                                            const label = typeof c === 'string' ? c : (c.companyName || c.name);
                                                            return { label, value: label };
                                                        })}
                                                        value={row.contractor}
                                                        onChange={(val) => updateRow('manpower', row.id, 'contractor', val)}
                                                        placeholder="Select Contractor"
                                                        disabled={isViewOnly}
                                                        onAddNew={(val) => handleQuickAdd('contractor', val, row.id, 'manpower', 'contractor')}
                                                        addNewLabel="Add New Contractor"
                                                        onDelete={canDeleteDropdown ? deleteSavedContractor : null}
                                                    />
                                                </td>
                                                <td><input type="number" className="form-input sm" value={row.skilled} onChange={(e) => updateRow('manpower', row.id, 'skilled', e.target.value)} disabled={isViewOnly} /></td>
                                                <td><input type="number" className="form-input sm" value={row.unskilled} onChange={(e) => updateRow('manpower', row.id, 'unskilled', e.target.value)} disabled={isViewOnly} /></td>
                                                <td><input className="form-input sm bg-gray-100" readOnly value={row.total || ((Number(row.skilled) || 0) + (Number(row.unskilled) || 0))} /></td>
                                                <td><input className="form-input sm" value={row.note} onChange={(e) => updateRow('manpower', row.id, 'note', e.target.value)} disabled={isViewOnly} /></td>
                                                <td>{canDelete && !isViewOnly && <button onClick={() => removeRow('manpower', row.id)} className="delete-btn" title="Remove Row">×</button>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Work Started (New) */}
                        <section className="card mb-6 premium-card">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="section-title">🚀 Work Started Today</h3>
                                {canEdit && <button onClick={() => addRow('workStarted', { description: '', location: '', note: '' })} className="btn btn-sm btn-primary">+ Add Row</button>}
                            </div>
                            <div className="table-responsive">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '50%' }}>Description of Work</th>
                                            <th>Location / Grid</th>
                                            <th>Note</th>
                                            <th style={{ width: '50px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.workStarted.map(row => (
                                            <tr key={row.id}>
                                                <td><textarea className="form-input sm" rows="1" value={row.description} onChange={(e) => updateRow('workStarted', row.id, 'description', e.target.value)} placeholder="What work is starting?" disabled={isViewOnly} /></td>
                                                <td><input className="form-input sm" value={row.location} onChange={(e) => updateRow('workStarted', row.id, 'location', e.target.value)} placeholder="Location" disabled={isViewOnly} /></td>
                                                <td><input className="form-input sm" value={row.note} onChange={(e) => updateRow('workStarted', row.id, 'note', e.target.value)} disabled={isViewOnly} /></td>
                                                <td>{canDelete && !isViewOnly && <button onClick={() => removeRow('workStarted', row.id)} className="delete-btn" title="Remove Row">×</button>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Save Morning Data Button */}
                        <div className="flex justify-center mt-8 mb-8">
                            <button
                                onClick={handleSaveMorning}
                                className="btn btn-success"
                                style={{
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: 'white',
                                    padding: '12px 32px',
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                                    fontSize: '1.1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                💾 Save Morning Data
                            </button>
                        </div>
                    </>
                )}

                {/* EVENING SECTION CONTENT */}
                {activeTab === 'evening' && (
                    <>
                        {/* Equipment */}
                        <section className="card mb-6 premium-card">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="section-title">🚜 Equipment</h3>
                                {canEdit && <button onClick={() => addRow('equipment', { name: '', qty: '', hrs: '', status: 'Working' })} className="btn btn-sm btn-primary">+ Add Row</button>}
                            </div>
                            <div className="table-responsive">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th style={{ width: '80px' }}>Qty</th>
                                            <th style={{ width: '80px' }}>Hrs</th>
                                            <th>Status</th>
                                            <th style={{ width: '50px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.equipment.map(row => (
                                            <tr key={row.id}>
                                                <td><input className="form-input sm" value={row.name} onChange={(e) => updateRow('equipment', row.id, 'name', e.target.value)} placeholder="Name" disabled={isViewOnly} /></td>
                                                <td><input type="number" className="form-input sm" value={row.qty} onChange={(e) => updateRow('equipment', row.id, 'qty', e.target.value)} disabled={isViewOnly} /></td>
                                                <td><input type="number" className="form-input sm" value={row.hrs} onChange={(e) => updateRow('equipment', row.id, 'hrs', e.target.value)} disabled={isViewOnly} /></td>
                                                <td>
                                                    <SearchableSelect
                                                        options={[
                                                            { label: 'Working', value: 'Working' },
                                                            { label: 'Idle', value: 'Idle' },
                                                            { label: 'Breakdown', value: 'Breakdown' }
                                                        ]}
                                                        value={row.status}
                                                        onChange={(val) => updateRow('equipment', row.id, 'status', val)}
                                                        placeholder="Status"
                                                        disabled={isViewOnly}
                                                    />
                                                </td>
                                                <td>{canDelete && !isViewOnly && <button onClick={() => removeRow('equipment', row.id)} className="delete-btn" title="Remove Row">×</button>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Materials */}
                        <section className="card mb-6 premium-card">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="section-title">🧱 Materials Received</h3>
                                {canEdit && <button onClick={() => addRow('materials', { name: '', unit: 'bags', qty: '', supplier: '', challanImage: null })} className="btn btn-sm btn-primary">+ Add Row</button>}
                            </div>
                            <div className="table-responsive">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Material Name</th>
                                            <th style={{ width: '100px' }}>Unit</th>
                                            <th style={{ width: '80px' }}>Qty</th>
                                            <th>Vendor</th>
                                            <th>Challan</th>
                                            <th style={{ width: '50px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.materials.map(row => (
                                            <tr key={row.id}>
                                                <td>
                                                    <SearchableSelect
                                                        options={[...new Set([...savedMaterialNames, ...(materials || []).map(m => m?.materialName)])].map(m => {
                                                            const label = typeof m === 'object' && m !== null ? (m.name || m.materialName || '') : String(m || '');
                                                            return { label, value: label };
                                                        }).filter(o => o.value)}
                                                        value={row.name}
                                                        onChange={(val) => updateRow('materials', row.id, 'name', val)}
                                                        placeholder="Select Material"
                                                        disabled={isViewOnly}
                                                        onAddNew={(val) => handleQuickAdd('material', val)}
                                                        addNewLabel="Add New Material"
                                                        onDelete={canDeleteDropdown ? handleDeleteMaterial : null}
                                                    />
                                                </td>
                                                <td>
                                                    <SearchableSelect
                                                        options={[
                                                            { label: 'Bags', value: 'bags' },
                                                            { label: 'Kg', value: 'kg' },
                                                            { label: 'Tons', value: 'tons' },
                                                            { label: 'Liters', value: 'liters' },
                                                            { label: 'Nos', value: 'nos' },
                                                            { label: 'CFT', value: 'cft' },
                                                            { label: 'Sq. Ft', value: 'sqft' }
                                                        ]}
                                                        value={row.unit}
                                                        onChange={(val) => updateRow('materials', row.id, 'unit', val)}
                                                        placeholder="Unit"
                                                        disabled={isViewOnly}
                                                    />
                                                </td>
                                                <td><input type="number" className="form-input sm" value={row.qty} onChange={(e) => updateRow('materials', row.id, 'qty', e.target.value)} disabled={isViewOnly} /></td>
                                                <td>
                                                    <SearchableSelect
                                                        options={[...(savedSuppliers || []), ...(contacts || []).filter(c => c.type && c.type.toLowerCase() === 'vendor')].map(s => {
                                                            const label = typeof s === 'string' ? s : (s.companyName || s.name);
                                                            return { label, value: label };
                                                        })}
                                                        value={row.supplier}
                                                        onChange={(val) => updateRow('materials', row.id, 'supplier', val)}
                                                        placeholder="Select Supplier"
                                                        disabled={isViewOnly}
                                                        onAddNew={(val) => handleQuickAdd('vendor', val, row.id, 'materials', 'supplier')}
                                                        addNewLabel="Add New Vendor"
                                                        onDelete={canDeleteDropdown ? deleteSavedSupplier : null}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Work Progress */}
                        <section className="card mb-6 premium-card">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="section-title">🏗️ Work Done Today</h3>
                                {canEdit && <button onClick={() => addRow('work', { desc: '', grid: '', qty: '', unit: '', status: 'Progress' })} className="btn btn-sm btn-primary">+ Add Row</button>}
                            </div>
                            <div className="table-responsive">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '40%' }}>Description</th>
                                            <th>Grid/Loc</th>
                                            <th style={{ width: '80px' }}>Qty</th>
                                            <th style={{ width: '80px' }}>Unit</th>
                                            <th>Status</th>
                                            <th style={{ width: '50px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.work.map(row => (
                                            <tr key={row.id}>
                                                <td><textarea className="form-input sm" rows="1" value={row.desc} onChange={(e) => updateRow('work', row.id, 'desc', e.target.value)} placeholder="Description" disabled={isViewOnly} /></td>
                                                <td><input className="form-input sm" value={row.grid} onChange={(e) => updateRow('work', row.id, 'grid', e.target.value)} disabled={isViewOnly} /></td>
                                                <td><input type="number" className="form-input sm" value={row.qty} onChange={(e) => updateRow('work', row.id, 'qty', e.target.value)} disabled={isViewOnly} /></td>
                                                <td><input className="form-input sm" value={row.unit} onChange={(e) => updateRow('work', row.id, 'unit', e.target.value)} disabled={isViewOnly} /></td>
                                                <td>
                                                    <SearchableSelect
                                                        options={[
                                                            { label: 'Progress', value: 'Progress' },
                                                            { label: 'Done', value: 'Done' }
                                                        ]}
                                                        value={row.status}
                                                        onChange={(val) => updateRow('work', row.id, 'status', val)}
                                                        placeholder="Status"
                                                        disabled={isViewOnly}
                                                    />
                                                </td>
                                                <td>{canDelete && !isViewOnly && <button onClick={() => removeRow('work', row.id)} className="delete-btn" title="Remove Row">×</button>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Reconciliation */}
                        <section className="card mb-6 premium-card" style={{ borderLeft: '4px solid var(--primary-color)' }}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="section-title text-primary">📊 Quantity Reconciliation</h3>
                                {canEdit && <button onClick={() => addRow('reconciliation', { item: '', unit: '', theory: '', actual: '', diff: 0, note: '' })} className="btn btn-sm btn-primary">+ Add Row</button>}
                            </div>
                            <div className="table-responsive">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th style={{ width: '60px' }}>Unit</th>
                                            <th style={{ width: '80px' }}>Theory</th>
                                            <th style={{ width: '80px' }}>Actual</th>
                                            <th style={{ width: '80px' }}>Diff</th>
                                            <th>Note</th>
                                            <th style={{ width: '50px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.reconciliation.map(row => (
                                            <tr key={row.id}>
                                                <td><input className="form-input sm" value={row.item} onChange={(e) => updateRow('reconciliation', row.id, 'item', e.target.value)} placeholder="Item" disabled={isViewOnly} /></td>
                                                <td><input className="form-input sm" value={row.unit} onChange={(e) => updateRow('reconciliation', row.id, 'unit', e.target.value)} disabled={isViewOnly} /></td>
                                                <td><input type="number" className="form-input sm" value={row.theory} onChange={(e) => updateRow('reconciliation', row.id, 'theory', e.target.value)} disabled={isViewOnly} /></td>
                                                <td><input type="number" className="form-input sm" value={row.actual} onChange={(e) => updateRow('reconciliation', row.id, 'actual', e.target.value)} disabled={isViewOnly} /></td>
                                                <td>
                                                    <input
                                                        className="form-input sm font-bold"
                                                        readOnly
                                                        value={row.diff}
                                                        style={{ color: row.diff > 0 ? 'red' : row.diff < 0 ? 'green' : 'inherit' }}
                                                    />
                                                </td>
                                                <td><input className="form-input sm" value={row.note} onChange={(e) => updateRow('reconciliation', row.id, 'note', e.target.value)} disabled={isViewOnly} /></td>
                                                <td>{canDelete && !isViewOnly && <button onClick={() => removeRow('reconciliation', row.id)} className="delete-btn" title="Remove Row">×</button>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Photos */}
                        <section className="card mb-6 premium-card">
                            <h3 className="section-title">📷 Site Photos</h3>
                            <div className="photo-upload-area p-4 border-2 border-dashed rounded text-center mb-4">
                                <label className="cursor-pointer block">
                                    <span className="text-2xl block mb-2">📤</span>
                                    <span className="text-muted">Tap to upload photos (Max 6)</span>
                                    <input type="file" hidden multiple accept="image/*" onChange={handlePhotoUpload} disabled={isViewOnly} />
                                </label>
                            </div>
                            <div className="grid grid-cols-3 gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
                                {photos.map((src, idx) => (
                                    <div key={idx} className="aspect-square bg-gray-100 rounded overflow-hidden relative">
                                        <img src={src} alt="Site" style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                                        <button
                                            onClick={() => setPhotos(prev => prev.filter((_, i) => i !== idx))}
                                            className="absolute top-0 right-0 bg-red-500 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Remarks & Signatures */}
                        <section className="card mb-6 premium-card">
                            <h3 className="section-title">📝 Remarks & Signatures</h3>
                            <div className="form-group mb-4">
                                <label>Hindrances / Delays</label>
                                <textarea className="form-input" rows="2" name="hindrances" value={data.remarks.hindrances} onChange={handleRemarkChange} placeholder="Any issues?" disabled={isViewOnly} />
                            </div>
                            <div className="form-group mb-6">
                                <label>Safety Remarks</label>
                                <textarea className="form-input" rows="2" name="safety" value={data.remarks.safety} onChange={handleRemarkChange} placeholder="Safety notes?" disabled={isViewOnly} />
                            </div>

                            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                                <div className="form-group">
                                    <label>Prepared By</label>
                                    <input className="form-input" name="prepared" value={data.signatures.prepared} onChange={handleSignatureChange} placeholder="Site Eng" disabled={isViewOnly} />
                                </div>
                                <div className="form-group">
                                    <label>Reviewed By</label>
                                    <input className="form-input" name="reviewed" value={data.signatures.reviewed} onChange={handleSignatureChange} placeholder="PM" disabled={isViewOnly} />
                                </div>
                                <div className="form-group">
                                    <label>Approved By</label>
                                    <input className="form-input" name="approved" value={data.signatures.approved} onChange={handleSignatureChange} placeholder="Head" disabled={isViewOnly} />
                                </div>
                            </div>
                        </section>

                        {/* Plan for Tomorrow (New) */}
                        <section className="card mb-6 premium-card">
                            <h3 className="section-title">🔮 Plan for Tomorrow</h3>
                            <div className="form-group">
                                <label>What work is planned for tomorrow morning?</label>
                                <textarea
                                    className="form-input"
                                    rows="3"
                                    value={data.planTomorrow}
                                    onChange={(e) => setData(prev => ({ ...prev, planTomorrow: e.target.value }))}
                                    placeholder="Enter plan for next day..."
                                    disabled={isViewOnly}
                                />
                            </div>
                        </section>
                    </>
                )}

                {/* Generate Button - Only show in Evening */}
                {activeTab === 'evening' && (
                    <div className="fixed-bottom-action" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px', background: 'white', borderTop: '1px solid #eee', zIndex: 40, display: 'flex', justifyContent: 'center', boxShadow: '0 -4px 10px rgba(0,0,0,0.05)' }}>
                        <div className="flex gap-4 w-full max-w-[600px]" style={{ display: 'flex', gap: '16px', width: '100%', maxWidth: '600px' }}>
                            {canEdit && (
                                <button onClick={handleSaveDraft} className="btn btn-outline" style={{ flex: 1, padding: '16px', fontSize: '1.1rem', borderRadius: '12px', background: '#f8fafc' }}>
                                    💾 Save Evening Data
                                </button>
                            )}
                            <button onClick={generatePDF} className="btn btn-primary" style={{ flex: 1, padding: '16px', fontSize: '1.1rem', borderRadius: '12px', boxShadow: '0 4px 14px rgba(0, 86, 179, 0.4)' }}>
                                📄 Generate PDF
                            </button>
                        </div>
                    </div>
                )}
                <div style={{ height: '160px' }}></div>
            </div>

            <style>{`
                .premium-card {
                    border: none;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.05);
                    border-radius: 16px;
                    padding: 24px;
                    transition: transform 0.2s;
                }
                .premium-card:hover {
                    transform: translateY(-2px);
                }
                .section-title {
                    font-size: 1.2rem;
                    font-weight: 700;
                    margin-bottom: 20px;
                    color: var(--text-color);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .form-input {
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    transition: all 0.2s;
                }
                .form-input:focus {
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 3px var(--primary-light);
                }
                .form-input.sm {
                    padding: 8px;
                    font-size: 0.95rem;
                }
                .table-responsive {
                    overflow-x: auto;
                    border-radius: 12px;
                    border: 1px solid #f1f5f9;
                }
                .data-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .data-table th {
                    white-space: nowrap;
                    background: #f8fafc;
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: var(--text-light);
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid #e2e8f0;
                }
                .data-table td {
                    padding: 8px;
                    border-bottom: 1px solid #f1f5f9;
                }
                .data-table tr:last-child td {
                    border-bottom: none;
                }
                .photo-upload-area {
                    background: #f8fafc;
                    border-color: #cbd5e1;
                    transition: all 0.2s;
                }
                .photo-upload-area:hover {
                    background: #f1f5f9;
                    border-color: var(--primary-color);
                }
                .delete-btn {
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background: #fee2e2;
                    color: #ef4444;
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .delete-btn:hover {
                    background: #ef4444;
                    color: white;
                    transform: scale(1.1);
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>

            {/* QUICK ADD MODAL */}
            {activeQuickAdd && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.65)',
                    backdropFilter: 'blur(5px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div
                        className="bg-white"
                        style={{
                            width: '450px',
                            maxWidth: '90%',
                            borderRadius: '16px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            overflow: 'hidden',
                            transform: 'scale(1)',
                            animation: 'scaleIn 0.2s ease-out',
                            backgroundColor: '#ffffff'
                        }}
                    >
                        <div style={{
                            padding: '24px',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#f8fafc'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>
                                Add New {activeQuickAdd.type.charAt(0).toUpperCase() + activeQuickAdd.type.slice(1)}
                            </h3>
                            <button
                                onClick={() => setActiveQuickAdd(null)}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    fontSize: '24px',
                                    color: '#64748b',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    lineHeight: '1'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <div style={{ padding: '24px', backgroundColor: '#ffffff' }}>
                            <div className="form-group mb-4">
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#334155' }}>Name</label>
                                <input
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        outline: 'none',
                                        fontSize: '1rem',
                                        transition: 'border-color 0.2s'
                                    }}
                                    value={quickAddForm.name}
                                    onChange={e => setQuickAddForm({ ...quickAddForm, name: e.target.value })}
                                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                                    autoFocus
                                    placeholder={`Enter ${activeQuickAdd.type} name`}
                                    onKeyDown={(e) => e.key === 'Enter' && submitQuickAdd()}
                                />
                            </div>

                            {(activeQuickAdd.type === 'contractor' || activeQuickAdd.type === 'vendor') && (
                                <>
                                    <div className="form-group mb-4">
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#334155' }}>Mobile Number</label>
                                        <input
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                borderRadius: '8px',
                                                border: '1px solid #cbd5e1',
                                                outline: 'none',
                                                fontSize: '1rem'
                                            }}
                                            value={quickAddForm.mobile}
                                            onChange={e => setQuickAddForm({ ...quickAddForm, mobile: e.target.value })}
                                            placeholder="Optional"
                                        />
                                    </div>
                                    <div className="form-group mb-4">
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#334155' }}>Address</label>
                                        <input
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                borderRadius: '8px',
                                                border: '1px solid #cbd5e1',
                                                outline: 'none',
                                                fontSize: '1rem'
                                            }}
                                            value={quickAddForm.address}
                                            onChange={e => setQuickAddForm({ ...quickAddForm, address: e.target.value })}
                                            placeholder="Optional"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div style={{
                            padding: '16px 24px',
                            background: '#f8fafc',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '12px'
                        }}>
                            <button
                                onClick={() => setActiveQuickAdd(null)}
                                className="btn"
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    background: 'white',
                                    color: '#64748b',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitQuickAdd}
                                className="btn btn-primary"
                                style={{
                                    padding: '10px 24px',
                                    borderRadius: '8px',
                                    background: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    fontWeight: 600,
                                    boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.5)',
                                    cursor: 'pointer'
                                }}
                            >
                                Save & Add
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div >
    );
};

export default DPR;
