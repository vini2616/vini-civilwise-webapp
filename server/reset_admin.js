
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const run = async () => {
    try {
        const uri = 'mongodb+srv://Vini:lLVPNz5ehvRJGYBK@cluster0.cjkrwz6.mongodb.net/?appName=Cluster0';
        await mongoose.connect(uri);
        console.log('MongoDB Connected');

        const db = mongoose.connection.db;

        // Find Admin
        const admin = await db.collection('users').findOne({ role: { $in: ['Owner', 'Admin'] } });

        if (!admin) {
            console.log('No Admin Found');
            return;
        }

        console.log(`Found Admin: ${admin.username}`);

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('1234', salt);

        // Update
        await db.collection('users').updateOne(
            { _id: admin._id },
            { $set: { passwordHash: hash } }
        );

        console.log('Password reset to 1234');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

run();
