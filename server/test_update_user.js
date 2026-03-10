const API_URL = 'http://localhost:5000/api';

async function testUpdate() {
    try {
        // 1. Login as admin
        console.log("Logging in...");
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'Vini', password: 'Vini2616' })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log("Logged in.");

        // 2. Find user 'coffin'
        console.log("Fetching users...");
        const usersRes = await fetch(`${API_URL}/auth/users`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const users = await usersRes.json();
        const coffin = users.find(u => u.username === 'coffin');

        if (!coffin) {
            console.error("User 'coffin' not found!");
            return;
        }
        console.log("Found user:", coffin._id);

        // 3. Try to update
        console.log("Updating user...");
        const updateData = {
            name: 'coffin',
            mobile: '9925037168',
            role: 'Engineer',
            salary: '', // Empty string to test casting error
            username: 'coffin',
            // password: '', // Removed to simulate not sending it
            permission: 'data_entry',
            modulePermissions: { dpr: 'view_only' }
        };

        const updateRes = await fetch(`${API_URL}/auth/users/${coffin._id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(updateData)
        });

        const updateResult = await updateRes.json();

        if (updateRes.ok) {
            console.log("Update Success:", updateResult);
        } else {
            console.error("Update Failed:", updateResult);
        }

    } catch (error) {
        console.error("Script Error:", error);
    }
}

testUpdate();
