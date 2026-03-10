import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
    process.env.DB_NAME || 'vini_db',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || '',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
        dialect: 'mysql',
        logging: false, // Set to console.log to see SQL queries
        dialectOptions: process.env.NODE_ENV === 'production' ? {
            ssl: {
                require: true,
                rejectUnauthorized: false // Aiven often requires this if not passing the CA cert directly
            }
        } : {},
        pool: {
            max: 5,
            min: 0,
            acquire: 60000,
            idle: 10000,
        }
    }
);

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const connectDB = async (retries = 5, delay = 5000) => {
    while (retries > 0) {
        try {
            await sequelize.authenticate();
            console.log('MySQL Connected via Sequelize');

            // Increase Packet Size for large file uploads (64MB)
            // Note: This requires SUPER privileges. If it fails, we log a warning but continue.
            try {
                await sequelize.query("SET GLOBAL max_allowed_packet = 67108864");
                console.log("Updated MySQL GLOBAL max_allowed_packet to 64MB");
            } catch (err: any) {
                console.warn("Warning: Could not set GLOBAL max_allowed_packet. Uploads >1MB might fail if not configured in my.ini.", err.message);
            }

            // Sync models
            // Changed alter: true -> false to prevent "Too many keys" error during repeated restarts
            await sequelize.sync({ alter: false });
            console.log('MySQL Models Synced');
            return; // Success
        } catch (error: any) {
            console.error(`Unable to connect to the database (Attempts remaining: ${retries - 1}):`, error.message);
            retries -= 1;
            if (retries === 0) {
                console.error('Max retries reached. Exiting...');
                process.exit(1);
            }
            await wait(delay);
        }
    }
};

export default sequelize;
