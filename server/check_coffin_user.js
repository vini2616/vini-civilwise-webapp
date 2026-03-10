const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: String,
    name: String,
    role: String,
    permission: String,
    modulePermissions: Object,
    email: String
}, { strict: false });

const User = mongoose.model('User', userSchema);

async function checkCoffin() {
    try {
        console.log('Connecting to MongoDB...');
        // URI from .env
        const uri = 'mongodb+srv://Vini:lLVPNz5ehvRJGYBK@cluster0.cjkrwz6.mongodb.net/?appName=Cluster0';
        await mongoose.connect(uri);
        console.log('MongoDB Connected');

        const user = await User.findOne({ username: 'coffin' });

        if (user) {
            console.log(`DATA: ${JSON.stringify({
                name: user.name,
                role: user.role,
                permission: user.permission,
                modulePermissions: user.modulePermissions
            })}`);
        } else {
            console.log('User "coffin" not found.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

checkCoffin();
