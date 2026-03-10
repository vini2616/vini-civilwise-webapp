
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './src/config/db';
import User from './src/models/User';
import Company from './src/models/Company';
import Site from './src/models/Site';

dotenv.config();

const dumpDB = async () => {
    await connectDB();

    try {
        console.log('--- DB DUMP START ---');

        console.log(`URI: ${process.env.MONGO_URI}`);

        const users = await User.find({});
        console.log(`\nTOTAL USERS: ${users.length}`);
        users.forEach(u => console.log(` [User] ${u.username} (ID: ${u._id}) - Companies: ${u.companies?.length || 0}`));

        const companies = await Company.find({});
        console.log(`\nTOTAL COMPANIES: ${companies.length}`);
        companies.forEach(c => console.log(` [Comp] ${c.name} (ID: ${c._id}) - Owner: ${c.ownerId}`));

        const sites = await Site.find({});
        console.log(`\nTOTAL SITES: ${sites.length}`);
        sites.forEach(s => console.log(` [Site] ${s.name} (ID: ${s._id}) - Company: ${s.companyId}`));

        console.log('--- DB DUMP END ---');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

dumpDB();
