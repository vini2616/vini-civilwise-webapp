
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env explicitly
const envPath = path.join(__dirname, '.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

const run = async () => {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) {
            console.error('NO MONGO_URI FOUND!');
            process.exit(1);
        }
        console.log('Connecting to Mongo (masked):', uri.split('@')[1] || 'localhost'); // Masked

        await mongoose.connect(uri);
        console.log('Connected to DB:', mongoose.connection.name); // Print DB name

        const db = mongoose.connection.db;
        const users = db.collection('users');
        const companies = db.collection('companies');

        const username = 'coffin';
        const user = await users.findOne({ username });
        if (!user) {
            console.error('User coffin NOT FOUND');
            process.exit(1);
        }

        console.log('User found:', user._id);
        console.log('Initial Companies:', user.companies);

        const testCompany = await companies.findOne({ name: 'Test' });
        if (!testCompany) {
            console.error('Test company NOT FOUND');
            process.exit(1);
        }
        console.log('Test Company ID:', testCompany._id);

        // Update
        const res = await users.updateOne(
            { _id: user._id },
            { $addToSet: { companies: testCompany._id } }
        );
        console.log('Update Result:', res);

        // Verify
        const updatedUser = await users.findOne({ username });
        console.log('Final Companies:', updatedUser.companies);

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

run();
