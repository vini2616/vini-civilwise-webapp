
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './src/config/db';
import User from './src/models/User';
import Company from './src/models/Company';
import Site from './src/models/Site';

dotenv.config();

const checkTestDB = async () => {
    // Override URI to point to 'test' database
    const originalUri = process.env.MONGO_URI || '';
    const testUri = originalUri.replace('/civilwise', '/test');

    console.log(`Connecting to: ${testUri}`);

    try {
        await mongoose.connect(testUri);
        console.log('Connected to TEST DB.');

        const userCount = await User.countDocuments();
        const companyCount = await Company.countDocuments();
        const siteCount = await Site.countDocuments();

        console.log('--- TEST Database Stats ---');
        console.log(`Users: ${userCount}`);
        console.log(`Companies: ${companyCount}`);
        console.log(`Sites: ${siteCount}`);
        console.log('---------------------------');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

checkTestDB();
