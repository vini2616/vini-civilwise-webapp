const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME || 'vini_db',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || '',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: false,
    }
);

async function checkSchema() {
    try {
        await sequelize.authenticate();
        console.log('Connected to MySQL.');

        const [columns] = await sequelize.query("SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'manpower_attendance' AND TABLE_SCHEMA = 'vini_db';");
        console.log('Columns:', JSON.stringify(columns, null, 2));

        const [data] = await sequelize.query("SELECT * FROM manpower_attendance ORDER BY id DESC LIMIT 1;");
        console.log('Latest Row:', JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

checkSchema();
