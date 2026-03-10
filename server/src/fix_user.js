
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vini-app';
        console.log('Connecting to:', uri);
        const conn = await mongoose.connect(uri);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const fixUser = async () => {
    await connectDB();

    const username = 'coffin';
    const db = mongoose.connection.db;

    // Debug: List all databases
    const adminDb = db.admin();
    const dbs = await adminDb.listDatabases();
    console.log("Databases in Cluster:", dbs.databases.map(d => d.name));

    // 1. Get Companies
    const companies = await db.collection('companies').find({}).toArray();
    console.log("Available Companies:", companies.map(c => ({ id: c._id, name: c.name })));

    // 2. Get User
    const user = await db.collection('users').findOne({ username });
    if (!user) {
        console.log("User not found");
        process.exit(1);
    }
    console.log("Current User:", { id: user._id, name: user.name, companies: user.companies });

    // 3. Find Test Company
    const testCompany = companies.find(c => c.name === 'Test');
    if (testCompany) {
        console.log(`Found Test Company: ${testCompany._id}. Adding to user...`);

        const companyIdStr = testCompany._id.toString();

        // Ensure companies array exists
        let currentCompanies = user.companies || [];
        // Convert to strings for comparison just in case
        let currentIds = currentCompanies.map(id => id.toString());

        if (!currentIds.includes(companyIdStr)) {
            // We need to use valid ObjectId for update if the schema expects it, 
            // but using native driver we can push the ObjectId directly.
            await db.collection('users').updateOne(
                { _id: user._id },
                { $addToSet: { companies: testCompany._id } }
            );
            console.log("Added Test Company to User.");
        } else {
            console.log("User already has Test Company.");
        }

        const updatedUser = await db.collection('users').findOne({ username });
        console.log("Updated User Companies:", updatedUser.companies);

    } else {
        console.log("Test Company not found.");
    }

    process.exit(0);
};

fixUser();
