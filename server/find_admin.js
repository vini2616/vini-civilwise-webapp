
const mongoose = require('mongoose');

const run = async () => {
    try {
        const uri = 'mongodb+srv://Vini:lLVPNz5ehvRJGYBK@cluster0.cjkrwz6.mongodb.net/?appName=Cluster0';
        await mongoose.connect(uri);

        const db = mongoose.connection.db;

        const admin = await db.collection('users').findOne({ role: { $in: ['Owner', 'Admin'] } });
        const target = await db.collection('users').findOne({ $or: [{ username: 'coffin' }, { name: 'coffin' }] });

        if (admin) console.log(`ADMIN_ID: ${admin._id}`);
        if (target) console.log(`TARGET_ID: ${target._id}`);

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
};

run();
