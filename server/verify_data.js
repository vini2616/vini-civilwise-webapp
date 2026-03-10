const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${mongoose.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const UserSchema = new mongoose.Schema({
    name: String,
    username: String,
    sites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Site' }],
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' }
});

const SiteSchema = new mongoose.Schema({
    name: String,
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' }
});

const User = mongoose.model('User', UserSchema);
const Site = mongoose.model('Site', SiteSchema);

const verifyData = async () => {
    await connectDB();

    console.log('\n--- SITES ---');
    const sites = await Site.find({});
    sites.forEach(s => console.log(`ID: ${s._id}, Name: ${s.name}, Company: ${s.companyId}`));

    console.log('\n--- USERS ---');
    const users = await User.find({});
    users.forEach(u => {
        console.log(`ID: ${u._id}, Name: ${u.name}, Username: ${u.username}`);
        console.log(`   Company: ${u.companyId}`);
        console.log(`   Sites: ${u.sites.join(', ')}`);
    });

    process.exit();
};

verifyData();
