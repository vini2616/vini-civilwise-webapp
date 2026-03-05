import React, { createContext, useState, useEffect, useContext, useRef, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../services/api';

const defaultTemplates = [
    {
        id: 'tpl_excavation',
        name: 'Excavation Checklist',
        items: [
            { id: 1, text: 'Site clearance completed' },
            { id: 2, text: 'Center line marking checked' },
            { id: 3, text: 'Depth of excavation verified' },
            { id: 4, text: 'Soil strata verified' },
            { id: 5, text: 'Shoring and strutting provided (if required)' }
        ]
    },
    {
        id: 'tpl_reinforcement',
        name: 'Reinforcement Checklist',
        items: [
            { id: 1, text: 'Bar diameter and grade checked' },
            { id: 2, text: 'Spacing of bars checked' },
            { id: 3, text: 'Lap length and location checked' },
            { id: 4, text: 'Cover blocks provided' },
            { id: 5, text: 'Binding wire tightness checked' }
        ]
    },
    {
        id: 'tpl_concrete',
        name: 'Concrete Pouring Checklist',
        items: [
            { id: 1, text: 'Formwork tightness and support checked' },
            { id: 2, text: 'Reinforcement checked and approved' },
            { id: 3, text: 'Availability of materials (Cement, Sand, Aggregate)' },
            { id: 4, text: 'Mixer and vibrator working condition' },
            { id: 5, text: 'Slump test equipment available' }
        ]
    },
    {
        id: 'tpl_brickwork',
        name: 'Brickwork Checklist',
        items: [
            { id: 1, text: 'Bricks soaked in water' },
            { id: 2, text: 'Mortar mix ratio checked' },
            { id: 3, text: 'Horizontal and vertical alignment checked' },
            { id: 4, text: 'Raking of joints done' },
            { id: 5, text: 'Curing arrangements made' }
        ]
    }
];

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    const { currentUser: authUser, login, logout, signup } = useAuth();

    // Initial Data
    const initialUsers = [
        {
            id: 1,
            name: 'Admin User',
            mobile: '9999999999',
            role: 'Owner',
            salary: 0,
            username: 'admin',
            password: '1234',
            siteId: 1
        }
    ];

    // Helper for safe loading
    const getInitialState = (key, defaultValue) => {
        try {
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : defaultValue;
        } catch (error) {
            console.error(`Error loading ${key} from localStorage:`, error);
            return defaultValue;
        }
    };

    // State
    const [users, setUsers] = useState(() => getInitialState('vini_users', initialUsers));

    // Current User Logic (Merged Auth + Local Profile)
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        if (authUser) {
            // If logged in, use the authUser directly as it now contains token and details
            setCurrentUser(authUser);
        } else {
            setCurrentUser(null);
        }
    }, [authUser]);

    // 5. Auto-Sync: Polling and OnFocus


    // Helper for safe loading with site scope
    const getSiteState = (key, defaultValue, siteId) => {
        if (!siteId) return defaultValue;
        try {
            const saved = localStorage.getItem(`${key}_${siteId}`);
            return saved ? JSON.parse(saved) : defaultValue;
        } catch (error) {
            console.error(`Error loading ${key} from localStorage:`, error);
            return defaultValue;
        }
    };



    // State - Initialize with empty or default, then load based on activeSite
    const [attendance, setAttendance] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [siteImages, setSiteImages] = useState([]);
    const [dprs, setDprs] = useState([]); // New DPR State

    // Global State (Not site specific)
    const [sites, setSites] = useState(() => getInitialState('vini_sites', [{ id: 1, name: 'Main Office', address: 'Headquarters' }]));
    const [activeSite, setActiveSite] = useState(() => getInitialState('vini_active_site', sites[0]?.id || 1));
    const [companies, setCompanies] = useState(() => getInitialState('vini_companies', []));
    const [activeCompanyId, setActiveCompanyId] = useState(() => getInitialState('vini_active_company_id', null));

    // Ref for activeSite to avoid stale closures in effects
    const activeSiteRef = useRef(activeSite);
    useEffect(() => { activeSiteRef.current = activeSite; }, [activeSite]);

    // Site Specific States
    const [customCategories, setCustomCategories] = useState([]);
    const [savedParties, setSavedParties] = useState([]);
    const [messages, setMessages] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [materials, setMaterials] = useState([]);

    const [savedSuppliers, setSavedSuppliers] = useState([]);
    const [savedContractors, setSavedContractors] = useState([]);
    const [savedTrades, setSavedTrades] = useState([]);
    const [savedMaterialNames, setSavedMaterialNames] = useState([]);
    const [savedBillItems, setSavedBillItems] = useState([]);
    const [savedUnits, setSavedUnits] = useState(['bags', 'kg', 'tons', 'liters', 'nos', 'cft', 'sqft']);
    const [savedMaterialTypes, setSavedMaterialTypes] = useState(['Concrete', 'Steel', 'Brick', 'Sand', 'Other']);
    const [drawings, setDrawings] = useState([]);
    const [concreteTests, setConcreteTests] = useState([]);
    const [steelTests, setSteelTests] = useState([]);
    const [brickTests, setBrickTests] = useState([]);
    const [checklistTemplates, setChecklistTemplates] = useState(defaultTemplates);
    const [checklists, setChecklists] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [projectTasks, setProjectTasks] = useState([]);
    const [estimations, setEstimations] = useState([]);
    const [customShapes, setCustomShapes] = useState([]);
    const [activeEstimationFolder, setActiveEstimationFolder] = useState(null);
    const [bills, setBills] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [manpowerList, setManpowerList] = useState([]);
    const [manpowerAttendance, setManpowerAttendance] = useState([]);
    const [manpowerPayments, setManpowerPayments] = useState([]);




    // Fetch Companies on Load
    useEffect(() => {
        if (currentUser && currentUser.token) {
            api.getCompanies(currentUser.token).then(fetchedCompanies => {
                if (Array.isArray(fetchedCompanies)) {
                    setCompanies(fetchedCompanies);
                    // Auto-select first company if none selected
                    if (fetchedCompanies.length > 0) {
                        // Check if current activeCompanyId is valid, if not, switch to first
                        const currentValid = fetchedCompanies.find(c => (c._id || c.id) === activeCompanyId);
                        if (!activeCompanyId || !currentValid) {
                            setActiveCompanyId(fetchedCompanies[0]._id || fetchedCompanies[0].id);
                        }
                    }
                }
            }).catch(e => console.error("Failed to fetch companies", e));
        }
    }, [currentUser, activeCompanyId]); // Added activeCompanyId dependency to check against it

    // Fetch Sites on Load
    useEffect(() => {
        if (currentUser && currentUser.token) {
            // Only fetch sites if activeCompanyId is a valid ObjectId (24 hex chars) or numeric ID
            if (activeCompanyId && (/^[0-9a-fA-F]{24}$/.test(activeCompanyId) || /^\d+$/.test(activeCompanyId))) {
                api.getSites(currentUser.token, activeCompanyId).then(fetchedSites => {
                    if (Array.isArray(fetchedSites) && fetchedSites.length > 0) {
                        setSites(fetchedSites);
                        // If activeSite is 1 (default) or not in fetched sites, switch to first fetched site
                        const currentActiveExists = fetchedSites.find(s => s._id === activeSite || s.id === activeSite);
                        if (!currentActiveExists) {
                            setActiveSite(fetchedSites[0]._id || fetchedSites[0].id);
                        }
                    } else {
                        setSites([]);
                    }
                }).catch(e => console.error("Failed to fetch sites", e));
            }
        }
    }, [currentUser, activeCompanyId]);

    const refreshData = React.useCallback(async () => {
        if (activeSite && currentUser && currentUser.token) {
            // Fetch users for this specific site
            const isValidSiteId = /^[0-9a-fA-F]{24}$/.test(activeSite) || /^\d+$/.test(activeSite);
            if (isValidSiteId) {
                api.getUsers(currentUser.token, activeSite).then(siteUsers => {
                    if (Array.isArray(siteUsers)) setUsers(siteUsers);
                }).catch(err => console.error("Failed to fetch site users:", err));
            } else {
                // Fallback: Fetch all company users (or unassigned) if site is invalid (e.g. "1")
                // Pass activeCompanyId (can be null)
                api.getUsers(currentUser.token, null, activeCompanyId).then(companyUsers => {
                    if (Array.isArray(companyUsers)) setUsers(companyUsers);
                }).catch(err => console.error("Failed to fetch company users:", err));
            }

            if (isValidSiteId) {
                // Fetch Transactions
                api.getTransactions(currentUser.token, activeSite).then(fetchedTx => {
                    if (Array.isArray(fetchedTx)) setTransactions(fetchedTx);
                }).catch(err => console.error("Failed to fetch transactions:", err));

                // Fetch DPRs
                api.getDPRs(currentUser.token, activeSite).then(fetchedDPRs => {
                    if (Array.isArray(fetchedDPRs)) setDprs(fetchedDPRs);
                }).catch(err => console.error("Failed to fetch DPRs:", err));

                // Fetch Manpower Data
                api.getManpowerResources(currentUser.token, activeSite).then(res => {
                    if (Array.isArray(res)) setManpowerList(res);
                }).catch(e => console.error("Failed to fetch Manpower:", e));

                api.getManpowerAttendance(currentUser.token, activeSite).then(res => {
                    if (Array.isArray(res)) setManpowerAttendance(res);
                }).catch(e => console.error("Failed to fetch Attendance:", e));

                api.getManpowerPayments(currentUser.token, activeSite).then(res => {
                    if (Array.isArray(res)) setManpowerPayments(res);
                }).catch(e => console.error("Failed to fetch Payments:", e));

                // Fetch Chat Messages
                api.getMessages(currentUser.token, activeSite).then(res => {
                    if (Array.isArray(res)) setMessages(res);
                }).catch(e => console.error("Failed to fetch Messages:", e));

                // Fetch Documents
                // Fetch Documents (General)
                api.getDocuments(currentUser.token, activeSite, 'general').then(res => {
                    if (Array.isArray(res)) setDocuments(res);
                }).catch(e => console.error("Failed to fetch Documents:", e));

                // Fetch Drawings
                api.getDocuments(currentUser.token, activeSite, 'drawing').then(res => {
                    if (Array.isArray(res)) setDrawings(res);
                }).catch(e => console.error("Failed to fetch Drawings:", e));

                // Fetch Reports
                api.getReports(currentUser.token, activeSite).then(res => {
                    if (Array.isArray(res)) {
                        setConcreteTests(res.filter(r => r.type === 'concrete'));
                        setSteelTests(res.filter(r => r.type === 'steel'));
                        setBrickTests(res.filter(r => r.type === 'brick'));
                    }
                }).catch(e => console.error("Failed to fetch Reports:", e));

                // Fetch Reports
                console.log("Fetching reports for site:", activeSite);
                api.getReports(currentUser.token, activeSite).then(res => {
                    console.log("Reports fetched:", res);
                    if (Array.isArray(res)) {
                        setConcreteTests(res.filter(r => r.type === 'concrete'));
                        setSteelTests(res.filter(r => r.type === 'steel'));
                        setBrickTests(res.filter(r => r.type === 'brick'));
                    }
                }).catch(e => console.error("Failed to fetch Reports:", e));

                // Fetch Estimations
                api.getEstimations(currentUser.token, activeSite).then(async fetched => {
                    if (Array.isArray(fetched)) {
                        // Migration Logic: If API Empty & Local Storage Has Data -> Sync to Server
                        const localKey = `vini_estimations_${activeSite}`;
                        const localData = localStorage.getItem(localKey);
                        if (fetched.length === 0 && localData) {
                            try {
                                const parsed = JSON.parse(localData);
                                if (Array.isArray(parsed) && parsed.length > 0) {
                                    console.log("Migrating local estimations to backend...");
                                    const migrated = [];
                                    for (const est of parsed) {
                                        const { id, _id, ...data } = est; // Drop local IDs
                                        const newEst = await api.createEstimation(currentUser.token, { ...data, siteId: activeSite });
                                        if (newEst._id) migrated.push(newEst);
                                    }
                                    setEstimations(migrated);
                                    localStorage.removeItem(localKey); // Clear local after migration
                                    return;
                                }
                            } catch (e) { console.error("Migration failed", e); }
                        }
                        const parsed = fetched.map(est => {
                            if (typeof est.items === 'string') {
                                try { return { ...est, items: JSON.parse(est.items) }; } catch (e) { return { ...est, items: [] }; }
                            }
                            return est;
                        });
                        setEstimations(parsed);
                    }
                }).catch(err => console.error("Failed to fetch estimations:", err));

                // Fetch Inventory
                api.getInventory(currentUser.token, activeSite).then(fetchedInv => {
                    if (Array.isArray(fetchedInv)) setInventory(fetchedInv);
                }).catch(err => console.error("Failed to fetch inventory:", err));

                // Fetch Contacts
                api.getContacts(currentUser.token, activeSite).then(fetchedContacts => {
                    if (Array.isArray(fetchedContacts)) setContacts(fetchedContacts);
                }).catch(err => console.error("Failed to fetch contacts:", err));

                // Fetch Attendance
                api.getAttendance(currentUser.token, activeSite).then(fetched => {
                    if (Array.isArray(fetched)) setAttendance(fetched);
                }).catch(err => console.error("Failed to fetch attendance:", err));

                // Fetch Materials
                api.getMaterials(currentUser.token, activeSite).then(fetched => {
                    if (Array.isArray(fetched)) setMaterials(fetched);
                }).catch(err => console.error("Failed to fetch materials:", err));

                // Fetch Checklists
                api.getChecklists(currentUser.token, activeSite).then(async fetched => {
                    if (Array.isArray(fetched)) {
                        // Split into templates and instances
                        const templates = fetched.filter(c => c.type === 'Template');
                        const instances = fetched.filter(c => c.type !== 'Template');

                        setChecklistTemplates(templates);

                        // Migration Logic for Instances
                        const localKey = `vini_checklists_${activeSite}`;
                        const localData = localStorage.getItem(localKey);
                        if (instances.length === 0 && localData) {
                            try {
                                const parsed = JSON.parse(localData);
                                if (Array.isArray(parsed) && parsed.length > 0) {
                                    console.log("Migrating local checklists to backend...");
                                    const migrated = [];
                                    for (const item of parsed) {
                                        const { id, _id, ...data } = item;
                                        const newChecklist = await api.createChecklist(currentUser.token, { ...data, siteId: activeSite });
                                        if (newChecklist._id) migrated.push(newChecklist);
                                    }
                                    setChecklists(migrated);
                                    localStorage.removeItem(localKey);
                                    return;
                                }
                            } catch (e) { console.error("Checklist migration failed", e); }
                        }
                        setChecklists(instances);
                    }
                }).catch(err => console.error("Failed to fetch checklists:", err));

                // Fetch Project Tasks
                api.getProjectTasks(currentUser.token, activeSite).then(async fetched => {
                    if (Array.isArray(fetched)) {
                        const localKey = `vini_project_tasks_${activeSite}`;
                        const localData = localStorage.getItem(localKey);
                        if (fetched.length === 0 && localData) {
                            try {
                                const parsed = JSON.parse(localData);
                                if (Array.isArray(parsed) && parsed.length > 0) {
                                    console.log("Migrating local project tasks to backend...");
                                    const migrated = [];
                                    for (const item of parsed) {
                                        const { id, _id, ...data } = item;
                                        const newTask = await api.createProjectTask(currentUser.token, { ...data, siteId: activeSite });
                                        if (newTask._id) migrated.push(newTask);
                                    }
                                    setProjectTasks(migrated);
                                    localStorage.removeItem(localKey);
                                    return;
                                }
                            } catch (e) { console.error("Project Task migration failed", e); }
                        }
                        setProjectTasks(fetched);
                    }
                }).catch(err => console.error("Failed to fetch project tasks:", err));

                // Fetch Site Settings (Master Data)
                api.getSiteSettings(currentUser.token, activeSite).then(settings => {
                    if (settings && !settings.message && !settings.error) {
                        console.log("Loaded Site Settings:", settings);
                        // If it's an array (legacy) take first, otherwise it's object
                        const config = Array.isArray(settings) ? settings[0] : settings;
                        if (config) {
                            // Helper to ensure array
                            const parseList = (val) => {
                                if (Array.isArray(val)) return val;
                                if (typeof val === 'string') {
                                    try {
                                        const parsed = JSON.parse(val);
                                        return Array.isArray(parsed) ? parsed : [];
                                    } catch (e) { return []; }
                                }
                                return [];
                            };

                            setSavedParties(parseList(config.parties));
                            setSavedBillItems(parseList(config.billItems));
                            setSavedSuppliers(parseList(config.suppliers));
                            setSavedTrades(parseList(config.trades));
                            setCustomCategories(parseList(config.customCategories));
                            setSavedMaterialNames(parseList(config.materialNames));
                            setSavedUnits(parseList(config.units));
                            setSavedMaterialTypes(parseList(config.materialTypes));
                        }
                    } else if (settings && (settings.message || settings.error)) {
                        console.error("Site Settings Error Response:", settings);
                    }
                }).catch(err => console.error("Failed to fetch site settings:", err));

                // Fetch Bills
                api.getBills(currentUser.token, activeSite).then(fetchedBills => {
                    if (Array.isArray(fetchedBills)) setBills(fetchedBills);
                }).catch(err => console.error("Failed to fetch bills:", err));
                // Fetch Custom Shapes
                api.getCustomShapes(currentUser.token, activeSite).then(fetchedShapes => {
                    if (Array.isArray(fetchedShapes)) setCustomShapes(fetchedShapes);
                }).catch(err => console.error("Failed to fetch custom shapes:", err));
            }
        }
    }, [activeSite, currentUser, activeCompanyId]);

    // 5. Auto-Sync: Polling and OnFocus
    useEffect(() => {
        if (!currentUser?.token || !activeSite) return;

        // This useEffect handles the interval and focus events

        // Auto-refresh when window gains focus
        const onFocus = () => {
            console.log("Window focused, auto-refreshing...");
            refreshData();
        };

        window.addEventListener('focus', onFocus);

        // Auto-refresh interval (every 30 seconds)
        const intervalId = setInterval(() => {
            console.log("Auto-refreshing data...");
            refreshData();
        }, 30000); // 30 seconds

        return () => {
            window.removeEventListener('focus', onFocus);
            clearInterval(intervalId);
        };
    }, [refreshData, currentUser, activeSite]);

    // Initial Data Load & Refresh on Change
    useEffect(() => {
        refreshData();
    }, [refreshData]);

    // Load Site Specific Data when Active Site Changes
    useEffect(() => {
        if (activeSite) {
            const isValidSiteId = /^[0-9a-fA-F]{24}$/.test(activeSite) || /^\d+$/.test(activeSite);

            // Legacy/Local persistence loading (keep strictly for fallback or migration)
            // But if we want to enforce Backend, we should maybe clear legacy?
            // For now, let's just protect the API calls below.
            setAttendance(getSiteState('vini_attendance', [], activeSite));
            // Transactions are fetched from API, but we might have local ones? No, API only now.
            // setTransactions(getSiteState('vini_transactions', [], activeSite)); 
            setSiteImages(getSiteState('vini_site_images', [], activeSite));
            setCustomCategories(getSiteState('vini_custom_categories', [], activeSite));
            setSavedParties(getSiteState('vini_saved_parties', [], activeSite));
            setMessages(getSiteState('vini_messages', [], activeSite));
            setContacts([]); // Init contacts as empty array
            setMaterials(getSiteState('vini_materials', [], activeSite));

            setSavedSuppliers(getSiteState('vini_saved_suppliers', [], activeSite));
            setSavedContractors(getSiteState('vini_saved_contractors', [], activeSite));
            setSavedTrades(getSiteState('vini_saved_trades', [], activeSite));
            setSavedMaterialNames(getSiteState('vini_saved_material_names', [], activeSite));
            setSavedBillItems(getSiteState('vini_saved_bill_items', [], activeSite));
            setSavedUnits(getSiteState('vini_saved_units', ['bags', 'kg', 'tons', 'liters', 'nos', 'cft', 'sqft'], activeSite));
            setSavedMaterialTypes(getSiteState('vini_saved_material_types', ['Concrete', 'Steel', 'Brick', 'Sand', 'Other'], activeSite));
            setDrawings(getSiteState('vini_drawings', [], activeSite));
            setConcreteTests(getSiteState('vini_concrete_tests', [], activeSite));
            setSteelTests(getSiteState('vini_steel_tests', [], activeSite));
            setBrickTests(getSiteState('vini_brick_tests', [], activeSite));
            // setChecklistTemplates(getSiteState('vini_checklist_templates', defaultTemplates, activeSite));
            // setChecklists(getSiteState('vini_checklists', [], activeSite));
            // setDocuments(getSiteState('vini_documents', [], activeSite));
            // setProjectTasks(getSiteState('vini_project_tasks', [], activeSite));
            // setEstimations(getSiteState('vini_estimations', [], activeSite));
            // setCustomShapes(getSiteState('vini_custom_shapes', [], activeSite));
            // setActiveEstimationFolder(getSiteState('vini_active_estimation_folder', null, activeSite));
            // setBills(getSiteState('vini_bills', [], activeSite));
            setInventory([]); // Initialize empty, fetch from API below

            // Call refreshData to fetch API-managed data
            if (currentUser && currentUser.token && isValidSiteId) {
                refreshData();
            }
        }
    }, [activeSite, currentUser, refreshData]); // Added refreshData to dependencies

    // Persistence with Site Scope
    const saveToSiteStorage = (key, data) => {
        const currentSiteId = activeSiteRef.current;
        if (currentSiteId) {
            try {
                localStorage.setItem(`${key}_${currentSiteId}`, JSON.stringify(data));
            } catch (error) {
                console.error(`Failed to save ${key} to localStorage:`, error);
            }
        }
    };

    // Persistence Global
    const saveToStorage = (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error(`Failed to save ${key} to localStorage:`, error);
        }
    };

    // useEffect(() => { saveToSiteStorage('vini_attendance', attendance); }, [attendance]); // Disabled for Backend Sync
    // Transactions are API managed now
    // useEffect(() => { saveToSiteStorage('vini_transactions', transactions); }, [transactions, activeSite]); 
    useEffect(() => { saveToSiteStorage('vini_site_images', siteImages); }, [siteImages]);

    // Global Persistence
    useEffect(() => { saveToStorage('vini_sites', sites); }, [sites]);
    useEffect(() => { saveToStorage('vini_active_site', activeSite); }, [activeSite]);
    useEffect(() => { saveToStorage('vini_companies', companies); }, [companies]);
    useEffect(() => { saveToStorage('vini_active_company_id', activeCompanyId); }, [activeCompanyId]);

    // Auto-select first company if none selected OR if selected is invalid
    useEffect(() => {
        if (companies.length > 0) {
            const isValid = companies.some(c => (c.id || c._id) === activeCompanyId);
            if (!activeCompanyId || !isValid) {
                const firstId = companies[0].id || companies[0]._id;
                if (firstId) {
                    console.log("Auto-selecting company (invalid or missing):", firstId);
                    setActiveCompanyId(firstId);
                }
            }
        }
    }, [companies, activeCompanyId]);

    // Site Specific Persistence
    useEffect(() => { saveToSiteStorage('vini_custom_categories', customCategories); }, [customCategories]);
    useEffect(() => { saveToSiteStorage('vini_saved_parties', savedParties); }, [savedParties]);
    useEffect(() => { saveToSiteStorage('vini_messages', messages); }, [messages]);
    // useEffect(() => { saveToSiteStorage('vini_contacts', contacts); }, [contacts]); // Disabled for Backend Sync
    // useEffect(() => { saveToSiteStorage('vini_materials', materials); }, [materials]); // Disabled for Backend Sync
    useEffect(() => { saveToSiteStorage('vini_saved_suppliers', savedSuppliers); }, [savedSuppliers]);
    useEffect(() => { saveToSiteStorage('vini_saved_trades', savedTrades); }, [savedTrades]);
    useEffect(() => { saveToSiteStorage('vini_saved_material_names', savedMaterialNames); }, [savedMaterialNames]);
    useEffect(() => { saveToSiteStorage('vini_saved_bill_items', savedBillItems); }, [savedBillItems]);
    useEffect(() => { saveToSiteStorage('vini_saved_units', savedUnits); }, [savedUnits]);
    useEffect(() => { saveToSiteStorage('vini_saved_material_types', savedMaterialTypes); }, [savedMaterialTypes]);
    useEffect(() => { saveToSiteStorage('vini_drawings', drawings); }, [drawings]);
    useEffect(() => { saveToSiteStorage('vini_concrete_tests', concreteTests); }, [concreteTests]);
    useEffect(() => { saveToSiteStorage('vini_steel_tests', steelTests); }, [steelTests]);
    useEffect(() => { saveToSiteStorage('vini_brick_tests', brickTests); }, [brickTests]);
    useEffect(() => { saveToSiteStorage('vini_checklist_templates', checklistTemplates); }, [checklistTemplates]);
    // useEffect(() => { saveToSiteStorage('vini_checklists', checklists); }, [checklists]);
    // useEffect(() => { saveToSiteStorage('vini_documents', documents); }, [documents]);
    // useEffect(() => { saveToSiteStorage('vini_project_tasks', projectTasks); }, [projectTasks]);
    // useEffect(() => { saveToSiteStorage('vini_estimations', estimations); }, [estimations]);
    // useEffect(() => { saveToSiteStorage('vini_custom_shapes', customShapes); }, [customShapes]);
    // useEffect(() => { saveToSiteStorage('vini_active_estimation_folder', activeEstimationFolder); }, [activeEstimationFolder]);
    // useEffect(() => { saveToSiteStorage('vini_bills', bills); }, [bills]);
    // useEffect(() => { saveToSiteStorage('vini_inventory', inventory); }, [inventory]); // Disabled for Backend Sync

    // CRUD Operations for Users
    const addUser = async (user) => {
        if (currentUser && currentUser.token) {
            try {
                // Auto-generate email if missing (Backend requires it)
                const isValidSiteId = activeSite && (/^[0-9a-fA-F]{24}$/.test(activeSite) || /^\d+$/.test(activeSite));
                const isValidCompanyId = activeCompanyId && (/^[0-9a-fA-F]{24}$/.test(activeCompanyId) || /^\d+$/.test(activeCompanyId));

                const userData = {
                    ...user,
                    email: user.email || `${user.username.toLowerCase().replace(/\s+/g, '')}@vini.app`,
                    companyId: isValidCompanyId ? activeCompanyId : null,
                    siteId: isValidSiteId ? activeSite : null,
                    sites: isValidSiteId ? [Number(activeSite)] : [] // Ensure sites array is populated for permissions
                };

                const newUser = await api.createUser(currentUser.token, userData);
                if (newUser._id || newUser.id) {
                    setUsers(prev => [...prev, newUser]);
                    return { success: true, user: newUser };
                } else {
                    console.error("Failed to create user (API response):", newUser);
                    return { success: false, message: newUser.message || "Failed to create user" };
                }
            } catch (e) {
                console.error("Failed to add user (Exception):", e);
                const errorMessage = e.response?.data?.message || e.message || "Network Error";
                return { success: false, message: errorMessage };
            }
        } else {
            // Fallback for local dev without auth
            const newUser = { ...user, id: users.length ? Math.max(...users.map(u => u.id)) + 1 : 1 };
            setUsers(prev => [...prev, newUser]);
            return { success: true, user: newUser };
        }
    };

    const getAllUsers = async () => {
        if (currentUser && currentUser.token) {
            try {
                // Fetch users for the company, or all if no company (backend handles permission)
                const allUsers = await api.getUsers(currentUser.token, null, activeCompanyId);
                return Array.isArray(allUsers) ? allUsers : [];
            } catch (e) {
                console.error("Failed to fetch all users", e);
                return [];
            }
        }
        return [];
    };

    const assignUserToSite = async (userOrId) => {
        if (currentUser && currentUser.token && activeSite) {
            try {
                // If user object passed, extract ID, otherwise assume it is ID
                const userId = (typeof userOrId === 'object') ? (userOrId._id || userOrId.id) : userOrId;

                // If adding a user who is not in the current company, try to update their availability?
                // For now, standard assignment.
                const res = await api.assignUserToSite(currentUser.token, userId, activeSite);

                // Backend returns { message: 'User assigned to site', sites: [...] }
                if (res.message === 'User assigned to site' || res.sites) {
                    // Optimistically update users list
                    // If we have the full user object, add it
                    if (typeof userOrId === 'object') {
                        setUsers(prev => {
                            const exists = prev.some(u => (u.id || u._id) === (userOrId.id || userOrId._id));
                            if (exists) return prev;
                            // Ensure the user object has the site added locally for immediate feedback
                            const updatedUser = { ...userOrId, sites: [...(userOrId.sites || []), activeSite] };
                            return [...prev, updatedUser];
                        });
                    } else {
                        // If only ID, we can't easily add to list without fetching.
                        // Refresh users list
                        const userList = await api.getUsers(currentUser.token, activeSite);
                        if (Array.isArray(userList)) setUsers(userList);
                    }
                    return { success: true };
                } else {
                    return { success: false, message: res.message };
                }
            } catch (e) {
                console.error("Failed to assign user", e);
                return { success: false, message: e.message };
            }
        }
        return { success: false, message: "Not authenticated or no active site" };
    };

    const updateUser = async (userId, updates) => {
        if (currentUser && currentUser.token) {
            try {
                // Handle case where first argument is object (legacy support if any)
                const id = typeof userId === 'object' ? userId.id : userId;
                const data = typeof userId === 'object' ? userId : updates;

                const updatedUser = await api.updateUser(currentUser.token, id, data);
                if (updatedUser._id || updatedUser.id) {
                    setUsers(prev => prev.map(user => (user.id === id || user._id === id) ? updatedUser : user));
                    return { success: true, user: updatedUser };
                } else {
                    return { success: false, message: updatedUser.message || "Failed to update user" };
                }
            } catch (e) {
                console.error("Failed to update user", e);
                return { success: false, message: "Network Error" };
            }
        }
    };

    const deleteUser = async (userId) => {
        if (currentUser && currentUser.token && activeSite) {
            try {
                const res = await api.removeUserFromSite(currentUser.token, userId, activeSite);
                // Backend returns 'User removed from site'
                if (res.message === 'User removed from site' || res.message === 'User removed from site successfully') {
                    setUsers(prev => prev.filter(user => user.id !== userId && user._id !== userId));
                    return { success: true };
                } else {
                    console.error("Failed to remove user:", res);
                    return { success: false, message: res.message };
                }
            } catch (e) {
                console.error("Failed to remove user", e);
                return { success: false, message: "Network Error" };
            }
        }
    };

    const deleteGlobalUser = async (userId) => {
        if (currentUser && currentUser.token) {
            try {
                const res = await api.deleteUser(currentUser.token, userId);
                if (res.message === 'User deleted successfully') {
                    setUsers(prev => prev.filter(user => user.id !== userId && user._id !== userId));
                    return { success: true };
                } else {
                    return { success: false, message: res.message };
                }
            } catch (e) {
                console.error("Failed to delete user globally", e);
                return { success: false, message: "Network Error" };
            }
        }
    };

    // Login function removed in favor of AuthContext


    // CRUD Operations for Attendance
    const addAttendance = async (record) => {
        if (currentUser && currentUser.token && activeSite) {
            try {
                const newRecord = await api.createAttendance(currentUser.token, { ...record, siteId: activeSite });
                if (newRecord._id || newRecord.id) {
                    setAttendance(prev => {
                        // Replace if exists (shouldn't happen with API check but safely) or add
                        const exists = prev.find(a => a.date === newRecord.date);
                        if (exists) return prev.map(a => a.date === newRecord.date ? newRecord : a);
                        return [newRecord, ...prev];
                    });
                    return { success: true, record: newRecord };
                }
            } catch (e) {
                console.error("Failed to add attendance", e);
                return { success: false, message: "Network Error" };
            }
        }
    };

    const updateAttendance = async (updatedRecord) => {
        if (currentUser && currentUser.token) {
            try {
                const id = updatedRecord._id || updatedRecord.id;
                const result = await api.updateAttendance(currentUser.token, id, updatedRecord);
                if (result._id || result.id) {
                    setAttendance(prev => prev.map(a => (a._id === id || a.id === id) ? result : a));
                    return { success: true, record: result };
                }
            } catch (e) {
                console.error("Failed to update attendance", e);
                return { success: false, message: "Network Error" };
            }
        }
    };

    const deleteAttendance = async (recordId) => {
        if (currentUser && currentUser.token) {
            try {
                await api.deleteAttendance(currentUser.token, recordId);
                setAttendance(prev => prev.filter(a => (a._id !== recordId && a.id !== recordId)));
                return { success: true };
            } catch (e) {
                console.error("Failed to delete attendance", e);
                return { success: false, message: "Network Error" };
            }
        }
    };

    // CRUD Operations for Transactions
    // CRUD Operations for Transactions
    const addTransaction = async (transaction) => {
        if (currentUser && currentUser.token && activeSite) {
            try {
                const newTx = await api.createTransaction(currentUser.token, { ...transaction, siteId: activeSite });
                if (newTx._id || newTx.id) {
                    setTransactions(prev => [newTx, ...prev]);
                }
            } catch (e) {
                console.error("Failed to add transaction", e);
            }
        }
    };

    const updateTransaction = async (id, updatedData) => {
        if (currentUser && currentUser.token) {
            try {
                const updatedTx = await api.updateTransaction(currentUser.token, id, updatedData);
                if (updatedTx._id || updatedTx.id) {
                    setTransactions(prev => prev.map(t => (t._id === id || t.id === id) ? updatedTx : t));
                }
            } catch (e) {
                console.error("Failed to update transaction", e);
            }
        }
    };

    const deleteTransaction = async (id) => {
        if (currentUser && currentUser.token) {
            try {
                await api.deleteTransaction(currentUser.token, id);
                setTransactions(prev => prev.filter(t => t._id !== id));
            } catch (e) {
                console.error("Failed to delete transaction", e);
            }
        }
    };

    // CRUD Operations for Site Images
    const addSiteImage = (image) => {
        setSiteImages(prev => [...prev, { ...image, id: prev.length ? Math.max(...prev.map(img => img.id)) + 1 : 1 }]);
    };

    const deleteSiteImage = (imageId) => {
        setSiteImages(prev => prev.filter(image => image.id !== imageId));
    };

    const addContact = async (contact) => {
        if (currentUser && currentUser.token && activeSite) {
            try {
                const newContact = await api.createContact(currentUser.token, { ...contact, siteId: activeSite });
                if (newContact._id || newContact.id) {
                    setContacts(prev => [newContact, ...prev]);
                    return { success: true };
                }
            } catch (e) {
                console.error("Failed to add contact", e);
                return { success: false, message: e.message };
            }
        }
    };

    const updateContact = async (id, updatedData) => {
        if (currentUser && currentUser.token) {
            try {
                const updatedContact = await api.updateContact(currentUser.token, id, updatedData);
                if (updatedContact._id || updatedContact.id) {
                    setContacts(prev => prev.map(c => (c._id === id || c.id === id) ? updatedContact : c));
                    return { success: true };
                }
            } catch (e) {
                console.error("Failed to update contact", e);
                return { success: false, message: e.message };
            }
        }
    };

    const deleteContact = async (id) => {
        if (currentUser && currentUser.token) {
            try {
                await api.deleteContact(currentUser.token, id);
                setContacts(prev => prev.filter(c => c._id !== id && c.id !== id));
                return { success: true };
            } catch (e) {
                console.error("Failed to delete contact", e);
                return { success: false, message: e.message };
            }
        }
    };

    // CRUD Operations for Sites
    const addSite = async (newSite) => {
        if (currentUser && currentUser.token) {
            try {
                if (!activeCompanyId) throw new Error("No company selected");
                const payload = { ...newSite, companyId: activeCompanyId, status: 'active' };
                const savedSite = await api.createSite(currentUser.token, payload);
                if (savedSite && (savedSite.id || savedSite._id)) {
                    setSites(prev => [...prev, savedSite]);
                    return savedSite;
                }
            } catch (error) {
                console.error("Add Site Error:", error);
                throw error;
            }
        }
    };

    const updateSite = async (updatedSiteData) => {
        if (currentUser && currentUser.token) {
            try {
                const siteId = updatedSiteData.id || updatedSiteData._id;
                const result = await api.updateSite(currentUser.token, siteId, updatedSiteData);
                if (result && (result.id || result._id)) {
                    setSites(prev => prev.map(s => (s.id || s._id) === siteId ? result : s));
                    return result;
                }
            } catch (error) {
                console.error("Update Site Error:", error);
                throw error;
            }
        }
    };

    const deleteSite = async (siteId) => {
        if (currentUser && currentUser.token) {
            try {
                const res = await api.deleteSite(currentUser.token, siteId);
                setSites(prev => prev.filter(site => (site.id || site._id) !== siteId));
                // If deleted active site, switch
                if ((activeSite && (activeSite.id || activeSite._id) === siteId) || activeSite === siteId) {
                    setActiveSite(null);
                    // Clear all site-specific data to prevent leakage
                    setTransactions([]);
                    setProjectTasks([]);
                    setManpowerList([]);
                    setManpowerAttendance([]);
                    setManpowerPayments([]);
                    setMessages([]);
                    setInventory([]);
                    setChecklists([]);
                    setEstimations([]);
                    setDocuments([]);
                    setMaterials([]);
                    setContacts([]);
                    setDrawings([]);
                    // Also clear saved items that might be site-specific? kept global for now usually.
                }
                if (res && res.success) {
                    alert("Site deleted successfully. Backup download has started.");
                }
            } catch (e) {
                console.error("Failed to delete site", e);
                alert(`Error: ${e.message}\n${JSON.stringify(e)}`);
            }
        }
    };

    // CRUD Operations for Companies
    const addCompany = async (company) => {
        if (currentUser && currentUser.token) {
            try {
                console.log("Adding company...", company);
                const newCompany = await api.createCompany(currentUser.token, company);
                console.log("Company created:", newCompany);

                if (newCompany._id || newCompany.id) {
                    setCompanies(prev => [...prev, newCompany]);
                    setActiveCompanyId(newCompany._id || newCompany.id);

                    // Create default site
                    console.log("Creating default site for company:", newCompany._id || newCompany.id);
                    try {
                        const defaultSite = await api.createSite(currentUser.token, {
                            name: 'Main Site',
                            address: company.address || 'Head Office',
                            companyId: newCompany._id || newCompany.id
                        });
                        console.log("Default site created:", defaultSite);
                        if (defaultSite._id || defaultSite.id) {
                            setSites(prev => [...prev, defaultSite]);
                            setActiveSite(defaultSite._id || defaultSite.id);
                        }
                    } catch (siteError) {
                        console.error("Failed to create default site:", siteError);
                        // Don't block company creation if site creation fails, but maybe warn?
                    }
                    return newCompany;
                } else {
                    console.error("Failed to create company (no ID):", newCompany);
                    throw new Error(newCompany.error || newCompany.message || "Failed to create company");
                }
            } catch (e) {
                console.error("Failed to add company", e);
                throw e; // Rethrow so caller knows it failed
            }
        }
    };

    const updateCompany = async (updatedCompany) => {
        if (currentUser && currentUser.token) {
            try {
                const id = updatedCompany.id || updatedCompany._id;
                const savedCompany = await api.updateCompany(currentUser.token, id, updatedCompany);
                if (savedCompany && (savedCompany._id || savedCompany.id)) {
                    setCompanies(prev => prev.map(company => (company.id === id || company._id === id) ? savedCompany : company));
                    // Update active company if it's the one we just edited
                    if ((activeCompanyId === id) || (activeCompanyId === savedCompany._id)) {
                        // Triggers re-render of components relying on activeCompany
                        // setCompanies logic above handles the data, this might be redundant but safe
                    }
                }
            } catch (e) {
                console.error("Failed to update company", e);
                alert("Failed to update company data. Please check your connection.");
            }
        }
    };

    const switchCompany = async (companyId) => {
        if (currentUser && currentUser.token) {
            setActiveCompanyId(companyId);
            setActiveSite(null); // Reset site

            // Re-fetch users for this company (if any global users)
            // But main logic is in useEffect dependency
        }
    };

    const getDeletedCompanies = async () => {
        if (currentUser && currentUser.token) {
            try {
                return await api.getDeletedCompanies(currentUser.token);
            } catch (err) {
                console.error("Failed to get deleted companies:", err);
                return [];
            }
        }
    };

    const restoreCompanyFromTrash = async (companyId) => {
        if (currentUser && currentUser.token) {
            try {
                const restored = await api.restoreCompanyFromTrash(currentUser.token, companyId);
                if (restored && (restored.id || restored._id)) {
                    setCompanies(prev => [...prev, restored]);
                    return restored;
                }
            } catch (err) {
                console.error("Failed to restore company:", err);
            }
        }
    };

    const deleteCompany = async (companyId) => {
        if (currentUser && currentUser.token) {
            try {
                const res = await api.deleteCompany(currentUser.token, companyId);

                setCompanies(prev => {
                    const newCompanies = prev.filter(c => (c.id || c._id) !== companyId);
                    // If we deleted the active company, switch to another one if available
                    if (activeCompanyId === companyId) {
                        if (newCompanies.length > 0) {
                            setActiveCompanyId(newCompanies[0].id || newCompanies[0]._id);
                        } else {
                            setActiveCompanyId(null);
                        }
                    }
                    return newCompanies;
                });

                if (res && res.success) {
                    alert("Company deleted successfully. Backup download has started.");
                }
            } catch (e) {
                console.error("Failed to delete company", e);
                alert("Failed to delete company");
            }
        }
    };

    const restoreCompany = async (formData) => {
        if (currentUser && currentUser.token) {
            try {
                const res = await api.restoreCompany(currentUser.token, formData);
                alert(res.message || "Company restore initiated.");
                if (refreshData) await refreshData();
            } catch (e) {
                console.error("Failed to restore company", e);
                alert(`Restore Failed: ${e.message}`);
            }
        }
    };

    const restoreSite = async (formData) => {
        if (currentUser && currentUser.token) {
            try {
                const res = await api.restoreSite(currentUser.token, formData);
                alert(res.message || "Site restore initiated.");
                if (refreshData) await refreshData();
            } catch (e) {
                console.error("Failed to restore site", e);
                alert(`Restore Failed: ${e.message}`);
            }
        }
    };

    const restoreSiteFromTrash = async (siteId) => {
        if (currentUser && currentUser.token) {
            try {
                const res = await api.restoreSiteFromTrash(currentUser.token, siteId);
                alert(res.message || "Site restored successfully.");
                if (refreshData) await refreshData();
                // Also refresh specific lists if needed
                if (activeCompanyId) {
                    const siteList = await api.getSites(currentUser.token, activeCompanyId);
                    if (Array.isArray(siteList)) setSites(siteList);
                }
            } catch (e) {
                console.error("Failed to restore site from trash", e);
                alert(`Restore Failed: ${e.message}`);
            }
        }
    };

    const getDeletedSites = async (companyId) => {
        if (currentUser && currentUser.token) {
            try {
                const res = await api.getDeletedSites(currentUser.token, companyId);
                // If the server returns a 404 (Route not found) it might come as HTML or {message}
                if (res && res.message && !Array.isArray(res)) {
                    console.error("getDeletedSites returned message:", res.message);
                    alert(`Debug: Fetching Trash failed. Server says: ${res.message}`);
                    return [];
                }
                return res;
            } catch (e) {
                console.error("Failed to fetch deleted sites", e);
                alert(`Debug: Fetching Trash Error: ${e.message}. Server might need RESTART.`);
                return [];
            }
        }
        return [];
    };

    // Helper to recover string from corrupted object {0:'a', 1:'b', id:1}
    const recoverString = (val) => {
        if (typeof val === 'string') return val;
        if (val && typeof val === 'object') {
            // Check if it looks like a spread string
            const keys = Object.keys(val).filter(k => !isNaN(k));
            if (keys.length > 0) {
                return keys.sort((a, b) => a - b).map(k => val[k]).join('');
            }
            // Fallback for other objects
            return val.name || val.label || '';
        }
        return '';
    };

    // Cleanup corrupted data
    useEffect(() => {
        const cleanupCorruptedStrings = (items, setter, name) => {
            if (Array.isArray(items)) {
                let hasChanges = false;
                const seen = new Set();
                const cleanItems = items.map(item => {
                    if (typeof item !== 'string') {
                        const recovered = recoverString(item);
                        if (recovered) {
                            hasChanges = true;
                            return recovered;
                        }
                    }
                    return item;
                }).filter(item => {
                    if (typeof item === 'string') {
                        if (seen.has(item)) {
                            hasChanges = true; // Found a duplicate
                            return false;
                        }
                        seen.add(item);
                        return true;
                    }
                    return false;
                });

                if (hasChanges || cleanItems.length !== items.length) {
                    console.warn(`Cleaning up corrupted/duplicate ${name}`, items);
                    setter(cleanItems);
                }
            }
        };

        const cleanupTransactions = () => {
            setTransactions(prev => {
                let hasChanges = false;
                const clean = prev.map(t => {
                    let newT = { ...t };
                    if (t.category && typeof t.category !== 'string') {
                        newT.category = recoverString(t.category);
                        hasChanges = true;
                    }
                    if (t.partyName && typeof t.partyName !== 'string') {
                        newT.partyName = recoverString(t.partyName);
                        hasChanges = true;
                    }
                    return newT;
                });
                if (hasChanges) {
                    console.warn('Cleaning up corrupted transactions');
                    return clean;
                }
                return prev;
            });
        };

        cleanupCorruptedStrings(savedParties, setSavedParties, 'savedParties');
        cleanupCorruptedStrings(savedSuppliers, setSavedSuppliers, 'savedSuppliers');
        cleanupCorruptedStrings(customCategories, setCustomCategories, 'customCategories');
        cleanupTransactions();
    }, []);

    // CRUD Operations for Custom Categories
    const addCustomCategory = async (categoryName) => {
        if (typeof categoryName === 'string' && categoryName.trim() !== '') {
            const newCategories = [...customCategories, categoryName];
            setCustomCategories(newCategories);
            if (currentUser && currentUser.token && activeSite) {
                await api.updateSiteSettings(currentUser.token, activeSite, { customCategories: newCategories });
            }
        }
    };

    const updateCustomCategory = async (updatedCategory, oldCategory) => {
        const newCategories = customCategories.map(cat => cat === oldCategory ? updatedCategory : cat);
        setCustomCategories(newCategories);
        if (currentUser && currentUser.token && activeSite) {
            await api.updateSiteSettings(currentUser.token, activeSite, { customCategories: newCategories });
        }
    };

    const deleteCustomCategory = async (categoryName) => {
        const newCategories = customCategories.filter(cat => cat !== categoryName);
        setCustomCategories(newCategories);
        if (currentUser && currentUser.token && activeSite) {
            await api.updateSiteSettings(currentUser.token, activeSite, { customCategories: newCategories });
        }
    };



    // CRUD Operations for Saved Parties
    const addSavedParty = async (partyName) => {
        if (typeof partyName === 'string' && partyName.trim() !== '') {
            if (savedParties.includes(partyName)) return; // Prevent duplicates
            const newParties = [...savedParties, partyName];
            setSavedParties(newParties);

            if (currentUser && currentUser.token && activeSite) {
                console.log("Saving Parties to Backend:", newParties, "Site:", activeSite);
                try {
                    const res = await api.updateSiteSettings(currentUser.token, activeSite, { parties: newParties });
                    console.log("Save Party Response:", res);
                    if (res && (res.message || res.error) && !res.id) {
                        console.error("Failed to save party setting:", res);
                        alert("Warning: Failed to save party to server. It may not persist on reload.");
                    }
                } catch (e) {
                    console.error("Error saving party:", e);
                }
            }
        }
    };

    const updateSavedParty = async (updatedParty, oldParty) => {
        const newParties = savedParties.map(party => party === oldParty ? updatedParty : party);
        setSavedParties(newParties);
        if (currentUser && currentUser.token && activeSite) {
            await api.updateSiteSettings(currentUser.token, activeSite, { parties: newParties });
        }
    };

    const deleteSavedParty = async (partyName) => {
        const newParties = savedParties.filter(party => party !== partyName);
        setSavedParties(newParties);
        if (currentUser && currentUser.token && activeSite) {
            await api.updateSiteSettings(currentUser.token, activeSite, { parties: newParties });
        }
    };

    // CRUD Operations for Messages
    const addMessage = (message) => {
        setMessages(prev => [...prev, { ...message, id: prev.length ? Math.max(...prev.map(m => m.id)) + 1 : 1 }]);
    };

    const deleteMessage = (messageId) => {
        setMessages(prev => prev.filter(message => message.id !== messageId));
    };



    const importContactsFromSite = async (sourceSiteId) => {
        if (currentUser && currentUser.token && activeSite) {
            try {
                // 1. Fetch from source
                const sourceContacts = await api.getContacts(currentUser.token, sourceSiteId);
                if (Array.isArray(sourceContacts) && sourceContacts.length > 0) {
                    // 2. Add to current site (avoid exact duplicates by name/number?)
                    // For simplicity, just add them.
                    let importedCount = 0;
                    for (const contact of sourceContacts) {
                        // Check duplicate
                        const isDuplicate = contacts.some(c => c.name === contact.name && c.number === contact.number);
                        if (!isDuplicate) {
                            const newContact = await api.createContact(currentUser.token, {
                                name: contact.name,
                                number: contact.number,
                                role: contact.role,
                                siteId: activeSite
                            });
                            if (newContact._id || newContact.id) {
                                setContacts(prev => [...prev, newContact]);
                                importedCount++;
                            }
                        }
                    }
                    return { success: true, count: importedCount };
                }
                return { success: true, count: 0 };
            } catch (e) {
                console.error("Failed to import contacts", e);
                return { success: false, message: "Network Error" };
            }
        }
    };

    // CRUD Operations for Materials
    const addMaterial = async (material) => {
        if (!currentUser || !currentUser.token) return { success: false, message: "Not authenticated" };
        if (!activeSite) return { success: false, message: "No active site selected" };

        try {
            console.log("Adding Material Payload:", { ...material, siteId: activeSite });
            const newMaterial = await api.createMaterial(currentUser.token, { ...material, siteId: activeSite });
            if (newMaterial._id || newMaterial.id) {
                setMaterials(prev => [...prev, newMaterial]);
                return { success: true, material: newMaterial };
            } else {
                console.error("Backend Error:", newMaterial);
                return { success: false, message: newMaterial.message || "Failed to save material" };
            }
        } catch (e) {
            console.error("Failed to add material (Exception):", e);
            return { success: false, message: "Network Error or Server Error" };
        }
    };

    const addMaterialTransaction = async (tx) => {
        // Alias to addMaterial for now, or specific logic if different
        return await addMaterial(tx);
    };

    const updateMaterial = async (updatedMaterial) => {
        if (currentUser && currentUser.token) {
            try {
                const id = updatedMaterial._id || updatedMaterial.id;
                const result = await api.updateMaterial(currentUser.token, id, updatedMaterial);
                if (result._id || result.id) {
                    setMaterials(prev => prev.map(m => (m._id === id || m.id === id) ? result : m));
                    return { success: true, material: result };
                }
            } catch (e) {
                console.error("Failed to update material", e);
                return { success: false, message: "Network Error" };
            }
        }
    };

    const deleteMaterial = async (materialId) => {
        if (currentUser && currentUser.token) {
            try {
                await api.deleteMaterial(currentUser.token, materialId);
                setMaterials(prev => prev.filter(m => (m._id !== materialId && m.id !== materialId)));
                return { success: true };
            } catch (e) {
                console.error("Failed to delete material", e);
                return { success: false, message: "Network Error" };
            }
        }
    };

    // CRUD Operations for Saved Suppliers
    const addSavedSupplier = (supplierInput) => {
        // Support both string and object input
        const supplier = typeof supplierInput === 'string' ? { name: supplierInput } : supplierInput;
        const name = supplier.name.trim();

        if (name !== '') {
            setSavedSuppliers(prev => {
                // Check for duplicates by name
                const exists = prev.some(s => (typeof s === 'string' ? s : s.name) === name);
                if (exists) return prev;

                const updated = [...prev, supplier];
                saveToSiteStorage('vini_saved_suppliers', updated);
                return updated;
            });
        }
    };

    const updateSavedSupplier = (updatedSupplier, oldSupplierName) => {
        setSavedSuppliers(prev => {
            const updated = prev.map(s => {
                const sName = typeof s === 'string' ? s : s.name;
                return sName === oldSupplierName ? updatedSupplier : s;
            });
            saveToSiteStorage('vini_saved_suppliers', updated);
            return updated;
        });
    };

    const deleteSavedSupplier = (supplierName) => {
        setSavedSuppliers(prev => {
            const updated = prev.filter(s => (typeof s === 'string' ? s : s.name) !== supplierName);
            saveToSiteStorage('vini_saved_suppliers', updated);
            return updated;
        });
    };

    // CRUD Operations for Saved Contractors
    const addSavedContractor = (contractorInput) => {
        const contractor = typeof contractorInput === 'string' ? { name: contractorInput } : contractorInput;
        const name = contractor.name.trim();

        if (name !== '') {
            setSavedContractors(prev => {
                const exists = prev.some(c => (typeof c === 'string' ? c : c.name) === name);
                if (exists) return prev;

                const updated = [...prev, contractor];
                saveToSiteStorage('vini_saved_contractors', updated);
                return updated;
            });
        }
    };

    const deleteSavedContractor = (contractorName) => {
        setSavedContractors(prev => {
            const updated = prev.filter(c => (typeof c === 'string' ? c : c.name) !== contractorName);
            saveToSiteStorage('vini_saved_contractors', updated);
            return updated;
        });
    };

    // CRUD Operations for Saved Trades
    const addSavedTrade = async (tradeInput) => {
        const trade = typeof tradeInput === 'string' ? tradeInput : (tradeInput.name || tradeInput.trade || String(tradeInput));
        const tradeName = String(trade).trim();

        if (tradeName && !savedTrades.some(t => (typeof t === 'string' ? t : (t.name || t.trade)) === tradeName)) {
            const newTrades = [...savedTrades, tradeName]; // Store as string to be clean? Or keep mixed? Let's try to normalize to string if possible, OR keep as is but check properly.
            // Actually, backend expects Strings. So let's normalize to string.
            setSavedTrades(newTrades);
            saveToSiteStorage('vini_saved_trades', newTrades);
            if (activeSite) {
                try {
                    await api.updateSiteSettings(currentUser.token, activeSite, { trades: newTrades });
                } catch (e) { console.error("Failed to save trade to backend", e); }
            }
        }
    };

    const deleteSavedTrade = async (tradeName) => {
        const newTrades = savedTrades.filter(t => t !== tradeName);
        setSavedTrades(newTrades);
        saveToSiteStorage('vini_saved_trades', newTrades);
        if (activeSite) {
            try {
                await api.updateSiteSettings(currentUser.token, activeSite, { trades: newTrades });
            } catch (e) { console.error("Failed to delete trade from backend", e); }
        }
    };

    // CRUD Operations for Saved Material Names
    const addSavedMaterialName = async (name) => {
        if (!savedMaterialNames.includes(name)) {
            const newMaterials = [...savedMaterialNames, name];
            setSavedMaterialNames(newMaterials);
            saveToSiteStorage('vini_saved_material_names', newMaterials);
            if (activeSite) {
                try {
                    await api.updateSiteSettings(currentUser.token, activeSite, { materialNames: newMaterials });
                } catch (e) { console.error("Failed to save material name to backend", e); }
            }
        }
    };

    const deleteSavedMaterialName = async (name) => {
        const newMaterials = savedMaterialNames.filter(n => n !== name);
        setSavedMaterialNames(newMaterials);
        saveToSiteStorage('vini_saved_material_names', newMaterials);
        if (activeSite) {
            try {
                await api.updateSiteSettings(currentUser.token, activeSite, { materialNames: newMaterials });
            } catch (e) { console.error("Failed to delete material name from backend", e); }
        }
    };

    // CRUD Operations for Saved Bill Items
    const addSavedBillItem = async (name) => {
        if (!savedBillItems.includes(name)) {
            const newItems = [...savedBillItems, name];
            setSavedBillItems(newItems);
            saveToSiteStorage('vini_saved_bill_items', newItems);
            if (activeSite) {
                try {
                    await api.updateSiteSettings(currentUser.token, activeSite, { billItems: newItems });
                } catch (e) { console.error("Failed to save bill item to backend", e); }
            }
        }
    };

    const deleteSavedBillItem = async (name) => {
        const newItems = savedBillItems.filter(n => n !== name);
        setSavedBillItems(newItems);
        saveToSiteStorage('vini_saved_bill_items', newItems);
        if (activeSite) {
            try {
                await api.updateSiteSettings(currentUser.token, activeSite, { billItems: newItems });
            } catch (e) { console.error("Failed to delete bill item from backend", e); }
        }
    };

    const addSavedUnit = async (unitName) => {
        if (!savedUnits.includes(unitName)) {
            const newUnits = [...savedUnits, unitName];
            setSavedUnits(newUnits);
            saveToSiteStorage('vini_saved_units', newUnits);
            if (activeSite) {
                try {
                    await api.updateSiteSettings(currentUser.token, activeSite, { units: newUnits });
                } catch (e) { console.error("Failed to add unit to backend", e); }
            }
        }
    };


    const deleteSavedUnit = async (unitName) => {
        const newUnits = savedUnits.filter(u => u !== unitName);
        setSavedUnits(newUnits);
        saveToSiteStorage('vini_saved_units', newUnits);
        if (activeSite) {
            try {
                await api.updateSiteSettings(currentUser.token, activeSite, { units: newUnits });
            } catch (e) { console.error("Failed to delete unit from backend", e); }
        }
    };

    // CRUD Operations for Saved Material Types
    const addSavedMaterialType = async (typeName) => {
        if (!savedMaterialTypes.includes(typeName)) {
            const newTypes = [...savedMaterialTypes, typeName];
            setSavedMaterialTypes(newTypes);
            saveToSiteStorage('vini_saved_material_types', newTypes);
            if (activeSite) {
                try {
                    await api.updateSiteSettings(currentUser.token, activeSite, { materialTypes: newTypes });
                } catch (e) { console.error("Failed to save material type to backend", e); }
            }
        }
    };

    const deleteSavedMaterialType = async (typeName) => {
        const newTypes = savedMaterialTypes.filter(t => t !== typeName);
        setSavedMaterialTypes(newTypes);
        saveToSiteStorage('vini_saved_material_types', newTypes);
        if (activeSite) {
            try {
                await api.updateSiteSettings(currentUser.token, activeSite, { materialTypes: newTypes });
            } catch (e) { console.error("Failed to delete material type from backend", e); }
        }
    };

    // CRUD Operations for Drawings
    // CRUD Operations for Drawings
    const addDrawing = async (drawing) => {
        if (currentUser && currentUser.token && activeSite) {
            try {
                let payload;
                if (drawing instanceof FormData) {
                    // FormData cannot be spread. Append missing fields.
                    drawing.append('siteId', activeSite);
                    drawing.append('category', 'drawing');
                    payload = drawing;
                } else {
                    // Legacy Object Upload
                    payload = {
                        ...drawing,
                        originalName: drawing.name,
                        category: 'drawing',
                        siteId: activeSite
                    };
                }

                const newDoc = await api.createDocument(currentUser.token, payload);
                if (newDoc._id || newDoc.id) {
                    setDrawings(prev => [...prev, newDoc]);
                    return { success: true };
                } else {
                    console.error("Backend Error in addDrawing:", newDoc);
                    return { success: false, message: newDoc.message || newDoc.error || "Save Failed at Backend" };
                }
            } catch (e) {
                console.error("Failed to add drawing", e);
                return { success: false, message: e.message || "Network Error" };
            }
        }
    };

    const deleteDrawing = async (drawingId) => {
        if (currentUser && currentUser.token) {
            try {
                await api.deleteDocument(currentUser.token, drawingId);
                setDrawings(prev => prev.filter(drawing => drawing.id !== drawingId && drawing._id !== drawingId));
                return { success: true };
            } catch (e) {
                console.error("Failed to delete drawing", e);
                return { success: false, message: "Network Error" };
            }
        }
    };

    // CRUD Operations for Concrete Tests
    const addConcreteTest = async (test) => {
        if (currentUser && currentUser.token && activeSite) {
            try {
                const reportData = {
                    type: 'concrete',
                    location: test.location,
                    date: test.date,
                    status: test.status, // Include status
                    grade: test.grade, // Pass grade directly or inside data? Schema check: usually top level or in data. Let's put in data too to be safe, or check schema. Previously it was top level in local.
                    // Schema for Report: type, date, location, image, data (Object).
                    // So grade should be in data.
                    image: test.image,
                    data: {
                        grade: test.grade,
                        ...test.data
                    }
                };
                const newReport = await api.createReport(currentUser.token, { ...reportData, siteId: activeSite });
                console.log("addConcreteTest Res:", newReport);
                if (newReport && (newReport.id !== undefined || newReport._id || newReport.createdAt)) {
                    setConcreteTests(prev => [...prev, newReport]);
                    return { success: true };
                } else {
                    return { success: false, message: "Invalid Res: " + JSON.stringify(newReport) };
                }
            } catch (e) {
                console.error("Failed to add concrete test", e);
                return { success: false, message: e.message || "Network Error" };
            }
        }
    };

    const updateConcreteTest = async (updatedTest) => {
        if (currentUser && currentUser.token) {
            try {
                const id = updatedTest._id || updatedTest.id;
                // Prepare data similar to creation
                const reportData = {
                    type: 'concrete',
                    location: updatedTest.location,
                    date: updatedTest.date,
                    status: updatedTest.status, // Include status
                    image: updatedTest.image,
                    data: {
                        grade: updatedTest.grade, // Ensure grade is preserved/updated
                        ...updatedTest.data
                    }
                };
                const res = await api.updateReport(currentUser.token, id, reportData);
                console.log("updateConcreteTest Res:", res);
                if (res && (res.id !== undefined || res._id || res.createdAt)) {
                    setConcreteTests(prev => prev.map(t => (t._id === id || t.id === id) ? res : t));
                    return { success: true };
                } else {
                    return { success: false, message: "Invalid Res: " + JSON.stringify(res) };
                }
            } catch (e) {
                console.error("Failed to update concrete test", e);
                return { success: false, message: e.message };
            }
        }
    };

    const updateConcreteTestResult = async (id, day, result) => {
        const test = concreteTests.find(t => t._id === id || t.id === id);
        if (test && currentUser && currentUser.token) {
            // Construct updated data payload
            const currentResults = test.data?.results || {};
            const updatedResults = { ...currentResults, [day]: result };
            const updatedData = { ...test.data, results: updatedResults };

            const reportData = {
                status: test.status,
                data: updatedData
            };

            // Check payload size estimate
            let finalReportData = reportData;
            const checkSize = (d) => new TextEncoder().encode(JSON.stringify(d)).length;
            let size = checkSize(finalReportData);

            if (size > 4000000) { // > 4MB
                console.warn("Report Packet Size is Large based on history (" + size + " bytes). Cleaning up...");

                // Recursive function to strip large text/base64
                const stripLargeStrings = (obj) => {
                    if (!obj || typeof obj !== 'object') return;
                    if (Array.isArray(obj)) {
                        obj.forEach(item => stripLargeStrings(item));
                        return;
                    }
                    Object.keys(obj).forEach(key => {
                        const val = obj[key];
                        if (typeof val === 'string') {
                            // Aggressive purge: remove anything > 10KB (likely base64)
                            // This is necessary because server packet limit is 4MB and we are at 123MB!
                            if (val.length > 10000) {
                                console.warn("Stripping large field:", key, "Size:", val.length);
                                obj[key] = null;
                            }
                        } else {
                            stripLargeStrings(val);
                        }
                    });
                };

                // Clone data
                const cleanData = JSON.parse(JSON.stringify(updatedData));
                stripLargeStrings(cleanData);

                finalReportData = { ...reportData, data: cleanData };

                const newSize = checkSize(finalReportData);
                if (newSize > 4000000) {
                    // If still too big, we are desperate.
                    // The only thing left would be to wipe 'results' entirely except current day?
                    // Let's try to just keep the current day's result in the worst case.
                    console.warn("Still too large. Desperate maneuver: Keeping only current day result.");
                    const minimalData = {
                        grade: cleanData.grade,
                        castingDate: cleanData.castingDate,
                        results: {
                            [day]: cleanData.results ? cleanData.results[day] : result
                        }
                    };
                    finalReportData = { ...reportData, data: minimalData };

                    // Check again
                    const desperateSize = checkSize(finalReportData);
                    if (desperateSize > 4000000) {
                        alert("Data is inexplicably massive (" + Math.round(desperateSize / 1024 / 1024) + "MB). Cannot save.");
                        return { success: false, message: "Data too massive." };
                    } else {
                        console.warn("History was cleared for this test to recover from data overloading. Only current result saved.");
                    }
                } else {
                    // Proceed
                    console.log("Cleaned up large data to:", newSize);
                }
            }

            try {
                const res = await api.updateReport(currentUser.token, id, finalReportData);
                console.log("updateConcreteTestResult Res:", res);
                if (res && (res.id !== undefined || res._id || res.createdAt)) {
                    setConcreteTests(prev => prev.map(t => (t._id === id || t.id === id) ? res : t));
                    return { success: true };
                } else {
                    return { success: false, message: "Invalid Res: " + JSON.stringify(res) };
                }
            } catch (e) {
                console.error("Failed to update test result", e);
                return { success: false, message: "Network Error" };
            }
        }
    };

    const deleteConcreteTest = async (testId) => {
        if (currentUser && currentUser.token) {
            try {
                await api.deleteReport(currentUser.token, testId);
                setConcreteTests(prev => prev.filter(test => test._id !== testId && test.id !== testId));
            } catch (e) { console.error("Failed to delete concrete test", e); }
        }
    };

    // CRUD Operations for Steel Tests
    const addSteelTest = async (test) => {
        if (currentUser && currentUser.token && activeSite) {
            try {
                const reportData = {
                    type: 'steel',
                    location: test.location,
                    date: test.date,
                    status: test.status, // Include status
                    image: test.image,
                    data: test.data || {}
                };
                const newReport = await api.createReport(currentUser.token, { ...reportData, siteId: activeSite });
                console.log("addSteelTest Res:", newReport);
                if (newReport && (newReport.id !== undefined || newReport._id || newReport.createdAt)) {
                    setSteelTests(prev => [...prev, newReport]);
                    return { success: true };
                } else {
                    return { success: false, message: "Invalid Res: " + JSON.stringify(newReport) };
                }
            } catch (e) {
                console.error("Failed to add steel test", e);
                return { success: false, message: "Network Error" };
            }
        } else {
            console.error("Cannot add steel test: Missing user or active site");
            return { success: false, message: "Please select a Site first." };
        }
    };

    const updateSteelTest = async (updatedTest) => {
        if (currentUser && currentUser.token) {
            try {
                const id = updatedTest._id || updatedTest.id;
                const reportData = {
                    type: 'steel',
                    location: updatedTest.location,
                    date: updatedTest.date,
                    status: updatedTest.status, // Include status
                    image: updatedTest.image,
                    data: updatedTest.data || {}
                };
                const res = await api.updateReport(currentUser.token, id, reportData);
                console.log("updateSteelTest Res:", res);
                if (res && (res.id !== undefined || res._id || res.createdAt)) {
                    setSteelTests(prev => prev.map(t => (t._id === id || t.id === id) ? res : t));
                    return { success: true };
                } else {
                    return { success: false, message: "Invalid Res: " + JSON.stringify(res) };
                }
            } catch (e) {
                console.error("Failed to update steel test", e);
                return { success: false, message: "Network Error" };
            }
        } else {
            return { success: false, message: "Authentication Error. Please login again." };
        }
    };

    const deleteSteelTest = async (testId) => {
        if (currentUser && currentUser.token) {
            try {
                await api.deleteReport(currentUser.token, testId);
                setSteelTests(prev => prev.filter(test => test._id !== testId && test.id !== testId));
            } catch (e) { console.error("Failed to delete steel test", e); }
        }
    };

    // CRUD Operations for Brick Tests
    const addBrickTest = async (test) => {
        if (currentUser && currentUser.token && activeSite) {
            try {
                const reportData = {
                    type: 'brick',
                    location: test.location,
                    date: test.date,
                    status: test.status, // Include status
                    image: test.image,
                    data: test.data || {}
                };
                const newReport = await api.createReport(currentUser.token, { ...reportData, siteId: activeSite });
                console.log("addBrickTest Res:", newReport);
                if (newReport && (newReport.id !== undefined || newReport._id || newReport.createdAt)) {
                    setBrickTests(prev => [...prev, newReport]);
                    return { success: true };
                } else {
                    return { success: false, message: "Invalid Res: " + JSON.stringify(newReport) };
                }
            } catch (e) {
                console.error("Failed to add brick test", e);
                return { success: false, message: e.message || "Network Error" };
            }
        } else {
            return { success: false, message: "Auth/Site Error" };
        }
    };

    const updateBrickTest = async (updatedTest) => {
        if (currentUser && currentUser.token) {
            try {
                const id = updatedTest._id || updatedTest.id;
                const reportData = {
                    type: 'brick',
                    location: updatedTest.location,
                    date: updatedTest.date,
                    status: updatedTest.status, // Include status
                    image: updatedTest.image,
                    data: updatedTest.data || {}
                };
                const res = await api.updateReport(currentUser.token, id, reportData);
                console.log("updateBrickTest Res:", res);
                if (res && (res.id !== undefined || res._id || res.createdAt)) {
                    setBrickTests(prev => prev.map(t => (t._id === id || t.id === id) ? res : t));
                    return { success: true };
                } else {
                    return { success: false, message: "Invalid Res: " + JSON.stringify(res) };
                }
            } catch (e) {
                console.error("Failed to update brick test", e);
                return { success: false, message: e.message || "Network Error" };
            }
        } else {
            return { success: false, message: "Auth Error" };
        }
    };

    const deleteBrickTest = async (testId) => {
        if (currentUser && currentUser.token) {
            try {
                await api.deleteReport(currentUser.token, testId);
                setBrickTests(prev => prev.filter(test => test._id !== testId && test.id !== testId));
                return { success: true };
            } catch (e) {
                console.error("Failed to delete brick test", e);
                return { success: false, message: "Network Error" };
            }
        }
    };

    // CRUD Operations for Checklist Templates
    // CRUD Operations for Checklist Templates
    const addChecklistTemplate = async (template) => {
        if (currentUser && currentUser.token && activeSite) {
            try {
                const newTemplate = await api.createChecklist(currentUser.token, { ...template, siteId: activeSite, type: 'Template' });
                if (newTemplate._id || newTemplate.id) {
                    setChecklistTemplates(prev => [...prev, newTemplate]);
                    return { success: true, template: newTemplate };
                }
            } catch (e) {
                console.error("Failed to add checklist template", e);
                return { success: false, message: "Network Error" };
            }
        }
    };

    const updateChecklistTemplate = async (arg1, arg2) => {
        if (currentUser && currentUser.token) {
            try {
                let id, updatedTemplate;
                if (typeof arg1 === 'string') {
                    id = arg1;
                    updatedTemplate = arg2;
                } else {
                    updatedTemplate = arg1;
                    id = updatedTemplate._id || updatedTemplate.id;
                }

                const result = await api.updateChecklist(currentUser.token, id, updatedTemplate);
                if (result._id || result.id) {
                    setChecklistTemplates(prev => prev.map(t => (t.id === id || t._id === id) ? result : t));
                    return { success: true, template: result };
                }
            } catch (e) {
                console.error("Failed to update checklist template", e);
            }
        }
    };

    const deleteChecklistTemplate = async (templateId) => {
        if (currentUser && currentUser.token) {
            try {
                await api.deleteChecklist(currentUser.token, templateId);
                setChecklistTemplates(prev => prev.filter(t => t.id !== templateId && t._id !== templateId));
            } catch (e) {
                console.error("Failed to delete checklist template", e);
            }
        }
    };

    // CRUD Operations for Checklists
    // CRUD Operations for Checklists
    const addChecklist = async (checklist) => {
        if (currentUser && currentUser.token && activeSite) {
            try {
                const newChecklist = await api.createChecklist(currentUser.token, { ...checklist, siteId: activeSite });
                if (newChecklist._id || newChecklist.id) {
                    setChecklists(prev => [newChecklist, ...prev]);
                    return { success: true, checklist: newChecklist };
                }
            } catch (e) {
                console.error("Failed to add checklist", e);
            }
        }
    };

    const updateChecklist = async (arg1, arg2) => {
        if (currentUser && currentUser.token) {
            try {
                let id, updatedChecklist;
                if (typeof arg1 === 'string' || typeof arg1 === 'number') {
                    id = arg1;
                    updatedChecklist = arg2;
                } else {
                    updatedChecklist = arg1;
                    id = updatedChecklist._id || updatedChecklist.id;
                }

                const result = await api.updateChecklist(currentUser.token, id, updatedChecklist);
                if (result._id || result.id) {
                    setChecklists(prev => prev.map(c => (c._id === id || c.id === id) ? result : c));
                    return { success: true, checklist: result };
                } else {
                    // Extract server error message if available
                    console.error("Server returned update error:", result);
                    return { success: false, error: result.message || result.error || "Server returned invalid response" };
                }
            } catch (e) {
                console.error("Failed to update checklist", e);
                return { success: false, error: e.message || "Unknown error" };
            }
        }
    };

    const deleteChecklist = async (checklistId) => {
        if (currentUser && currentUser.token) {
            try {
                await api.deleteChecklist(currentUser.token, checklistId);
                setChecklists(prev => prev.filter(c => c._id !== checklistId && c.id !== checklistId));
            } catch (e) {
                console.error("Failed to delete checklist", e);
            }
        }
    }


    // Helper to fetch custom shapes
    const fetchCustomShapes = async (token, siteId) => {
        try {
            const data = await api.getCustomShapes(token, siteId);
            setCustomShapes(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Failed to fetch custom shapes", e);
        }
    };

    // CRUD Operations for Documents
    const addDocument = async (doc) => {
        if (currentUser && currentUser.token && activeSite) {
            try {
                let payload;
                if (doc.file) {
                    console.log("Adding document with file:", doc.file.name, "Size:", doc.file.size);
                    // Use FormData for file upload
                    const formData = new FormData();
                    formData.append('siteId', activeSite);
                    formData.append('name', doc.name);
                    formData.append('type', doc.type);
                    formData.append('category', 'general');
                    formData.append('file', doc.file);
                    // Note: 'uploadedBy' is handled by backend token
                    payload = formData;
                } else {
                    // Use JSON for legacy/no-file
                    payload = { ...doc, siteId: activeSite };
                }

                const newDoc = await api.createDocument(currentUser.token, payload);
                console.log("addDocument Res:", newDoc);

                if (newDoc && (newDoc.id || newDoc._id)) {
                    setDocuments(prev => [newDoc, ...prev]);
                    return { success: true, document: newDoc };
                } else {
                    return { success: false, message: newDoc.message || "Upload Failed" };
                }
            } catch (e) {
                console.error("Failed to add document", e);
                return { success: false, message: e.message || "Network Error" };
            }
        } else {
            return { success: false, message: "Authentication Error" };
        }
    };
    const deleteDocument = async (docId) => {
        if (currentUser && currentUser.token) {
            try {
                await api.deleteDocument(currentUser.token, docId);
                setDocuments(prev => prev.filter(doc => (doc.id !== docId && doc._id !== docId)));
            } catch (e) {
                console.error("Failed to delete document", e);
            }
        }
    };

    // CRUD Operations for Project Tasks
    // CRUD Operations for Project Tasks
    const addProjectTask = async (task) => {
        if (currentUser && currentUser.token && activeSite) {
            try {
                const newTask = await api.createProjectTask(currentUser.token, { ...task, siteId: activeSite });
                if (newTask._id || newTask.id) {
                    setProjectTasks(prev => [newTask, ...prev]);
                    return { success: true, task: newTask };
                }
            } catch (e) {
                console.error("Failed to add project task", e);
            }
        }
    };
    const updateProjectTask = async (updatedTask) => {
        if (currentUser && currentUser.token) {
            try {
                const id = updatedTask._id || updatedTask.id;
                const result = await api.updateProjectTask(currentUser.token, id, updatedTask);
                if (result._id || result.id) {
                    setProjectTasks(prev => prev.map(t => (t._id === id || t.id === id) ? result : t));
                    return { success: true, task: result };
                }
            } catch (e) {
                console.error("Failed to update project task", e);
            }
        }
    };
    const deleteProjectTask = async (taskId) => {
        if (currentUser && currentUser.token) {
            try {
                await api.deleteProjectTask(currentUser.token, taskId);
                setProjectTasks(prev => prev.filter(t => t._id !== taskId && t.id !== taskId));
            } catch (e) {
                console.error("Failed to delete project task", e);
            }
        }
    };

    // CRUD Operations for Estimations
    // CRUD Operations for Estimations
    const addEstimation = async (estimation) => {
        if (currentUser && currentUser.token && activeSite) {
            try {
                const newEst = await api.createEstimation(currentUser.token, { ...estimation, siteId: activeSite });
                if (newEst._id || newEst.id) {
                    setEstimations(prev => [newEst, ...prev]);
                    return { success: true, estimation: newEst };
                }
            } catch (e) {
                console.error("Failed to add estimation", e);
            }
        }
    };

    const updateEstimation = async (id, updates) => {
        if (currentUser && currentUser.token) {
            try {
                // Handle case where id might be in updates or separate
                const estId = typeof id === 'object' ? id.id : id;
                const data = typeof id === 'object' ? id : updates;

                const updatedEst = await api.updateEstimation(currentUser.token, estId, data);
                if (updatedEst._id || updatedEst.id) {
                    setEstimations(prev => prev.map(e => (e.id === estId || e._id === estId) ? updatedEst : e));
                    return { success: true, estimation: updatedEst };
                }
            } catch (e) {
                console.error("Failed to update estimation", e);
                return { success: false, message: e.message || "Network Error" };
            }
        } else {
            return { success: false, message: "Not authenticated" };
        }
    };

    const deleteEstimation = async (estimationId) => {
        if (currentUser && currentUser.token) {
            try {
                await api.deleteEstimation(currentUser.token, estimationId);
                setEstimations(prev => prev.filter(e => (e.id !== estimationId && e._id !== estimationId)));
            } catch (e) {
                console.error("Failed to delete estimation", e);
            }
        }
    };

    // CRUD Operations for Custom Shapes
    // CRUD Operations for Custom Shapes
    const addCustomShape = async (shape) => {
        if (currentUser && currentUser.token && activeSite) {
            try {
                const shapeWithSite = { ...shape, siteId: activeSite };
                console.log('Creating Custom Shape Payload:', shapeWithSite);

                const newShape = await api.createCustomShape(currentUser.token, shapeWithSite);
                if (newShape._id || newShape.id) {
                    setCustomShapes(prev => [newShape, ...prev]);
                    return { success: true, shape: newShape };
                } else {
                    console.error('Failed to create shape, no ID returned:', newShape);
                    return { success: false, message: 'Server returned no ID' };
                }
            } catch (e) {
                console.error("Failed to add custom shape", e);
                return { success: false, message: e.message };
            }
        } else {
            console.error("Missing context for adding shape:", { currentUser: !!currentUser, activeSite });
            return { success: false, message: "Missing User/Site Context" };
        }
    };
    const updateCustomShape = async (updatedShape) => {
        if (currentUser && currentUser.token) {
            try {
                const id = updatedShape._id || updatedShape.id;
                console.log('Updating Custom Shape ID:', id, 'Payload:', updatedShape);

                const result = await api.updateCustomShape(currentUser.token, id, updatedShape);
                if (result._id || result.id) {
                    setCustomShapes(prev => prev.map(s => (s._id === id || s.id === id) ? result : s));
                    return { success: true, shape: result };
                } else {
                    console.error('Failed to update shape, no ID returned:', result);
                    return { success: false, message: 'Update failed' };
                }
            } catch (e) {
                console.error("Failed to update custom shape", e);
                return { success: false, message: e.message };
            }
        } else {
            return { success: false, message: "Missing User Context" };
        }
    };
    const deleteCustomShape = async (shapeId) => {
        if (currentUser && currentUser.token) {
            try {
                await api.deleteCustomShape(currentUser.token, shapeId);
                setCustomShapes(prev => prev.filter(s => s._id !== shapeId && s.id !== shapeId));
            } catch (e) {
                console.error("Failed to delete custom shape", e);
            }
        }
    };

    // CRUD Operations for Bills
    // CRUD Operations for Bills
    const addBill = async (bill) => {
        if (currentUser && currentUser.token && activeSite) {
            const isValidSiteId = /^[0-9a-fA-F]{24}$/.test(activeSite);
            if (!isValidSiteId) {
                return { success: false, message: "Please create a valid site first. The default 'Main Office' cannot store bills." };
            }
            try {
                const newBill = await api.createBill(currentUser.token, { ...bill, siteId: activeSite });
                if (newBill._id || newBill.id) {
                    setBills(prev => [newBill, ...prev]);
                    return { success: true, bill: newBill };
                }
            } catch (e) {
                console.error("Failed to add bill", e);
                return { success: false, message: "Network Error" };
            }
        }
    };

    const updateBill = async (updatedBill) => {
        if (currentUser && currentUser.token) {
            try {
                const id = updatedBill._id || updatedBill.id;
                const result = await api.updateBill(currentUser.token, id, updatedBill);
                if (result._id || result.id) {
                    setBills(prev => prev.map(bill => (bill.id === id || bill._id === id) ? result : bill));
                    return { success: true, bill: result };
                }
            } catch (e) {
                console.error("Failed to update bill", e);
                return { success: false, message: "Network Error" };
            }
        }
    };

    const deleteBill = async (billId) => {
        if (currentUser && currentUser.token) {
            try {
                await api.deleteBill(currentUser.token, billId);
                setBills(prev => prev.filter(bill => bill.id !== billId && bill._id !== billId));
                return { success: true };
            } catch (e) {
                console.error("Failed to delete bill", e);
                return { success: false, message: "Network Error" };
            }
        }
    };

    // CRUD Operations for Inventory (Flats)
    const addFlat = async (flat) => {
        if (currentUser && currentUser.token && activeSite) {
            try {
                const newItem = await api.createInventoryItem(currentUser.token, { ...flat, siteId: activeSite });
                if (newItem._id || newItem.id) {
                    setInventory(prev => [...prev, newItem]);
                    return { success: true, item: newItem };
                }
            } catch (e) {
                console.error("Failed to add inventory item", e);
                return { success: false, message: "Network Error" };
            }
        }
    };
    const updateFlat = async (updatedFlat) => {
        if (currentUser && currentUser.token) {
            try {
                const id = updatedFlat._id || updatedFlat.id;
                const updatedItem = await api.updateInventoryItem(currentUser.token, id, updatedFlat);
                if (updatedItem._id || updatedItem.id) {
                    setInventory(prev => prev.map(item => (item._id === id || item.id === id) ? updatedItem : item));
                    return { success: true, item: updatedItem };
                }
            } catch (e) {
                console.error("Failed to update inventory item", e);
                return { success: false, message: "Network Error" };
            }
        }
    };
    const deleteFlat = async (flatId) => {
        if (currentUser && currentUser.token) {
            try {
                await api.deleteInventoryItem(currentUser.token, flatId);
                setInventory(prev => prev.filter(item => (item._id !== flatId && item.id !== flatId)));
                return { success: true };
            } catch (e) {
                console.error("Failed to delete inventory item", e);
                return { success: false, message: "Network Error" };
            }
        }
    };
    const deleteFlats = async (flatIds) => {
        // Batch delete not fully supported, iterate
        if (currentUser && currentUser.token) {
            for (const id of flatIds) {
                try {
                    await api.deleteInventoryItem(currentUser.token, id);
                } catch (e) { console.error("Failed to delete item", id, e); }
            }
            setInventory(prev => prev.filter(item => !flatIds.includes(item._id) && !flatIds.includes(item.id)));
        }
    };

    const restoreDefaultShapes = () => {
        // Removed default shapes as per user request
        setCustomShapes([]);
    };

    // --- MANPOWER CRUD ---
    const addManpower = async (data) => {
        if (currentUser && currentUser.token && activeSite) {
            try {
                const newResource = await api.createManpowerResource(currentUser.token, { ...data, siteId: activeSite });
                if (newResource._id || newResource.id) {
                    setManpowerList(prev => [...prev, newResource]);
                    return { success: true, item: newResource };
                } else {
                    console.error("Full API Response:", newResource); // Debug log
                    return { success: false, message: newResource.message || "Failed to create resource (No ID returned)" };
                }
            } catch (e) {
                console.error("Failed to add manpower", e);
                return { success: false, message: "Network Error: " + e.message };
            }
        } else {
            return { success: false, message: "Missing User/Site Context" };
        }
    };

    const updateManpower = async (data) => {
        if (currentUser && currentUser.token) {
            try {
                const id = data._id || data.id;
                const updated = await api.updateManpowerResource(currentUser.token, id, data);
                if (updated._id || updated.id) {
                    setManpowerList(prev => prev.map(item => (item._id === id || item.id === id) ? updated : item));
                    return { success: true, item: updated };
                }
            } catch (e) {
                console.error("Failed to update manpower", e);
                return { success: false, message: "Network Error" };
            }
        }
    };

    const deleteManpower = async (id) => {
        if (currentUser && currentUser.token) {
            try {
                await api.deleteManpowerResource(currentUser.token, id);
                setManpowerList(prev => prev.filter(item => item._id !== id && item.id !== id));
                return { success: true };
            } catch (e) {
                console.error("Failed to delete manpower", e);
                return { success: false, message: "Network Error" };
            }
        }
    };

    const saveAttendance = async (date, records) => {
        if (currentUser && currentUser.token && activeSite) {
            try {
                // Determine siteId (activeSite)
                const payload = { siteId: activeSite, date, records };
                const saved = await api.saveManpowerAttendance(currentUser.token, payload);
                if (saved._id || saved.id) {
                    // Update or Add to local state
                    setManpowerAttendance(prev => {
                        const idx = prev.findIndex(a => a.date === date && a.siteId === activeSite);
                        if (idx >= 0) {
                            const newArr = [...prev];
                            newArr[idx] = saved;
                            return newArr;
                        } else {
                            return [...prev, saved];
                        }
                    });
                    return { success: true, item: saved };
                }
            } catch (e) {
                console.error("Failed to save attendance", e);
                return { success: false, message: "Network Error" };
            }
        }
    };

    const addManpowerPayment = async (data) => {
        if (currentUser && currentUser.token && activeSite) {
            try {
                const newPayment = await api.createManpowerPayment(currentUser.token, { ...data, siteId: activeSite });
                if (newPayment._id || newPayment.id) {
                    setManpowerPayments(prev => [...prev, newPayment]);
                    return { success: true, item: newPayment };
                }
            } catch (e) {
                console.error("Failed to add payment", e);
                return { success: false, message: "Network Error" };
            }
        }
    };

    const deleteManpowerPayment = async (id) => {
        if (currentUser && currentUser.token) {
            try {
                await api.deleteManpowerPayment(currentUser.token, id);
                setManpowerPayments(prev => prev.filter(p => p._id !== id && p.id !== id));
                return { success: true };
            } catch (e) {
                console.error("Failed to delete payment", e);
                return { success: false, message: "Network Error" };
            }
        }
    };

    const contextValue = useMemo(() => ({
        // User & Auth
        users,
        currentUser,
        login,
        logout,
        signup,
        addUser,
        updateUser,
        deleteUser,
        getAllUsers,
        assignUserToSite,
        deleteGlobalUser,

        // Sites & Companies
        sites,
        activeSite,
        setActiveSite,
        addSite,
        updateSite,
        deleteSite,
        companies,
        activeCompanyId,
        setActiveCompanyId,
        addCompany,
        updateCompany,
        deleteCompany,
        switchCompany,
        restoreCompany, // NEW
        getDeletedCompanies,
        restoreCompanyFromTrash,
        restoreSite, // NEW
        restoreSiteFromTrash, // NEW
        getDeletedSites, // NEW

        // Site Specific Data
        attendance,
        addAttendance,
        updateAttendance,
        deleteAttendance,
        siteImages,
        addSiteImage,
        deleteSiteImage,
        customCategories,
        addCustomCategory,
        deleteCustomCategory,
        savedParties,
        addSavedParty,
        deleteSavedParty,
        contacts,
        addContact,
        updateContact,
        deleteContact,
        materials,
        addMaterial,
        updateMaterial,
        deleteMaterial,
        drawings,
        addDrawing,
        deleteDrawing,
        refreshData,

        // Estimations
        estimations,
        addEstimation,
        updateEstimation,
        deleteEstimation,

        activeEstimationFolder,
        setActiveEstimationFolder,
        restoreDefaultShapes,

        // Project Tasks
        projectTasks,
        addProjectTask,
        updateProjectTask,
        deleteProjectTask,

        // Checklists
        checklistTemplates,
        addChecklistTemplate,
        deleteChecklistTemplate,
        updateChecklistTemplate,
        checklists,
        addChecklist,
        updateChecklist,
        deleteChecklist,

        // Inventory
        inventory,
        addFlat: async (flatData) => {
            if (currentUser && currentUser.token && activeSite) {
                try {
                    const newFlat = await api.createInventoryItem(currentUser.token, { ...flatData, siteId: activeSite });
                    if (newFlat._id || newFlat.id) {
                        setInventory(prev => [...prev, newFlat]);
                        return { success: true, item: newFlat };
                    }
                } catch (e) {
                    console.error("Failed to add inventory item", e);
                    return { success: false, message: "Network Error" };
                }
            }
        },
        updateFlat: async (updatedFlat) => {
            if (currentUser && currentUser.token) {
                try {
                    const id = updatedFlat._id || updatedFlat.id;
                    const updatedItem = await api.updateInventoryItem(currentUser.token, id, updatedFlat);
                    if (updatedItem._id || updatedItem.id) {
                        setInventory(prev => prev.map(item => (item._id === id || item.id === id) ? updatedItem : item));
                        return { success: true, item: updatedItem };
                    }
                } catch (e) {
                    console.error("Failed to update inventory item", e);
                    return { success: false, message: "Network Error" };
                }
            }
        },
        deleteFlat: async (flatId) => {
            if (currentUser && currentUser.token) {
                try {
                    await api.deleteInventoryItem(currentUser.token, flatId);
                    setInventory(prev => prev.filter(item => (item._id !== flatId && item.id !== flatId)));
                    return { success: true };
                } catch (e) {
                    console.error("Failed to delete inventory item", e);
                    return { success: false, message: "Network Error" };
                }
            }
        },
        deleteFlats: async (flatIds) => {
            console.warn("Batch delete not fully implemented in API, deleting individually usually better");
            if (currentUser && currentUser.token) {
                for (const id of flatIds) {
                    try {
                        await api.deleteInventoryItem(currentUser.token, id);
                    } catch (e) { console.error("Failed to delete item", id, e); }
                }
                setInventory(prev => prev.filter(item => !flatIds.includes(item._id) && !flatIds.includes(item.id)));
            }
        },

        // Manpower Exposed Context
        manpowerList,
        manpowerAttendance,
        manpowerPayments,
        addManpower,
        updateManpower,
        deleteManpower,
        saveAttendance,
        addManpowerPayment,
        deleteManpowerPayment,

        // Chat
        messages,
        addMessage: async (msgData) => {
            if (currentUser && currentUser.token && activeSite) {
                try {
                    const newMsg = await api.sendMessage(currentUser.token, { ...msgData, siteId: activeSite });
                    if (newMsg._id || newMsg.id) {
                        setMessages(prev => [...prev, newMsg]);
                        return { success: true };
                    }
                } catch (e) { console.error("Send message failed", e); }
            }
        },
        deleteMessage: async (msgId) => {
            if (currentUser && currentUser.token) {
                try {
                    await api.deleteMessage(currentUser.token, msgId);
                    setMessages(prev => prev.filter(m => m._id !== msgId && m.id !== msgId));
                    return { success: true };
                } catch (e) { console.error("Delete message failed", e); }
            }
        },
        updateMessage: async (id, text) => {
            if (currentUser && currentUser.token) {
                try {
                    const updated = await api.updateMessage(currentUser.token, id, text);
                    if (updated._id || updated.id) {
                        setMessages(prev => prev.map(m => (m._id === id || m.id === id) ? updated : m));
                        return { success: true };
                    }
                } catch (e) {
                    console.error("Update message failed", e);
                    return { success: false };
                }
            }
        },

        transactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addMaterialTransaction,
        updateMaterialTransaction: updateMaterial,
        deleteMaterialTransaction: deleteMaterial,

        savedSuppliers, addSavedSupplier, deleteSavedSupplier,
        savedContractors, addSavedContractor, deleteSavedContractor,
        savedTrades, addSavedTrade, deleteSavedTrade,
        savedMaterialNames, addSavedMaterialName, deleteSavedMaterialName,
        savedBillItems, addSavedBillItem, deleteSavedBillItem,
        savedUnits, addSavedUnit, deleteSavedUnit,
        savedMaterialTypes, addSavedMaterialType, deleteSavedMaterialType,

        // Documents
        documents,
        addDocument: async (docData) => {
            if (currentUser && currentUser.token && activeSite) {
                try {
                    let payload;

                    if (docData.file) {
                        const formData = new FormData();
                        formData.append('siteId', activeSite);
                        // Append all other fields
                        Object.keys(docData).forEach(key => {
                            formData.append(key, docData[key]);
                        });
                        payload = formData;
                    } else {
                        payload = { ...docData, siteId: activeSite };
                    }

                    const newDoc = await api.createDocument(currentUser.token, payload);

                    if (newDoc && (newDoc._id || newDoc.id)) {
                        setDocuments(prev => [newDoc, ...prev]);
                        return { success: true, document: newDoc };
                    } else {
                        return { success: false, message: newDoc?.message || "Upload failed" };
                    }
                } catch (e) {
                    console.error("Failed to add document", e);
                    return { success: false, message: "Network Error: " + e.message };
                }
            } else {
                return { success: false, message: "Auth or Site missing" };
            }
        },
        deleteDocument: async (docId) => {
            if (currentUser && currentUser.token) {
                try {
                    await api.deleteDocument(currentUser.token, docId);
                    setDocuments(prev => prev.filter(d => (d._id !== docId && d.id !== docId)));
                    return { success: true };
                } catch (e) {
                    console.error("Failed to delete document", e);
                    return { success: false, message: "Network Error" };
                }
            }
        },
        getDocument: async (id) => {
            if (currentUser && currentUser.token) {
                try {
                    return await api.getDocumentById(currentUser.token, id);
                } catch (e) {
                    console.error("Failed to get document", e);
                    return null;
                }
            }
        },

        // Contacts
        contacts,
        addContact,
        updateContact,
        deleteContact,

        // Bills
        bills,
        addBill: async (bill) => {
            if (currentUser && currentUser.token && activeSite) {
                try {
                    const newBill = await api.createBill(currentUser.token, { ...bill, siteId: activeSite });
                    if (newBill._id || newBill.id) {
                        setBills(prev => [newBill, ...prev]);
                        return { success: true, bill: newBill };
                    }
                } catch (e) {
                    console.error("Failed to add bill", e);
                    return { success: false, message: "Network Error" };
                }
            }
        },
        updateBill: async (updatedBill) => {
            if (currentUser && currentUser.token) {
                try {
                    const id = updatedBill._id || updatedBill.id;
                    const result = await api.updateBill(currentUser.token, id, updatedBill);
                    if (result._id || result.id) {
                        setBills(prev => prev.map(b => (b._id === id || b.id === id) ? result : b));
                        return { success: true, bill: result };
                    }
                } catch (e) {
                    console.error("Failed to update bill", e);
                    return { success: false, message: "Network Error" };
                }
            }
        },
        deleteBill: async (billId) => {
            if (currentUser && currentUser.token) {
                try {
                    const res = await api.deleteBill(currentUser.token, billId);
                    setBills(prev => prev.filter(b => (b._id !== billId && b.id !== billId)));
                    return { success: true };
                } catch (e) {
                    console.error("Failed to delete bill", e);
                    return { success: false, message: "Network Error" };
                }
            }
        },

        // Reports
        concreteTests,
        addConcreteTest,
        updateConcreteTest,
        deleteConcreteTest,
        updateConcreteTestResult,
        steelTests,
        addSteelTest,
        updateSteelTest,
        deleteSteelTest,
        brickTests,
        addBrickTest,
        updateBrickTest,
        deleteBrickTest,

        // Reports (DPRs)
        dprs,
        addDPR: async (dprData) => {
            if (currentUser && currentUser.token) {
                try {
                    const newDPR = await api.createDPR(currentUser.token, { ...dprData, siteId: activeSite });
                    if (newDPR._id || newDPR.id) {
                        setDprs(prev => [newDPR, ...prev]);
                        return { success: true, dpr: newDPR };
                    } else {
                        return { success: false, message: newDPR.message };
                    }
                } catch (e) {
                    console.error("Failed to add DPR:", e);
                    return { success: false, message: e.message || "Unknown Error" };
                }
            }
        },
        updateDPR: async (dprId, updates) => {
            if (currentUser && currentUser.token) {
                try {
                    const updatedDPR = await api.updateDPR(currentUser.token, dprId, updates);
                    if (updatedDPR._id || updatedDPR.id) {
                        setDprs(prev => prev.map(d => (d._id === dprId || d.id === dprId) ? updatedDPR : d));
                        return { success: true, dpr: updatedDPR };
                    } else {
                        return { success: false, message: updatedDPR.message };
                    }
                } catch (e) {
                    console.error("Failed to update DPR:", e);
                    return { success: false, message: e.message || "Unknown Error" };
                }
            }
        },
        deleteDPR: async (dprId) => {
            if (currentUser && currentUser.token) {
                try {
                    await api.deleteDPR(currentUser.token, dprId);
                    setDprs(prev => prev.filter(d => d._id !== dprId && d.id !== dprId));
                    return { success: true };
                } catch (e) {
                    console.error("Failed to delete DPR", e);
                    return { success: false, message: "Network Error" };
                }
            }
        },

        // Reports (Tests)
        concreteTests,
        steelTests,
        brickTests,
        addConcreteTest: async (data) => {
            console.log("addConcreteTest called", data);
            if (currentUser && currentUser.token && activeSite) {
                const { location, castingDate, image, ...rest } = data;
                const reportData = {
                    type: 'concrete',
                    location,
                    date: castingDate,
                    image,
                    data: { ...rest, castingDate }
                };
                try {
                    const res = await api.createReport(currentUser.token, { ...reportData, siteId: activeSite });
                    console.log("createReport res", res);
                    if (res && (res.id !== undefined || res._id || res.createdAt)) {
                        setConcreteTests(prev => [res, ...prev]);
                        return { success: true };
                    } else {
                        return { success: false, message: "Invalid Res: " + JSON.stringify(res) };
                    }
                } catch (e) {
                    console.error("Add Concrete Failed", e);
                    return { success: false, message: e.message || "Network Error" };
                }
            } else {
                const errorMsg = !currentUser ? "Not Logged In" : !activeSite ? "No Site Selected" : "Unknown Auth Error";
                console.error("Missing Auth or Site for Report", { currentUser: !!currentUser, activeSite });
                return { success: false, message: errorMsg };
            }
        },


        // Custom Shapes
        customShapes,
        addCustomShape,
        updateCustomShape,
        deleteCustomShape,

    }), [
        users, currentUser, activeSite, companies, activeCompanyId, attendance, siteImages, customCategories, savedParties, contacts, materials, drawings,
        refreshData, estimations, customShapes, activeEstimationFolder, projectTasks, checklistTemplates, checklists, inventory, manpowerList, manpowerAttendance, manpowerPayments,
        messages, savedSuppliers, savedContractors, savedTrades, savedMaterialNames, savedBillItems, documents, bills, concreteTests, steelTests, brickTests, transactions,
        dprs,
        savedUnits, savedMaterialTypes // Added missing deps
    ]);

    return (
        <DataContext.Provider value={contextValue}>
            {children}
        </DataContext.Provider >
    );
};
