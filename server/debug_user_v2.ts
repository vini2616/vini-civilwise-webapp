
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './src/config/db';
import User from './src/models/User';

dotenv.config();

const fixUser = async () => {
    await connectDB();

    try {
        const username = 'vini';
        const password = 'vini'; // User seems to be trying 4 chars in screenshot, likely 'vini'
        // But let's set it to '123456' to be safe and standard, or 'vini' if they prefer.
        // Actually, the user typed 4 dots in the screenshot. 'vini' is 4 chars.

        console.log(`Checking for user: ${username}`);
        const user = await User.findOne({ username });

        if (user) {
            console.log('User found. Resetting password to "123456"...');
            user.passwordHash = '123456';
            await user.save();
            console.log('Password reset successfully.');
            console.log('User details:', {
                username: user.username,
                email: user.email,
                role: user.role
            });
        } else {
            console.log('User not found. Creating new user...');
            const newUser = await User.create({
                name: 'Vini User',
                username: 'vini',
                email: 'vini@example.com',
                passwordHash: '123456',
                role: 'Owner'
            });
            console.log('User created successfully.');
            console.log('User details:', {
                username: newUser.username,
                email: newUser.email,
                role: newUser.role
            });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

fixUser();
