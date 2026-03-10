
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User';
import Company from './src/models/Company';
import Site from './src/models/Site';

dotenv.config();

const inspectOwnership = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is undefined');
        }
        console.log(`Connecting to DB...`);
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        // 1. Check logged in user 'vini'
        const viniUser = await User.findOne({ username: 'vini' });
        console.log(`\n--- User 'vini' ---`);
        if (viniUser) {
            console.log(`ID: ${viniUser._id}`);
            console.log(`Role: ${viniUser.role}`);
            console.log(`CompanyId: ${viniUser.companyId}`);
        } else {
            console.log('User not found.');
        }

        // 2. Inspect specific companies
        const companyNames = ['Test', 'Palak Enginears'];
        // regex search case insensitive
        const companies = await Company.find({
            name: { $in: companyNames.map(n => new RegExp(n, 'i')) }
        });

        console.log(`\n--- Specific Companies Check ---`);
        for (const comp of companies) {
            console.log(`Company: ${comp.name}`);
            console.log(` - ID: ${comp._id}`);
            console.log(` - OwnerID: ${comp.ownerId}`);

            // Check if owner exists
            const owner = await User.findById(comp.ownerId);
            console.log(` - Owner Found: ${owner ? 'YES (' + owner.username + ')' : 'NO'}`);

            if (viniUser && comp.ownerId && comp.ownerId.toString() === viniUser._id.toString()) {
                console.log(` - OWNED BY VINI: YES`);
            } else {
                console.log(` - OWNED BY VINI: NO`);
            }
        }

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

inspectOwnership();
