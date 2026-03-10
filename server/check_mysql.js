const { Sequelize } = require('sequelize');
require('dotenv').config();

const ports = [3306, 3307, 3308];

async function checkPort(port) {
    console.log(`Testing connection on port ${port}...`);
    const sequelize = new Sequelize('', process.env.DB_USER || 'root', process.env.DB_PASS || '', {
        host: process.env.DB_HOST || '127.0.0.1',
        port: port,
        dialect: 'mysql',
        logging: false
    });

    try {
        await sequelize.authenticate();
        console.log(`SUCCESS! Connected to MySQL on port ${port}`);
        return port;
    } catch (error) {
        console.log(`Failed on port ${port}: ${error.code || error.message}`);
        return null;
    }
}

async function scan() {
    for (const port of ports) {
        const result = await checkPort(port);
        if (result) {
            console.log(`\n___FOUND ACTIVE MYSQL PORT: ${result}___\n`);
            return;
        }
    }
    console.error('\nFAIL: Could not connect to MySQL on any common port (3306, 3307, 3308).');
}

scan();
