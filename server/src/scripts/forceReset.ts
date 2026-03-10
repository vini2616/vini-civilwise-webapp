import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';

dotenv.config();

const resetPassword = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log('MongoDB Connected');

        // We use 'Vini' to match what I previously told the user.
        const username = 'Vini';
        const passwordPlain = '123456';

        let user = await User.findOne({ username });

        if (!user) {
            console.log('User Vini not found. Creating...');
            user = new User({
                name: 'Vini Admin',
                username: 'Vini',
                email: 'vini@vini.app',
                role: 'Owner',
                permissions: ['full_control'],
                passwordHash: passwordPlain // Set plain text, let pre-save hook hash it
            });
        } else {
            console.log('User Vini found. Updating password...');
            // IMPORTANT: We set the plain text password. 
            // The User model's pre('save') hook will detect 'passwordHash' is modified and hash it.
            user.passwordHash = passwordPlain;
        }

        await user.save();

        console.log('---------------------------------------------------');
        console.log('PASSWORD RESET SUCCESSFUL (Fixed Double Hashing)');
        console.log('Username: Vini');
        console.log('Password: ' + passwordPlain);
        console.log('---------------------------------------------------');

        process.exit();
    } catch (error) {
        console.error('Error resetting password:', error);
        process.exit(1);
    }
};

resetPassword();
