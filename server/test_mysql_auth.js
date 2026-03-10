const API_URL = 'http://localhost:5000/api/auth';

const testUser = {
    name: 'MySQL Test User',
    email: 'mysql_test@example.com',
    username: 'mysql_test',
    password: 'password123'
};

async function testAuth() {
    try {
        console.log('1. Testing Registration...');
        let regRes = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testUser)
        });

        let regData;
        const contentType = regRes.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            regData = await regRes.json();
        } else {
            regData = await regRes.text();
        }

        if (regRes.ok) {
            console.log('Registration Success:', regData);
        } else {
            if (regData.message === 'User already exists') {
                console.log('User already exists, proceeding to login...');
            } else {
                console.error('Registration Failed:', regData);
            }
        }

        console.log('2. Testing Login...');
        const loginRes = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testUser.email,
                password: testUser.password
            })
        });
        const loginData = await loginRes.json();

        if (loginRes.ok) {
            console.log('Login Success:', loginData);
            if (loginData.token && loginData._id) {
                console.log('VERIFICATION PASSED: Token and ID received.');
            } else {
                console.log('VERIFICATION FAILED: Missing token or ID.');
            }
        } else {
            console.error('Login Failed:', loginData);
        }

    } catch (error) {
        console.error('Test Failed:', error);
    }
}

testAuth();
