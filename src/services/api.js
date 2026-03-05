const API_URL = import.meta.env.VITE_API_URL + "/api";

export const api = {
    // Auth
    register: async (name, email, password, role) => {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role }),
        });
        return res.json();
    },

    login: async (username, password) => {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        return res.json();
    },

    verifyToken: async (token) => {
        const res = await fetch(`${API_URL}/auth/verify`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    createUser: async (token, userData) => {
        const res = await fetch(`${API_URL}/auth/create-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(userData),
        });
        return res.json();
    },

    getUsers: async (token, siteId, companyId) => {
        let url = `${API_URL}/auth/users`;
        const params = new URLSearchParams();
        if (siteId) params.append('siteId', siteId);
        if (companyId) params.append('companyId', companyId);
        if (params.toString()) url += `?${params.toString()}`;

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    assignUserToSite: async (token, userId, siteId) => {
        const res = await fetch(`${API_URL}/auth/assign-site`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ userId, siteId }),
        });
        return res.json();
    },

    removeUserFromSite: async (token, userId, siteId) => {
        const res = await fetch(`${API_URL}/auth/remove-site`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ userId, siteId }),
        });
        return res.json();
    },

    deleteUser: async (token, userId) => {
        const res = await fetch(`${API_URL}/auth/users/${userId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return res.json();
    },

    updateUser: async (token, userId, userData) => {
        const res = await fetch(`${API_URL}/auth/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(userData),
        });
        return res.json();
    },

    // Site Settings (Master Data)
    getSiteSettings: async (token, siteId) => {
        const res = await fetch(`${API_URL}/site-settings?siteId=${siteId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    updateSiteSettings: async (token, siteId, updates) => {
        const res = await fetch(`${API_URL}/site-settings?siteId=${siteId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ ...updates, siteId }),
        });
        return res.json();
    },

    // Notes
    getNotes: async (token) => {
        const res = await fetch(`${API_URL}/notes`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    createNote: async (token, note) => {
        const res = await fetch(`${API_URL}/notes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(note),
        });
        return res.json();
    },


    // Health
    health: async () => {
        try {
            const res = await fetch(`${API_URL}/health`);
            return res.json();
        } catch (e) {
            return { ok: false, error: e.message };
        }
    },

    getDeletedCompanies: async (token) => {
        const res = await fetch(`${API_URL}/companies/deleted`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    restoreCompanyFromTrash: async (token, companyId) => {
        const res = await fetch(`${API_URL}/companies/restore-trash/${companyId}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    // Companies
    getCompanies: async (token) => {
        const res = await fetch(`${API_URL}/companies`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    createCompany: async (token, company) => {
        const res = await fetch(`${API_URL}/companies`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(company),
        });
        return res.json();
    },

    updateCompany: async (token, id, companyData) => {
        const res = await fetch(`${API_URL}/companies/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(companyData),
        });
        return res.json();
    },

    deleteCompany: async (token, companyId) => {
        const res = await fetch(`${API_URL}/companies/${companyId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!res.ok) throw new Error('Failed to delete company');

        // Check for file download (Soft Delete Backup)
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('zip')) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `company_backup_${companyId}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            return { message: 'Company deleted and backup downloaded', success: true };
        }

        return res.json();
    },

    restoreCompany: async (token, formData) => {
        const res = await fetch(`${API_URL}/companies/restore`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                // Content-Type not set for FormData (browser sets it with boundary)
            },
            body: formData,
        });
        if (!res.ok) {
            let errorMsg = 'Restore failed';
            try { errorMsg = (await res.json()).message; } catch (e) { }
            throw new Error(errorMsg);
        }
        return res.json();
    },

    // Sites
    getSites: async (token, companyId) => {
        let url = `${API_URL}/sites`;
        if (companyId) url += `?companyId=${companyId}`;

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    createSite: async (token, site) => {
        const res = await fetch(`${API_URL}/sites`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(site),
        });
        return res.json();
    },

    updateSite: async (token, id, siteData) => {
        const res = await fetch(`${API_URL}/sites/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(siteData),
        });
        return res.json();
    },

    deleteSite: async (token, siteId) => {
        const res = await fetch(`${API_URL}/sites/${siteId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!res.ok) {
            let errorMessage = 'Failed to delete site';
            try {
                const errorData = await res.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                // If JSON parse fails, try text
                const textError = await res.text().catch(() => '');
                errorMessage = textError || errorMessage;
            }
            throw new Error(errorMessage);
        }

        // Check for file download (Soft Delete Backup)
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('zip')) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `site_backup_${siteId}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            return { message: 'Site deleted and backup downloaded', success: true };
        }

        return res.json();
    },

    restoreSite: async (token, formData) => {
        const res = await fetch(`${API_URL}/sites/restore`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });
        if (!res.ok) {
            let errorMsg = 'Restore failed';
            try { errorMsg = (await res.json()).message; } catch (e) { }
            throw new Error(errorMsg);
        }
        return res.json();
    },

    getDeletedSites: async (token, companyId) => {
        let url = `${API_URL}/sites/deleted`;
        if (companyId) url += `?companyId=${companyId}`;

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    restoreSiteFromTrash: async (token, siteId) => {
        const res = await fetch(`${API_URL}/sites/restore-trash/${siteId}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    // Transactions
    getTransactions: async (token, siteId) => {
        let url = `${API_URL}/transactions`;
        if (siteId) url += `?siteId=${siteId}`;

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    createTransaction: async (token, transaction) => {
        const res = await fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(transaction),
        });
        return res.json();
    },

    updateTransaction: async (token, id, transaction) => {
        const res = await fetch(`${API_URL}/transactions/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(transaction),
        });
        return res.json();
    },

    deleteTransaction: async (token, id) => {
        const res = await fetch(`${API_URL}/transactions/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    // DPR
    getDPRs: async (token, siteId) => {
        const res = await fetch(`${API_URL}/dpr?siteId=${siteId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    getDPRById: async (token, id) => {
        const res = await fetch(`${API_URL}/dpr/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch DPR");
        return res.json();
    },

    createDPR: async (token, dprData) => {
        const res = await fetch(`${API_URL}/dpr`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(dprData),
        });
        return res.json();
    },

    updateDPR: async (token, id, dprData) => {
        const res = await fetch(`${API_URL}/dpr/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(dprData),
        });
        return res.json();
    },

    deleteDPR: async (token, id) => {
        const res = await fetch(`${API_URL}/dpr/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || 'Failed to delete');
        }
        return res.json();
    },

    // Estimations
    getEstimations: async (token, siteId) => {
        const res = await fetch(`${API_URL}/estimations?siteId=${siteId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    createEstimation: async (token, data) => {
        const res = await fetch(`${API_URL}/estimations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });
        return res.json();
    },

    updateEstimation: async (token, id, data) => {
        const res = await fetch(`${API_URL}/estimations/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });
        return res.json();
    },

    deleteEstimation: async (token, id) => {
        const res = await fetch(`${API_URL}/estimations/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    // Inventory
    getInventory: async (token, siteId) => {
        try {
            const res = await fetch(`${API_URL}/inventory?siteId=${siteId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 404) return []; // Silence 404s
            return res.json();
        } catch (e) { return []; }
    },

    createInventoryItem: async (token, itemData) => {
        const res = await fetch(`${API_URL}/inventory`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(itemData),
        });
        return res.json();
    },

    updateInventoryItem: async (token, id, updates) => {
        const res = await fetch(`${API_URL}/inventory/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updates),
        });
        return res.json();
    },

    deleteInventoryItem: async (token, id) => {
        const res = await fetch(`${API_URL}/inventory/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    // Contacts
    getContacts: async (token, siteId) => {
        const res = await fetch(`${API_URL}/contacts?siteId=${siteId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    createContact: async (token, contactData) => {
        const res = await fetch(`${API_URL}/contacts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(contactData),
        });
        return res.json();
    },

    updateContact: async (token, id, contactData) => {
        const res = await fetch(`${API_URL}/contacts/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(contactData),
        });
        return res.json();
    },

    deleteContact: async (token, id) => {
        const res = await fetch(`${API_URL}/contacts/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    // Manpower
    getManpowerResources: async (token, siteId) => {
        let url = `${API_URL}/manpower`;
        if (siteId) url += `?siteId=${siteId}`;
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },
    createManpowerResource: async (token, data) => {
        const res = await fetch(`${API_URL}/manpower`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    updateManpowerResource: async (token, id, data) => {
        const res = await fetch(`${API_URL}/manpower/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    deleteManpowerResource: async (token, id) => {
        const res = await fetch(`${API_URL}/manpower/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    getManpowerAttendance: async (token, siteId) => {
        let url = `${API_URL}/manpower/attendance`;
        if (siteId) url += `?siteId=${siteId}`;
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },
    saveManpowerAttendance: async (token, data) => {
        const res = await fetch(`${API_URL}/manpower/attendance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(data),
        });
        return res.json();
    },

    getManpowerPayments: async (token, siteId) => {
        const res = await fetch(`${API_URL}/manpower/payments?siteId=${siteId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },
    createManpowerPayment: async (token, data) => {
        const res = await fetch(`${API_URL}/manpower/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(data),
        });
        return res.json();
    },
    deleteManpowerPayment: async (token, id) => {
        const res = await fetch(`${API_URL}/manpower/payments/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    // Attendance
    getAttendance: async (token, siteId) => {
        const res = await fetch(`${API_URL}/attendance?siteId=${siteId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    createAttendance: async (token, attendanceData) => {
        const res = await fetch(`${API_URL}/attendance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(attendanceData),
        });
        return res.json();
    },

    updateAttendance: async (token, id, attendanceData) => {
        const res = await fetch(`${API_URL}/attendance/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(attendanceData),
        });
        return res.json();
    },

    deleteAttendance: async (token, id) => {
        const res = await fetch(`${API_URL}/attendance/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    // Materials
    // Documents / Uploads
    uploadDocument: async (token, formData) => {
        const res = await fetch(`${API_URL}/documents`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }, // Content-Type is auto-set by FormData
            body: formData,
        });
        return res.json();
    },

    getMaterials: async (token, siteId) => {
        try {
            const res = await fetch(`${API_URL}/materials?siteId=${siteId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 404) return [];
            return res.json();
        } catch (e) { return []; }
    },

    createMaterial: async (token, materialData) => {
        const res = await fetch(`${API_URL}/materials`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(materialData),
        });
        return res.json();
    },

    deleteMaterialsByDPR: async (token, dprId) => {
        const res = await fetch(`${API_URL}/materials/dpr?dprId=${dprId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    updateMaterial: async (token, id, materialData) => {
        const res = await fetch(`${API_URL}/materials/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(materialData),
        });
        return res.json();
    },

    deleteMaterial: async (token, id) => {
        const res = await fetch(`${API_URL}/materials/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    // Checklists
    getChecklists: async (token, siteId) => {
        const res = await fetch(`${API_URL}/checklists?siteId=${siteId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    createChecklist: async (token, checklistData) => {
        const res = await fetch(`${API_URL}/checklists`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(checklistData),
        });
        return res.json();
    },

    updateChecklist: async (token, id, checklistData) => {
        const res = await fetch(`${API_URL}/checklists/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(checklistData),
        });

        const text = await res.text();

        try {
            const data = JSON.parse(text);
            if (!res.ok) throw new Error(data.message || data.error || "Update failed");
            return data;
        } catch (e) {
            console.error("Failed to parse server response:", text.substring(0, 500));
            if (text.trim().startsWith("<")) {
                const title = text.match(/<title>(.*?)<\/title>/)?.[1] || "Unknown HTML Error";
                throw new Error(`Server Error (${res.status}): ${title}`);
            }
            throw new Error(`Server returned invalid JSON (${res.status}): ${e.message}. Response: ${text.substring(0, 50)}...`);
        }
    },

    deleteChecklist: async (token, id) => {
        const res = await fetch(`${API_URL}/checklists/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    // Project Tasks
    getProjectTasks: async (token, siteId) => {
        const res = await fetch(`${API_URL}/project-tasks?siteId=${siteId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    createProjectTask: async (token, taskData) => {
        const res = await fetch(`${API_URL}/project-tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(taskData),
        });
        return res.json();
    },

    updateProjectTask: async (token, id, taskData) => {
        const res = await fetch(`${API_URL}/project-tasks/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(taskData),
        });
        return res.json();
    },

    deleteProjectTask: async (token, id) => {
        const res = await fetch(`${API_URL}/project-tasks/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    // Custom Shapes
    getCustomShapes: async (token, siteId) => {
        const res = await fetch(`${API_URL}/custom-shapes?siteId=${siteId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    createCustomShape: async (token, shapeData) => {
        const res = await fetch(`${API_URL}/custom-shapes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(shapeData),
        });
        return res.json();
    },

    updateCustomShape: async (token, id, shapeData) => {
        const res = await fetch(`${API_URL}/custom-shapes/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(shapeData),
        });
        return res.json();
    },

    deleteCustomShape: async (token, id) => {
        const res = await fetch(`${API_URL}/custom-shapes/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    // Bills
    getBills: async (token, siteId) => {
        const res = await fetch(`${API_URL}/bills?siteId=${siteId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    createBill: async (token, billData) => {
        const res = await fetch(`${API_URL}/bills`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(billData),
        });
        return res.json();
    },

    updateBill: async (token, id, billData) => {
        const res = await fetch(`${API_URL}/bills/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(billData),
        });
        return res.json();
    },

    deleteBill: async (token, id) => {
        const res = await fetch(`${API_URL}/bills/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },



    // Chat
    getMessages: async (token, siteId) => {
        const res = await fetch(`${API_URL}/chat?siteId=${siteId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    sendMessage: async (token, messageData) => {
        const res = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(messageData),
        });
        return res.json();
    },

    updateMessage: async (token, id, content) => {
        const res = await fetch(`${API_URL}/chat/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ content }),
        });
        return res.json();
    },

    deleteMessage: async (token, id) => {
        const res = await fetch(`${API_URL}/chat/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    // Documents
    getDocuments: async (token, siteId, category) => {
        let url = `${API_URL}/documents?siteId=${siteId}`;
        if (category) url += `&category=${category}`;

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    getDocumentById: async (token, id) => {
        const res = await fetch(`${API_URL}/documents/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    createDocument: async (token, docData) => {
        const isFormData = docData instanceof FormData;
        const headers = {
            Authorization: `Bearer ${token}`,
        };
        // Only set Content-Type if NOT FormData (browser sets boundary for FormData)
        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }

        try {
            const res = await fetch(`${API_URL}/documents`, {
                method: 'POST',
                headers: headers,
                body: isFormData ? docData : JSON.stringify(docData),
            });

            if (!res.ok) {
                const errText = await res.text();
                try {
                    return JSON.parse(errText);
                } catch (e) {
                    return { message: `Server Error (${res.status}): ${errText.substring(0, 50)}...` };
                }
            }
            return await res.json();
        } catch (e) {
            console.error("createDocument API Error:", e);
            return { message: e.message || "Network Request Failed" };
        }
    },

    updateReport: async (token, id, data) => {
        const res = await fetch(`${API_URL}/reports/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(data),
        });
        try {
            return await res.json();
        } catch (e) {
            console.error("Non-JSON response for updateReport", e);
            return { message: "Server Error: Non-JSON Response" };
        }
    },

    deleteDocument: async (token, id) => {
        const res = await fetch(`${API_URL}/documents/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    // Reports
    getReports: async (token, siteId) => {
        const res = await fetch(`${API_URL}/reports?siteId=${siteId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    createReport: async (token, reportData) => {
        const res = await fetch(`${API_URL}/reports`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(reportData),
        });
        try {
            return await res.json();
        } catch (e) {
            console.error("Non-JSON response for createReport", e);
            return { message: "Server Error: Non-JSON Response" };
        }
    },

    deleteReport: async (token, id) => {
        const res = await fetch(`${API_URL}/reports/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    }
};
