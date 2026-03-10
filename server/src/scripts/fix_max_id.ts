
import sequelize from '../config/sequelize';

const fixMaxId = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // 1. Delete the bad rows that are causing the blockage (the ones at the ID limit)
        // We delete anything above 2 billion. Assuming user doesn't have 2 billion legitimate records.
        await sequelize.query("DELETE FROM materials WHERE id >= 2147483647");
        console.log("Deleted rows with MAX ID.");

        // 2. Get the NEXT legitimate max ID
        const [results] = await sequelize.query("SELECT MAX(id) as maxId FROM materials");
        const maxId = (results[0] as any).maxId || 0;
        console.log("New Max ID:", maxId);

        // 3. Reset Auto Increment safely
        const nextId = maxId + 1;
        await sequelize.query(`ALTER TABLE materials AUTO_INCREMENT = ${nextId}`);
        console.log(`Auto Increment Set to ${nextId}`);

    } catch (error) {
        console.error("Error fixing max ID:", error);
    } finally {
        await sequelize.close();
    }
};

fixMaxId();
