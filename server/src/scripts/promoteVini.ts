import mongoose from 'mongoose';
import User from '../models/User';
import connectDB from '../config/db';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from server root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const promoteVini = async () => {
    try {
        await connectDB();
        console.log("Connected to DB...");

        const vini = await User.findOne({ username: 'Vini' }); // Case sensitive? Dump said 'Vini'
        if (vini) {
            vini.permission = 'full_control';
            // Also ensure modulePermissions are full
            vini.modulePermissions = new Map(); // Clear specific restrictions
            await vini.save();
            console.log("Promoted Vini to Super Admin (full_control).");
        } else {
            console.log("User Vini not found.");
            // Try lowercase
            const viniLower = await User.findOne({ username: 'vini' });
            if (viniLower) {
                viniLower.permission = 'full_control';
                await viniLower.save();
                console.log("Promoted vini (lowercase) to Super Admin.");
            }
        }

        process.exit();
    } catch (error) {
        console.error("Error promoting user:", error);
        process.exit(1);
    }
};

promoteVini();
