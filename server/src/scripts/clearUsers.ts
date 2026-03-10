import mongoose from 'mongoose';
import User from '../models/User';
import connectDB from '../config/db';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from server root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const clearUsers = async () => {
    try {
        await connectDB();
        console.log("Connected to DB...");

        // Delete all users who are NOT 'Owner'
        // This preserves the main account (assuming it's an Owner)
        const result = await User.deleteMany({ role: { $ne: 'Owner' } });

        console.log(`Deleted ${result.deletedCount} users.`);
        console.log("Remaining Users:");
        const remaining = await User.find({});
        remaining.forEach(u => console.log(`- ${u.username} (${u.role})`));

        process.exit();
    } catch (error) {
        console.error("Error clearing users:", error);
        process.exit(1);
    }
};

clearUsers();
