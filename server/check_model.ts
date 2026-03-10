import { connectDB } from './src/config/sequelize';
import User from './src/models/User';
import Company from './src/models/Company';

async function check() {
    try {
        await connectDB();
        console.log('DB Connected.');

        console.log('Syncing User...');
        await User.sync({ alter: true });
        console.log('User synced.');

        console.log('Syncing Company...');
        await Company.sync({ alter: true });
        console.log('Company synced.');

        console.log('creating test user...');
        await User.create({
            name: 'Test',
            email: 'test@test.com',
            username: 'testuser',
            passwordHash: 'password',
            role: 'User'
        });
        console.log('User created.');

        process.exit(0);
    } catch (error) {
        console.error('FAIL:', error);
        process.exit(1);
    }
}

check();
