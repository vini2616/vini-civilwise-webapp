
import sequelize from '../config/sequelize';

const checkTableStatus = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        const [results] = await sequelize.query("SHOW TABLE STATUS LIKE 'materials'");
        console.log("Table Status:", JSON.stringify(results, null, 2));

        const [rows] = await sequelize.query("SELECT id FROM materials ORDER BY id DESC LIMIT 5");
        console.log("Last 5 IDs:", JSON.stringify(rows, null, 2));

    } catch (error) {
        console.error("Error checking table:", error);
    } finally {
        await sequelize.close();
    }
};

checkTableStatus();
