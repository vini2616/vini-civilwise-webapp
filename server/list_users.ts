
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './src/config/db';
import User from './src/models/User';

dotenv.config();

const listUsers = async () => {
    await connectDB();

    try {
        const users = await User.find({});
        console.log(`Found ${users.length} users.`);
        users.forEach(u => {
            console.log(` - Username: ${u.username}, Email: ${u.email}, Role: ${u.role}, ID: ${u._id}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

listUsers();
