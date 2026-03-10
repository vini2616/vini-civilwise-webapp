
import sequelize from '../src/config/sequelize';
import { QueryTypes } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

const checkTable = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        console.log('Checking project_tasks table...');
        const result = await sequelize.query("DESCRIBE project_tasks", { type: QueryTypes.SELECT });
        console.log("Table Structure:", JSON.stringify(result, null, 2));

        const count = await sequelize.query("SELECT COUNT(*) as count FROM project_tasks", { type: QueryTypes.SELECT });
        console.log("Row Count:", count);

    } catch (error) {
        console.error('Unable to connect to the database or query failed:', error);
    } finally {
        await sequelize.close();
    }
};

checkTable();
