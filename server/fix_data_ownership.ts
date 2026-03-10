
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './src/config/db';
import User from './src/models/User';
import Company from './src/models/Company';
import Site from './src/models/Site';

dotenv.config();

const fixOwnership = async () => {
    await connectDB();

    try {
        const user = await User.findOne({ username: 'vini' });
        if (!user) {
            console.log('User "vini" not found. Cannot proceed.');
            return;
        }

        console.log(`Assigning all data to user: ${user.username} (${user._id})`);

        // 1. Find all companies
        const companies = await Company.find();
        console.log(`Found ${companies.length} companies.`);

        const companyIds = [];
        for (const company of companies) {
            companyIds.push(company._id);
            // Update owner to current user
            company.ownerId = user._id as any;
            await company.save();
            console.log(` - Updated Company: ${company.name}`);
        }

        // 2. Update User's company list
        user.companies = companyIds as any;
        user.companyId = companyIds[0] as any; // Set primary company
        user.role = 'Owner';
        await user.save();
        console.log(' - Updated User companies list and role.');

        // 3. Update Sites (Optional, usually site defaults to company owner, but good to check)
        // We don't need to change site content usually if company is linked.

        console.log('Ownership fix complete. Please log in again.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

fixOwnership();
