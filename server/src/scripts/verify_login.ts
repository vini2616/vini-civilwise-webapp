
import sequelize from '../config/sequelize';
import User from '../models/User';
import bcrypt from 'bcryptjs';

const verifyLogin = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        const username = 'coffin';
        const password = '1234';

        const user = await User.findOne({ where: { username } });

        if (!user) {
            console.log(`User '${username}' NOT FOUND.`);
            return;
        }

        console.log(`User '${username}' found.`);
        console.log(`Stored Hash: ${user.passwordHash}`);

        // Manually compare
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        console.log(`Bcrypt Comparison ('${password}' vs Hash): ${isMatch}`);

        // Check model method if exists
        if (user.matchPassword) {
            const isMatchModel = await user.matchPassword(password);
            console.log(`Model.matchPassword('${password}'): ${isMatchModel}`);
        } else {
            console.log("Model.matchPassword method not found on instance.");
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await sequelize.close();
    }
};

verifyLogin();
