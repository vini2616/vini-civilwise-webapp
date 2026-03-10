const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:5000/api';
let token = '';
let siteId = '';
let transactionId = '';
let materialId = '';
let inventoryId = '';

async function run() {
    try {
        // 1. Login
        console.log('1. Login...');
        let res = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'test@test.com', password: 'password'
        });

        if (res.data.token) {
            token = res.data.token;
            // Capture userid. Check _id or id
            userId = res.data._id || res.data.id;
            console.log(`Login Success. User ID: ${userId}`);
        } else {
            throw new Error('Login failed: ' + JSON.stringify(res.data));
        }

        const authHeader = { headers: { 'Authorization': `Bearer ${token}` } };

        // 2. Get Site (Reuse existing site)
        console.log('2. Get Sites...');
        res = await axios.get(`${BASE_URL}/sites`, authHeader);
        let data = res.data;

        if (Array.isArray(data) && data.length > 0) {
            siteId = data[0].id;
            console.log(`Using Site ID: ${siteId}`);
        } else {
            console.log('No sites found. Creating one...');
            res = await axios.post(`${BASE_URL}/sites`, {
                name: 'Core Test Site', address: '123 Core St', companyId: 1, status: 'active'
            }, authHeader);
            data = res.data;
            siteId = data.id;

            // Assign User to Site
            console.log('2.1 Assign User to Site...');
            const assignRes = await axios.post(`${BASE_URL}/auth/assign-site`, {
                userId: userId,
                siteId: siteId
            }, authHeader);
            console.log('Assignment Response:', assignRes.data);
        }

        // 3. Create Transaction
        console.log('3. Create Transaction...');
        res = await axios.post(`${BASE_URL}/transactions`, {
            date: new Date().toISOString(),
            amount: 1000,
            type: 'expense',
            category: 'Material',
            mode: 'cash',
            siteId: siteId,
            partyName: 'Test Party'
        }, authHeader);

        data = res.data;
        if (res.status === 201) {
            console.log('Transaction Created:', data.id);
            transactionId = data.id;
        }

        // 4. Create Material
        console.log('4. Create Material...');
        res = await axios.post(`${BASE_URL}/materials`, {
            siteId: siteId,
            name: 'Cement',
            quantity: 50,
            unit: 'bags'
        }, authHeader);

        data = res.data;
        if (res.status === 201) {
            console.log('Material Created:', data.id);
            materialId = data.id;
        }

        // 5. Create Inventory
        console.log('5. Create Inventory Item...');
        res = await axios.post(`${BASE_URL}/inventory`, {
            siteId: siteId,
            block: 'A',
            floor: '1',
            flatNumber: '101',
            type: 'Residential',
            area: 1200,
            status: 'Available'
        }, authHeader);

        data = res.data;
        if (res.status === 201) {
            console.log('Inventory Item Created:', data.id);
            inventoryId = data.id;
        }

        // 6. Verify Listings
        console.log('6. Verification - List Items...');

        // List Transactions
        res = await axios.get(`${BASE_URL}/transactions?siteId=${siteId}`, authHeader);
        console.log(`Transactions found: ${res.data.length}`);

        // List Materials
        res = await axios.get(`${BASE_URL}/materials?siteId=${siteId}`, authHeader);
        console.log(`Materials found: ${res.data.length}`);

        // List Inventory
        res = await axios.get(`${BASE_URL}/inventory?siteId=${siteId}`, authHeader);
        console.log(`Inventory Items found: ${res.data.length}`);

        if (transactionId && materialId && inventoryId) {
            console.log('\n--- CORE MODULES VERIFICATION PASSED ---');
        } else {
            console.log('\n--- VERIFICATION FAILED ---');
        }

    } catch (e) {
        console.error('CRITICAL FAIL:', e.response ? e.response.data : e.message);
    }
}

run();
