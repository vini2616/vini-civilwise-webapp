
import sequelize from './config/sequelize';
import User from './models/User';
import bcrypt from 'bcryptjs';

const resetPassword = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        const coffin = await User.findOne({ where: { username: 'coffin' } });
        if (coffin) {
            console.log("Found user 'coffin'. Resetting password to '1234'...");
            const salt = await bcrypt.genSalt(10);
            coffin.passwordHash = await bcrypt.hash('1234', salt);
            await coffin.save();
            console.log("Password reset successfully to '1234'.");
        } else {
            console.log("User 'coffin' not found.");
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await sequelize.close();
    }
};

resetPassword();
