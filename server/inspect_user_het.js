
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

// Define Models (Simplified)
const UserSchema = new mongoose.Schema({
    name: String,
    username: String,
    email: String,
    sites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Site' }],
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' }
});
const User = mongoose.model('User', UserSchema);

const SiteSchema = new mongoose.Schema({
    name: String,
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' }
});
const Site = mongoose.model('Site', SiteSchema);

const inspectUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const user = await User.findOne({ username: 'het' });
        if (!user) {
            console.log('User "het" not found.');
        } else {
            console.log(`User found: ${user.name} (${user._id})`);
            console.log(`Company ID: ${user.companyId}`);
            console.log(`Sites Array: ${JSON.stringify(user.sites)}`);

            // Fetch site details
            if (user.sites && user.sites.length > 0) {
                const sites = await Site.find({ _id: { $in: user.sites } });
                console.log('Site Details:');
                sites.forEach(s => console.log(`- Name: ${s.name}, ID: ${s._id}`));
            } else {
                console.log('No sites assigned.');
            }
        }

        // Also check if there are other users with 'het' in name
        const others = await User.find({ name: /het/i });
        console.log(`\nTotal users matching 'het': ${others.length}`);
        others.forEach(u => console.log(`- ${u.name} (${u.username}) Sites: ${u.sites.length}`));

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

inspectUser();
