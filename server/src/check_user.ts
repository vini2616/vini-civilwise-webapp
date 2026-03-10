
import sequelize from './config/sequelize';
import User from './models/User';

const checkUser = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        const users = await User.findAll({ attributes: ['id', 'username', 'email'] });
        console.log("All Users:", JSON.stringify(users, null, 2));

        const coffin = await User.findOne({ where: { username: 'coffin' } });
        if (coffin) {
            console.log("Found user 'coffin':", JSON.stringify(coffin, null, 2));
        } else {
            console.log("User 'coffin' not found.");
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await sequelize.close();
    }
};

checkUser();
