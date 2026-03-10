
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = mongoose.model('User', new mongoose.Schema({
    name: String,
    username: String,
    email: String,
    sites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Site' }],
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' }
}));

const Site = mongoose.model('Site', new mongoose.Schema({
    name: String
}));

const test = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        // Find Sites
        const abode = await Site.findOne({ name: /abode/i });
        const het = await Site.findOne({ name: /het/i });

        if (!abode || !het) {
            console.log('Sites not found');
            process.exit(1);
        }

        console.log(`Abode ID: ${abode._id}`);
        console.log(`Het ID: ${het._id}`);

        // Create User in Abode
        const username = `test_cross_${Date.now()}`;
        const user = await User.create({
            name: 'Test Cross',
            username: username,
            email: `${username}@test.com`,
            sites: [abode._id],
            companyId: abode.companyId
        });
        console.log(`Created user ${user.username} in Abode.`);

        // Simulate getUsers for Het
        // Logic: find users where sites contains het._id
        const usersInHet = await User.find({ sites: het._id });
        const found = usersInHet.find(u => u.username === username);

        if (found) {
            console.log('FAIL: User found in Het site!');
        } else {
            console.log('PASS: User NOT found in Het site.');
        }

        // Cleanup
        await User.deleteOne({ _id: user._id });
        console.log('Cleanup done.');

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

test();
