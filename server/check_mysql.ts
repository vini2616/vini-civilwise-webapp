import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from .env file in current directory
const result = dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log('Dotenv parsed:', result.parsed);

const sequelize = new Sequelize(
    process.env.DB_NAME || 'vini_db',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || '',
    {
        host: process.env.DB_HOST || '127.0.0.1',
        dialect: 'mysql',
        logging: console.log
    }
);

async function check() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1);
    }
}

check();
