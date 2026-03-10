
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './src/config/db';
import User from './src/models/User';
import Company from './src/models/Company';
import Site from './src/models/Site';

dotenv.config();

const checkStats = async () => {
    await connectDB();

    try {
        const userCount = await User.countDocuments();
        const companyCount = await Company.countDocuments();
        const siteCount = await Site.countDocuments();

        console.log('--- Database Stats ---');
        console.log(`Connected to: ${process.env.MONGO_URI}`);
        console.log(`Users: ${userCount}`);
        console.log(`Companies: ${companyCount}`);
        console.log(`Sites: ${siteCount}`);
        console.log('----------------------');

        if (userCount < 2 && companyCount === 0) {
            console.log("CONCLUSION: This database looks almost empty. It is likely NOT your production database.");
        } else {
            console.log("CONCLUSION: This database has data. It might be your production database.");
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

checkStats();
