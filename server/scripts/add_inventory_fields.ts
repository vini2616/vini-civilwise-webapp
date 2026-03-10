import { Sequelize, DataTypes } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
    process.env.DB_NAME || 'civilwise_db',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: console.log,
    }
);

const addColumn = async (table: string, column: string, type: string) => {
    try {
        await sequelize.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
        console.log(`✅ Added column ${column} to ${table}`);
    } catch (error: any) {
        if (error.original && error.original.code === 'ER_DUP_FIELDNAME') {
            console.log(`ℹ️ Column ${column} already exists in ${table}`);
        } else {
            console.error(`❌ Failed to add column ${column}:`, error.message);
        }
    }
};

const runMigration = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        const table = 'inventory_items';

        await addColumn(table, 'rate', 'FLOAT DEFAULT 0');
        await addColumn(table, 'buyerName', 'VARCHAR(255)');
        await addColumn(table, 'buyerMobile', 'VARCHAR(255)');
        await addColumn(table, 'buyerAddress', 'VARCHAR(255)');
        await addColumn(table, 'totalAmount', 'FLOAT DEFAULT 0');
        await addColumn(table, 'paidAmount', 'FLOAT DEFAULT 0');
        await addColumn(table, 'paymentHistory', 'JSON');
        await addColumn(table, 'extraWork', 'JSON');
        await addColumn(table, 'documents', 'JSON');

        console.log('Migration completed.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

runMigration();
