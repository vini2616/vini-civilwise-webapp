const { Sequelize, DataTypes } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const sequelize = new Sequelize(
    process.env.DB_NAME || 'vini_db',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || '',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: console.log
    }
);

const tables = [
    'transactions',
    'bills',
    'inventory_items',
    'manpower_list',
    'manpower_payments',
    'materials',
    'project_tasks',
    'checklists'
];

async function addAuditColumns() {
    try {
        await sequelize.authenticate();
        console.log('Connected to MySQL.');
        const queryInterface = sequelize.getQueryInterface();

        for (const table of tables) {
            try {
                const tableDesc = await queryInterface.describeTable(table);

                if (!tableDesc.enteredBy) {
                    console.log(`Adding enteredBy to ${table}...`);
                    await queryInterface.addColumn(table, 'enteredBy', {
                        type: DataTypes.STRING,
                        allowNull: true
                    });
                } else {
                    console.log(`enteredBy already exists in ${table}.`);
                }

                if (!tableDesc.editedBy) {
                    console.log(`Adding editedBy to ${table}...`);
                    await queryInterface.addColumn(table, 'editedBy', {
                        type: DataTypes.STRING,
                        allowNull: true
                    });
                } else {
                    console.log(`editedBy already exists in ${table}.`);
                }
            } catch (error) {
                console.error(`Error processing table ${table}:`, error.message);
            }
        }
    } catch (e) {
        console.error("Connection failed:", e);
    } finally {
        console.log('Migration complete.');
        process.exit();
    }
}

addAuditColumns();
