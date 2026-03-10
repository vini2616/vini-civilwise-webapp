import mongoose from 'mongoose';
import User from '../models/User';
import connectDB from '../config/db';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env vars from server root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const checkUser = async () => {
    try {
        await connectDB();

        const users = await User.find({});
        let output = `Found ${users.length} users:\n`;
        users.forEach(u => {
            output += `User: ${u.username}\n`;
            output += `  ID: ${u._id}\n`;
            output += `  Role: ${u.role}\n`;
            output += `  CompanyId: ${u.companyId}\n`;
            output += `  Sites: ${u.sites}\n`;
            output += '-------------------\n';
        });

        fs.writeFileSync('users_dump.txt', output);
        console.log("Dumped to users_dump.txt");

        process.exit();
    } catch (error) {
        console.error("Error checking users:", error);
        process.exit(1);
    }
};

checkUser();
