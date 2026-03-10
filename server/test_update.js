
const API_URL = 'http://localhost:5000/api';

const run = async () => {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'Vini', password: '1234' })
        });

        const loginData = await loginRes.json();
        if (!loginRes.ok) {
            console.error('Login Failed:', loginData);
            return;
        }

        const token = loginData.token;
        console.log('Login Successful, Token received.');

        // 2. Update User
        // Target ID: 69358fa9fdce889c0398918d
        const targetId = '69358fa9fdce889c0398918d';
        console.log(`Updating User ${targetId}...`);

        const updateRes = await fetch(`${API_URL}/auth/users/${targetId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                permission: 'view_edit',
                modulePermissions: {
                    team: 'no_access',
                    estimation: 'no_access',
                    dpr: 'data_entry'
                }
            })
        });

        const updateData = await updateRes.json();

        if (updateRes.ok) {
            console.log('Update Successful:', JSON.stringify(updateData));
        } else {
            console.error('Update Failed:', updateData);
        }

    } catch (error) {
        console.error('Error:', error);
    }
};

run();
