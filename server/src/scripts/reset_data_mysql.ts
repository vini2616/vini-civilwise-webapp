import { Sequelize, Op } from 'sequelize';
import sequelize, { connectDB } from '../config/sequelize';
import * as models from '../models';

const resetDatabase = async () => {
    try {
        await connectDB();
        console.log('Connected to DB...');

        // Disable FK checks to allow truncation
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { raw: true });

        // Iterate over all models exported
        for (const modelName in models) {
            if (modelName === 'default') continue;
            const Model = (models as any)[modelName];

            // Check if it's a Sequelize Model
            if (!Model || !Model.destroy) continue;

            if (modelName === 'User') {
                console.log(`Cleaning User table (keeping 'vini')...`);
                // Delete all users except 'vini'
                await Model.destroy({
                    where: {
                        username: { [Op.ne]: 'vini' }
                    },
                    force: true
                });
            } else {
                console.log(`Truncating ${modelName}...`);
                try {
                    await Model.destroy({ where: {}, truncate: true, force: true });
                } catch (e) {
                    console.log(`Truncate failed for ${modelName}, trying delete...`);
                    await Model.destroy({ where: {}, force: true });
                }
            }
        }

        // Re-enable FK checks
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { raw: true });

        // Verify or Create Vini
        const User = models.User;
        let vini = await User.findOne({ where: { username: 'vini' } });

        if (!vini) {
            console.log("User 'vini' not found. Creating...");
            // Create fresh
            await User.create({
                name: 'Vini Super Admin',
                username: 'vini',
                email: 'vini@civilwise.com',
                passwordHash: '123456', // Will be hashed by hook
                role: 'Owner',
                permissions: ['full_control'],
                permission: 'full_control',
                mobile: '0000000000',
                salary: 0,
                companies: [],
                sites: [],
                modulePermissions: {}
            });
        } else {
            console.log("User 'vini' exists. Cleaning associations and resetting password...");
            // Reset associations
            vini.companies = [];
            vini.sites = [];
            vini.companyId = null;
            vini.passwordHash = '123456'; // Update password
            await vini.save();
        }

        console.log("Database reset complete. Only 'vini' remains.");
        process.exit(0);

    } catch (error) {
        console.error("Reset failed:", error);
        process.exit(1);
    }
};

resetDatabase();
