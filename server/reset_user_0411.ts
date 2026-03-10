
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './src/config/db';
import User from './src/models/User';

dotenv.config();

const resetUser = async () => {
    await connectDB();

    try {
        const username = 'vini';
        console.log(`Searching for user: ${username}`);
        const user = await User.findOne({ username });

        if (user) {
            console.log('User found. Updating credentials and permissions...');
            user.passwordHash = '0411'; // Set to user's requested password
            user.role = 'Owner';
            user.permission = 'full_control';

            // Ensure permissions map is initialized
            if (!user.modulePermissions) {
                user.modulePermissions = new Map();
            }

            await user.save();
            console.log('Password updated to "0411".');
            console.log('Role set to "Owner" with "full_control".');
        } else {
            console.log('User not found. Creating new admin user...');
            const newUser = await User.create({
                name: 'Vini User',
                username: 'vini',
                email: 'vini@example.com',
                passwordHash: '0411',
                role: 'Owner',
                permission: 'full_control',
                modulePermissions: {}
            });
            console.log('User created with password "0411".');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

resetUser();
