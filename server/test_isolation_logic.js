
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = mongoose.model('User', new mongoose.Schema({
    name: String,
    username: String,
    sites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Site' }],
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' }
}));

const Site = mongoose.model('Site', new mongoose.Schema({
    name: String,
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' }
}));

const test = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const abode = await Site.findOne({ name: /abode/i });
        const het = await Site.findOne({ name: /het/i });

        if (!abode || !het) {
            console.log('Sites not found');
            process.exit(1);
        }

        // Create User in Abode ONLY
        const username = `test_iso_${Date.now()}`;
        const user = await User.create({
            name: 'Test Iso',
            username: username,
            sites: [abode._id],
            companyId: abode.companyId
        });

        // Test 1: Fetch for Abode (Should find)
        const usersInAbode = await User.find({ sites: abode._id });
        const foundInAbode = usersInAbode.find(u => u.username === username);
        console.log(`Test 1 (Abode): ${foundInAbode ? 'PASS' : 'FAIL'}`);

        // Test 2: Fetch for Het (Should NOT find)
        const usersInHet = await User.find({ sites: het._id });
        const foundInHet = usersInHet.find(u => u.username === username);
        console.log(`Test 2 (Het): ${!foundInHet ? 'PASS' : 'FAIL'}`);

        // Test 3: Fetch for Company (Should find - for Import)
        // Logic: companyId matches OR companyId is null
        const usersInCompany = await User.find({
            $or: [
                { companyId: abode.companyId },
                { companyId: null }
            ]
        });
        const foundInCompany = usersInCompany.find(u => u.username === username);
        console.log(`Test 3 (Company): ${foundInCompany ? 'PASS' : 'FAIL'}`);

        // Cleanup
        await User.deleteOne({ _id: user._id });

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

test();
