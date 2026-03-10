const mongoose = require('mongoose');
const User = require('./src/models/User'); // Adjust path if needed
const Site = require('./src/models/Site');

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/vini_app', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error(err));

async function checkUsers() {
    try {
        // Find all users who are NOT Owners
        const users = await User.find({ role: { $ne: 'Owner' } });

        console.log(`Found ${users.length} non-owner users.`);

        for (const user of users) {
            console.log('---------------------------------------------------');
            console.log(`User: ${user.name} (${user.username})`);
            console.log(`Role: ${user.role}`);
            console.log(`Permission: ${user.permission}`);
            console.log(`Assigned Sites (Count: ${user.sites ? user.sites.length : 0}):`, user.sites);

            // Check if they have access to sites they shouldn't
            if (user.sites && user.sites.length > 0) {
                const sites = await Site.find({ _id: { $in: user.sites } });
                console.log('Site Details:', sites.map(s => `${s.name} (${s._id})`));
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        mongoose.disconnect();
    }
}

checkUsers();
