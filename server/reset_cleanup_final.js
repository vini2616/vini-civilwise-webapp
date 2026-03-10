const { Sequelize, DataTypes } = require('sequelize');
const dotenv = require('dotenv');
dotenv.config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        logging: false
    }
);

const resetData = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB.');

        // 1. Find Vini
        const [users] = await sequelize.query("SELECT * FROM users WHERE username = 'vini' OR email = 'vini' OR username LIKE 'vini%' LIMIT 1");
        let viniUser = users[0];

        if (!viniUser) {
            console.log('Vini user not found! Searching for any admin...');
            const [admins] = await sequelize.query("SELECT * FROM users WHERE role = 'Owner' LIMIT 1");
            viniUser = admins[0];
            if (!viniUser) {
                console.error('No user found to preserve. Aborting.');
                process.exit(1);
            }
            console.log(`Preserving user: ${viniUser.username} (${viniUser.id})`);
        } else {
            console.log(`Preserving Vini: ${viniUser.username} (${viniUser.id})`);
        }

        // 2. Disable FK
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

        // 3. Get all tables
        const [tables] = await sequelize.query('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0]);

        // 4. Truncate all except Users
        for (const table of tableNames) {
            if (table === 'users') continue;
            // Sequelize migrations table should be kept?
            if (table === 'SequelizeMeta') continue;

            console.log(`Truncating ${table}...`);
            await sequelize.query(`TRUNCATE TABLE ${table}`);
        }

        // 5. Cleanup Users table
        console.log('Cleaning up Users table...');
        await sequelize.query(`DELETE FROM users WHERE id != ${viniUser.id}`);

        // 6. Reset Vini User State (nullify company, sites, etc)
        // Check columns first to avoid error if they don't exist
        console.log('Resetting Vini state...');
        // We assume standard columns exist. If not, this might fail, but for now we try.
        try {
            await sequelize.query(`UPDATE users SET companyId = NULL, sites = '[]', companies = '[]' WHERE id = ${viniUser.id}`);
        } catch (e) {
            console.log("Could not update some columns (maybe they don't exist), but proceed.");
        }

        // 7. Enable FK
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('Database reset complete. Only Vini remains.');
        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

resetData();
