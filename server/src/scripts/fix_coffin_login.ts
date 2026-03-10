
import sequelize from '../config/sequelize';
import User from '../models/User';

const fixLogin = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        const coffin = await User.findOne({ where: { username: 'coffin' } });
        if (coffin) {
            console.log("Found user 'coffin'.");

            // ERROR IN PREVIOUS SCRIPT:
            // We previously hashed the password MANUALLY, but the model's beforeSave hook 
            // hashes it AGAIN. This caused double-hashing.

            // FIX: Assign PLAIN TEXT. The beforeSave hook will hash it once.
            coffin.passwordHash = '1234';

            await coffin.save();
            console.log("Password reset to '1234' (letting model handle hashing).");

            // Verify what is stored (should start with $2b$)
            await coffin.reload();
            console.log("Stored Hash:", coffin.passwordHash);

        } else {
            console.log("User 'coffin' not found.");
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await sequelize.close();
    }
};

fixLogin();
