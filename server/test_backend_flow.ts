
import axios from 'axios';

const API_URL = 'http://localhost:5002/api';

async function testFlow() {
    try {
        console.log('1. Registering User...');
        let token = '';
        let userId = '';

        try {
            const regRes = await axios.post(`${API_URL}/auth/register`, {
                name: 'Test Admin',
                username: `testadmin_${Date.now()}`,
                email: `test_${Date.now()}@example.com`,
                password: 'password123',
                role: 'Owner'
            });
            console.log('Register Success:', regRes.data.username);
            token = regRes.data.token;
            userId = regRes.data.id;
        } catch (e: any) {
            console.log('Register Failed (Maybe exists):', e.response?.data?.message || e.message);
            // Try login
            console.log('Trying Login...');
            const loginRes = await axios.post(`${API_URL}/auth/login`, {
                username: 'admin', // assuming one exists or try to login with the one just failed? 
                // Let's rely on distinct username above.
                password: 'password123'
            });
            token = loginRes.data.token;
            userId = loginRes.data.id;
        }

        if (!token) throw new Error('No token obtained');

        const headers = { Authorization: `Bearer ${token}` };

        console.log('2. Creating Company...');
        const compRes = await axios.post(`${API_URL}/companies`, {
            name: 'Test Company',
            mobile: '1234567890',
            email: 'company@test.com'
        }, { headers });
        console.log('Company Created:', compRes.data.id);
        const companyId = compRes.data.id;

        console.log('3. Creating Site...');
        const siteRes = await axios.post(`${API_URL}/sites`, {
            name: 'Test Site',
            address: 'Test Location',
            companyId: companyId
        }, { headers });
        console.log('Site Created:', siteRes.data.id);
        const siteId = siteRes.data.id;

        console.log('4. Fetching Sites...');
        const sitesRes = await axios.get(`${API_URL}/sites?companyId=${companyId}`, { headers });
        console.log('Sites found:', sitesRes.data.length);

        console.log('5. Creating Manpower Resource...');
        const mpRes = await axios.post(`${API_URL}/manpower`, {
            siteId,
            name: 'Worker 1',
            type: 'Unskilled',
            trade: 'Helper',
            rate: 500
        }, { headers });
        console.log('Manpower Created:', mpRes.data.id);

        console.log('6. Fettching Manpower...');
        const mpListRes = await axios.get(`${API_URL}/manpower?siteId=${siteId}`, { headers });
        console.log('Manpower List Size:', mpListRes.data.length);

        console.log('7. Creating DPR...');
        const dprRes = await axios.post(`${API_URL}/dpr`, {
            siteId,
            projectInfo: { projectName: 'Test Site', dprNo: 1, date: '2023-10-27', weather: 'Clear', temp: 30 },
            manpower: [],
            planTomorrow: 'Work hard'
        }, { headers });
        console.log('DPR Created:', dprRes.data.id);

        console.log('8. Fetching DPRs...');
        const dprListRes = await axios.get(`${API_URL}/dpr?siteId=${siteId}`, { headers });
        console.log('DPR List Size:', dprListRes.data.length);

        console.log('Test Flow Completed Successfully!');
    } catch (error: any) {
        if (error.response) {
            console.error('Test Flow Failed:', error.response.status, error.response.statusText);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Test Flow Failed:', error.message);
        }
        process.exit(1);
    }
}

testFlow();
