
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = mongoose.model('User', new mongoose.Schema({
    username: String,
    sites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Site' }]
}));

const Site = mongoose.model('Site', new mongoose.Schema({
    name: String
}));

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const hetSite = await Site.findOne({ name: 'het' });
        const mainSite = await Site.findOne({ name: 'Main Site' });

        console.log('--- Sites ---');
        if (hetSite) console.log(`Site "het": ${hetSite._id}`);
        else console.log('Site "het" NOT FOUND');

        if (mainSite) console.log(`Site "Main Site": ${mainSite._id}`);
        else console.log('Site "Main Site" NOT FOUND');

        const user = await User.findOne({ username: 'het' });
        if (user) {
            console.log('\n--- User "het" ---');
            console.log(`Assigned Sites: ${user.sites}`);

            if (hetSite && user.sites.includes(hetSite._id)) console.log('User IS in site "het"');
            else console.log('User is NOT in site "het"');

            if (mainSite && user.sites.includes(mainSite._id)) console.log('User IS in site "Main Site"');
            else console.log('User is NOT in site "Main Site"');
        }

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

check();
