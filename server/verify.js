// Node 18+ has native fetch, so we don't need to require it.
// If you are on an older version, please install node-fetch manually.

const request = async (url, method, body, token) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    };

    try {
        const res = await fetch(url, options);
        const data = await res.json();
        return { status: res.status, data };
    } catch (err) {
        console.error(`Error requesting ${url}:`, err.message);
        return null;
    }
};

const run = async () => {
    // Use 127.0.0.1 to avoid localhost DNS issues
    const BASE_URL = 'http://127.0.0.1:5000/api';
    console.log('--- Starting Verification ---');

    // 1. Health Check
    console.log('\n1. Testing Health Endpoint...');
    const health = await request(`${BASE_URL}/health`, 'GET');
    if (health && health.status === 200) {
        console.log('✅ Health Check Passed');
    } else {
        console.error('❌ Health Check Failed. Is the server running?');
        process.exit(1);
    }

    // 2. Register
    console.log('\n2. Testing Registration...');
    const uniqueEmail = `test_${Date.now()}@example.com`;
    const register = await request(`${BASE_URL}/auth/register`, 'POST', {
        name: 'Test User',
        email: uniqueEmail,
        password: 'password123'
    });

    let token = null;
    if (register && register.status === 201) {
        console.log('✅ Registration Passed');
        token = register.data.token;
    } else {
        console.error('❌ Registration Failed', register?.data);
    }

    // 3. Login (Optional if register returns token, but good to test)
    if (!token) {
        console.log('\n3. Testing Login...');
        const login = await request(`${BASE_URL}/auth/login`, 'POST', {
            email: uniqueEmail,
            password: 'password123'
        });
        if (login && login.status === 200) {
            console.log('✅ Login Passed');
            token = login.data.token;
        } else {
            console.error('❌ Login Failed', login?.data);
            process.exit(1);
        }
    }

    // 4. Create Note
    console.log('\n4. Testing Create Note...');
    const note = await request(`${BASE_URL}/notes`, 'POST', {
        title: 'Test Note',
        body: 'This is a test note.'
    }, token);

    if (note && note.status === 201) {
        console.log('✅ Create Note Passed');
    } else {
        console.error('❌ Create Note Failed', note?.data);
    }

    // 5. Get Notes
    console.log('\n5. Testing Get Notes...');
    const notes = await request(`${BASE_URL}/notes`, 'GET', null, token);
    if (notes && notes.status === 200 && Array.isArray(notes.data)) {
        console.log(`✅ Get Notes Passed. Found ${notes.data.length} notes.`);
    } else {
        console.error('❌ Get Notes Failed', notes?.data);
    }

    console.log('\n--- Verification Complete ---');
};

run();
