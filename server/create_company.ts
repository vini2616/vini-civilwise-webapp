import { connectDB } from './src/config/sequelize';
import Company from './src/models/Company';

async function setup() {
    try {
        await connectDB();

        console.log('Creating Test Company...');
        const company = await Company.create({
            name: 'MySQL Test Company',
            email: 'company@test.com',
            mobile: '1234567890',
            address: '123 Test St',
            ownerId: 1 // Assuming user 1 exists
        });

        console.log('Company Created:', company.toJSON());
        process.exit(0);
    } catch (error) {
        console.error('FAIL:', error);
        process.exit(1);
    }
}

setup();
