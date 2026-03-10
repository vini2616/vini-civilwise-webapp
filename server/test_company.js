// Native fetch is available in Node 18+

const API_URL = 'http://127.0.0.1:5000/api';

async function testCompanyCreation() {
    try {
        console.log("1. Registering User...");
        const email = `test_comp_${Date.now()}@example.com`;
        const regRes = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Comp Tester', email, password: 'password123' }),
        });
        const regData = await regRes.json();

        if (!regData.token) {
            console.error("Registration Failed:", regData);
            return;
        }
        console.log("User Registered. Token:", regData.token.substring(0, 20) + "...");

        console.log("\n2. Creating Company...");
        const companyData = {
            name: 'Test Company Ltd',
            address: '123 Test St',
            mobile: '9876543210',
            email: 'info@testcomp.com',
            website: 'www.testcomp.com'
        };

        const compRes = await fetch(`${API_URL}/companies`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${regData.token}`
            },
            body: JSON.stringify(companyData),
        });

        const compData = await compRes.json();

        if (compRes.status === 201) {
            console.log("✅ Company Created Successfully:", compData);
        } else {
            console.error("❌ Company Creation Failed:", compRes.status, compData);
        }

    } catch (error) {
        console.error("Test Error:", error);
    }
}

testCompanyCreation();
