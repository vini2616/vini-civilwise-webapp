
import { Sequelize } from 'sequelize';
import sequelize, { connectDB } from '../config/sequelize';
import User from '../models/User';
import bcrypt from 'bcryptjs';

const updatePassword = async () => {
    try {
        await connectDB();
        console.log('Connected to DB...');

        const user = await User.findOne({ where: { username: 'vini' } });

        if (!user) {
            console.error('User vini not found!');
            process.exit(1);
        }

        console.log('User vini found. Updating password...');

        // Directly set the passwordHash field with the new plain text password.
        // The BeforeSave hook in User.ts will hash it.
        user.passwordHash = 'Always@07';

        await user.save();

        console.log('Password updated successfully for user vini.');
        process.exit(0);

    } catch (error) {
        console.error('Error updating password:', error);
        process.exit(1);
    }
};

updatePassword();
