
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

const fix = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const abode = await Site.findOne({ name: /abode/i });
        if (!abode) {
            console.log('Abode site not found');
            process.exit(1);
        }

        const user = await User.findOne({ username: 'het' });
        if (!user) {
            console.log('User het not found');
            process.exit(1);
        }

        console.log(`User currently has sites: ${user.sites}`);

        user.sites = [abode._id];
        await user.save();

        console.log(`User 'het' moved to 'abode' (${abode._id}) ONLY.`);

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

fix();
