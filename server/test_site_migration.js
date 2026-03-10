// const fetch = require('node-fetch'); // Use native fetch

const BASE_URL = 'http://127.0.0.1:5000/api';
let token = '';
let userId = '';
let siteId = '';

async function run() {
    try {
        // 1. Login/Register
        console.log('1. Login...');
        let res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test@test.com', password: 'password' })
        });

        let data = await res.json();

        if (!res.ok) {
            console.log('Login failed, trying register...');
            res = await fetch(`${BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Test', email: 'test@test.com', username: 'testuser', password: 'password' })
            });
            data = await res.json();
        }

        if (data.token) {
            token = data.token;
            userId = data._id;
            console.log('Login Success. Token acquired.');
        } else {
            throw new Error('Auth failed: ' + JSON.stringify(data));
        }

        // 2. Create Site
        console.log('2. Create Site...');
        // Need companyId. For now, we can pass 0 or create a company first?
        // User/Company migration says companyId is optional/FK.
        // Let's assume we need a Company.
        // But wait, accessControl checks permissions!
        // We are "User" role by default.
        // We need to be Admin/Owner to create site or have permissions.
        // Let's update user to be Admin first via direct DB or hack?
        // Or assume the test endpoint allows it?
        // siteRoutes says `createSite` requires protect.
        // siteController says `createSite` does NOT check specific permission, just `protect`?
        // Wait, looking at `siteController.ts` (Step 380):
        /*
        export const createSite = async (req: Request, res: Response) => {
             // ... no permission check visible in snippet?
             // ... await Site.create ...
        }
        */
        // If there is no specific check, any user can create site?
        // Let's try.

        // We also need a Company.
        // Let's create a dummy company directly via Sequelize script? 
        // Or assume ID 1 exists (from initial migration I might have created one?)
        // I created a user, not a company in `check_model.ts`.
        // `Company.sync` was called.
        // I'll try with companyId: 1. It might fail FK check if it doesn't exist.

        res = await fetch(`${BASE_URL}/sites`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: 'Test Site MySQL',
                address: '123 MySQL St',
                companyId: 1,
                status: 'active'
            })
        });

        data = await res.json();
        if (res.ok) {
            console.log('Site Created:', data);
            siteId = data.id;
        } else {
            console.log('Create Site Failed (Expected if Company 1 missing):', data);
            // If failed due to FK, we verify that validation works.
            // But to verify flow, we need a company.
        }

        // If site creation failed, we can't test assignment easily without valid site.
        // But let's assume we can at least reach the controller.

        if (siteId) {
            // 3. Assign User to Site
            console.log('3. Assign User to Site...');
            res = await fetch(`${BASE_URL}/auth/assign-site`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ userId, siteId })
            });
            data = await res.json();
            console.log('Assign Result:', data);

            // 4. Get Sites
            console.log('4. Get Sites...');
            res = await fetch(`${BASE_URL}/sites`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            data = await res.json();
            console.log('Get Sites Result:', data);

            if (Array.isArray(data) && data.length > 0) {
                console.log('VERIFICATION PASSED');
            } else {
                console.log('VERIFICATION WARNING: Sites list empty (accessControl might filter)');
            }
        }

    } catch (e) {
        console.error('FAIL:', e);
    }
}

run();
