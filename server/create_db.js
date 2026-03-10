const { Sequelize } = require('sequelize');
require('dotenv').config();

async function setup() {
    // 1. Connect to Server (no DB)
    console.log('Connecting to MySQL server...');
    const sequelizeRoot = new Sequelize('', process.env.DB_USER || 'root', process.env.DB_PASS || '', {
        host: process.env.DB_HOST || '127.0.0.1',
        port: 3306,
        dialect: 'mysql',
        logging: false
    });

    try {
        await sequelizeRoot.authenticate();
        console.log('Connected to MySQL server.');

        // 2. Create Database
        console.log('Creating database "vini_db"...');
        await sequelizeRoot.query('CREATE DATABASE IF NOT EXISTS vini_db;');
        console.log('Database created (or already exists).');

        await sequelizeRoot.close();
    } catch (error) {
        console.error('Failed to connect or create DB:', error);
        process.exit(1);
    }
}

setup();
