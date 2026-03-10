
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

        // Create User in BOTH sites
        const username = `test_remove_${Date.now()}`;
        const user = await User.create({
            name: 'Test Remove',
            username: username,
            email: `${username}@test.com`,
            sites: [abode._id, het._id],
            companyId: abode.companyId
        });
        console.log(`Created user ${user.username} in Abode AND Het.`);
        console.log(`Initial Sites: ${user.sites}`);

        // Simulate removeUserFromSite (Het)
        const siteIdToRemove = het._id.toString();
        user.sites = user.sites.filter(site => site.toString() !== siteIdToRemove);
        await user.save();

        console.log(`Removed from Het.`);

        // Verify
        const updatedUser = await User.findById(user._id);
        console.log(`Updated Sites: ${updatedUser.sites}`);

        const inAbode = updatedUser.sites.some(s => s.toString() === abode._id.toString());
        const inHet = updatedUser.sites.some(s => s.toString() === het._id.toString());

        if (inAbode && !inHet) {
            console.log('PASS: User remains in Abode and removed from Het.');
        } else {
            console.log('FAIL: User state incorrect.');
            console.log(`In Abode: ${inAbode}`);
            console.log(`In Het: ${inHet}`);
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
