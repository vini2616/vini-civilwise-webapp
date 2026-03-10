
import sequelize from '../config/sequelize';
import User from '../models/User';

const enableCoffin = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        const user = await User.findOne({ where: { username: 'coffin' } });
        if (!user) {
            console.log("User 'coffin' not found.");
            return;
        }

        console.log("Current Perms:", user.modulePermissions);

        let perms: any = user.modulePermissions;
        if (typeof perms === 'string') {
            try { perms = JSON.parse(perms); } catch (e) { perms = {}; }
        }
        if (!perms) perms = {};

        // Grant full control to inventory
        perms.inventory = 'full_control';

        user.modulePermissions = perms;
        // Depending on Sequelize setup, we might need to explicitly set changed
        user.changed('modulePermissions', true);

        await user.save();
        console.log("Updated Perms:", user.modulePermissions);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await sequelize.close();
    }
};

enableCoffin();
