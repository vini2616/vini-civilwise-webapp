const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

const run = async () => {
    try {
        // 1. Login to get token
        console.log('Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            username: 'Vini',
            password: 'Vini2616'
        });
        const token = loginRes.data.token;
        console.log('Logged in. Token obtained.');

        // 2. Call getSites with a companyId
        // We need a valid companyId. Let's assume one exists or just pass a dummy one to trigger the code path.
        // The error happens in accessControl, which runs BEFORE filtering by companyId in the controller (mostly).
        // Actually, getSites calls getAccessibleSiteIds.

        console.log('Calling getSites...');
        const sitesRes = await axios.get(`${API_URL}/sites`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { companyId: '675432109876543210987654' } // Dummy ID, just to trigger logic
        });
        console.log('Sites retrieved:', sitesRes.data);

    } catch (error) {
        console.error('Error reproducing issue:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error(error.message);
        }
    }
};

run();
