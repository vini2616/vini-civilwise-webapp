// const fetch = require('node-fetch'); // Native fetch in Node 18+

async function testUserCreation() {
    try {
        // 1. Login as Admin to get token
        console.log("Logging in...");
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'Vini', password: 'AlwaysVini' })
        });
        const loginData = await loginRes.json();
        console.log("Login Response:", loginData);

        if (!loginData.token) {
            console.error("Login failed!");
            return;
        }

        const token = loginData.token;

        // 2. Create New User
        console.log("Creating User...");
        const userRes = await fetch('http://localhost:5000/api/auth/create-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: "Test User",
                username: "testuser_" + Date.now(),
                password: "password123",
                role: "Engineer",
                email: `testuser_${Date.now()}@vini.app`,
                permissions: { dashboard: "view_only" } // sending object to see if it breaks (model expects array of strings? or mixed?)
            })
        });

        console.log("User Creation Status:", userRes.status);
        const userData = await userRes.json();
        console.log("User Creation Response:", JSON.stringify(userData, null, 2));

    } catch (error) {
        console.error("Test Failed:", error);
    }
}

testUserCreation();
