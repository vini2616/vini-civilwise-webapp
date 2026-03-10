import User from '../models/User';
import sequelize from '../config/sequelize';

async function setupSuperAdmin() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // 1. Find or Create vini
        const [user, created] = await User.findOrCreate({
            where: { username: 'vini' },
            defaults: {
                name: 'Vini Super Admin',
                email: 'vini@civilwise.in',
                passwordHash: 'Always@07',
                role: 'Super Admin',
                permission: 'full_control',
                mobile: '1234567890'
            }
        });

        if (!created) {
            // Update the existing user 'vini'
            console.log('Updating existing vini user...');
            
            // Note: Since User model uses a beforeSave hook to hash the password if changed,
            // we should directly set the passwordHash property string.
            user.passwordHash = 'Always@07';
            user.role = 'Super Admin';
            user.permission = 'full_control';
            user.name = 'Vini Super Admin';
            await user.save();
            
            console.log('User vini updated successfully.');
        } else {
            console.log('User vini created successfully.');
        }

    } catch (error) {
        console.error('Error setting up super admin:', error);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

setupSuperAdmin();
