
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

const inspect = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ username: 'het' });
        if (user) {
            console.log(`User: ${user.username}, Sites: ${user.sites.length}`);
            const sites = await Site.find({ _id: { $in: user.sites } });
            sites.forEach(s => console.log(`- ${s.name}`));
        } else {
            console.log('User not found');
        }
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

inspect();
