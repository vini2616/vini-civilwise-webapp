import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const BackendTest = () => {
    const [status, setStatus] = useState('Checking...');
    const [logs, setLogs] = useState([]);
    const [token, setToken] = useState(null);

    const addLog = (msg, type = 'info') => {
        setLogs(prev => [...prev, { msg, type, time: new Date().toLocaleTimeString() }]);
    };

    const runTests = async () => {
        setLogs([]);
        setStatus('Running Tests...');

        // 1. Health Check
        addLog('Checking Health...', 'info');
        const health = await api.health();
        if (health.ok) {
            addLog('✅ Health Check Passed', 'success');
        } else {
            addLog(`❌ Health Check Failed: ${health.error || 'Unknown'}`, 'error');
            setStatus('Failed');
            return;
        }

        // 2. Register/Login
        addLog('Testing Auth...', 'info');
        const email = `test_web_${Date.now()}@example.com`;
        const password = 'password123';

        // Try Register
        const regRes = await api.register('Web User', email, password, 'Owner');
        if (regRes.token) {
            addLog('✅ Registration Passed', 'success');
            setToken(regRes.token);
        } else {
            addLog(`⚠️ Registration Warning: ${JSON.stringify(regRes)}`, 'warning');
        }

        // Try Login
        const loginRes = await api.login(email, password);
        if (loginRes.token) {
            addLog('✅ Login Passed', 'success');
            setToken(loginRes.token);

            // 3. Notes
            addLog('Testing Notes...', 'info');
            const noteRes = await api.createNote(loginRes.token, { title: 'Web Note', body: 'Hello from React' });
            if (noteRes.id || noteRes._id) {
                addLog('✅ Create Note Passed', 'success');
            } else {
                addLog('❌ Create Note Failed', 'error');
            }

            const notes = await api.getNotes(loginRes.token);
            if (Array.isArray(notes)) {
                addLog(`✅ Get Notes Passed (Found ${notes.length})`, 'success');
            } else {
                addLog('❌ Get Notes Failed', 'error');
            }

            // 4. Companies & Sites
            addLog('Testing Core Data...', 'info');

            // Create Company
            const compRes = await api.createCompany(loginRes.token, { name: 'Test Corp', address: '123 St', mobile: '9999999999' });
            const compId = compRes.id || compRes._id;

            if (compId) {
                addLog('✅ Create Company Passed', 'success');

                // Create Site
                const siteRes = await api.createSite(loginRes.token, { name: 'Test Site', address: 'Site Addr', companyId: compId });
                const siteId = siteRes.id || siteRes._id;

                if (siteId) {
                    addLog('✅ Create Site Passed', 'success');

                    // Create Transaction
                    const txRes = await api.createTransaction(loginRes.token, {
                        amount: 1000,
                        type: 'debit',
                        category: 'Material',
                        siteId: siteId
                    });
                    if (txRes.id || txRes._id) {
                        addLog('✅ Create Transaction Passed', 'success');
                    } else {
                        addLog('❌ Create Transaction Failed', 'error');
                    }

                } else {
                    addLog('❌ Create Site Failed', 'error');
                }

                // 5. Cleanup (Delete Site)
                if (siteId) {
                    addLog('Testing Deletion...', 'info');
                    try {
                        const delRes = await api.deleteSite(loginRes.token, siteId);
                        addLog('✅ Delete Site Passed', 'success');
                    } catch (err) {
                        addLog(`❌ Delete Site Failed: ${err.message}`, 'error');
                    }
                }


            } else {
                addLog('❌ Create Company Failed', 'error');
            }

        } else {
            addLog('❌ Login Failed', 'error');
        }

        setStatus('Complete');
    };

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
            <h1>Backend Integration Test</h1>
            <div style={{ marginBottom: '20px' }}>
                <strong>Status: </strong> {status}
            </div>
            <button
                onClick={runTests}
                style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
            >
                Run Verification
            </button>

            <div style={{ marginTop: '20px', background: '#f5f5f5', padding: '10px', borderRadius: '5px', minHeight: '200px' }}>
                {logs.map((log, i) => (
                    <div key={i} style={{
                        color: log.type === 'error' ? 'red' : log.type === 'success' ? 'green' : 'black',
                        marginBottom: '5px'
                    }}>
                        [{log.time}] {log.msg}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BackendTest;
