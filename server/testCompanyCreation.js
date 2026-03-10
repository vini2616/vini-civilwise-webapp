// const fetch = require('node-fetch'); // Native fetch in Node 18+

async function testCreateCompany() {
    try {
        // 1. Login to get token
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

        // 2. Create Company
        console.log("Creating Company...");
        const companyRes = await fetch('http://localhost:5000/api/companies', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: "Test Company " + Date.now(),
                mobile: "1234567890",
                address: "Test Address"
            })
        });

        console.log("Company Response Status:", companyRes.status);
        const companyData = await companyRes.json();
        console.log("Company Response Data:", companyData);

    } catch (error) {
        console.error("Test Failed:", error);
    }
}

testCreateCompany();
