
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
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' }
});
const User = mongoose.model('User', UserSchema);

const CompanySchema = new mongoose.Schema({
    name: String
});
const Company = mongoose.model('Company', CompanySchema);

const fixOrphanedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({ companyId: { $ne: null } });
        console.log(`Found ${users.length} users with companyId.`);

        let fixedCount = 0;
        for (const user of users) {
            const company = await Company.findById(user.companyId);
            if (!company) {
                console.log(`User ${user.username} (${user._id}) has orphaned companyId: ${user.companyId}. Setting to null.`);
                user.companyId = null;
                await user.save();
                fixedCount++;
            }
        }

        console.log(`Fixed ${fixedCount} orphaned users.`);
        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

fixOrphanedUsers();
