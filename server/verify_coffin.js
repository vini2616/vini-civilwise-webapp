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

const fs = require('fs');

const verifyData = async () => {
    await connectDB();

    let output = '';
    output += '\n--- ALL SITES ---\n';
    const sites = await Site.find({});
    sites.forEach(s => output += `ID: ${s._id}, Name: ${s.name}\n`);

    output += '\n--- USER: coffin ---\n';
    const user = await User.findOne({ username: 'coffin' });
    if (user) {
        output += `User ID: ${user._id}\n`;
        output += 'Sites:\n';
        user.sites.forEach(s => output += `- ${s}\n`);
        output += `Company: ${user.companyId}\n`;
    } else {
        output += 'User coffin not found\n';
    }

    fs.writeFileSync('coffin_data.txt', output);
    console.log('Data written to coffin_data.txt');
    process.exit();
};

verifyData();
