
import sequelize from '../config/sequelize';
import Material from '../models/Material';

const fixMaterialId = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // 1. Check Max ID
        const [results, metadata] = await sequelize.query("SELECT MAX(id) as maxId FROM materials");
        const maxId = (results[0] as any).maxId;
        console.log("Current Max ID in materials table:", maxId);

        // 2. Check current Auto Increment Status (Optional, tedious in portable SQL, so we just run the fix)

        // 3. Reset Auto Increment
        // This command resets the counter to MAX(id) + 1. 
        // If the counter was mistakenly set to a huge timestamp, this brings it back down.
        await sequelize.query("ALTER TABLE materials AUTO_INCREMENT = 1");
        console.log("Executed: ALTER TABLE materials AUTO_INCREMENT = 1");

        // 4. Verify (Optional) - we can't easily verify without inserting.
        console.log("Auto-increment reset complete.");

        // 5. Check if we have any 'bad' rows (huge IDs)
        if (maxId > 2147483647) {
            console.warn("WARNING: You have rows with IDs larger than standard INTEGER Max (2.14B).");
            console.warn("These rows might be causing the Auto-Inc to stay high.");
            // We could offer to delete them, but for now just warn.
        } else {
            console.log("Max ID is within normal range.");
        }

    } catch (error) {
        console.error("Error fixing material ID:", error);
    } finally {
        await sequelize.close();
    }
};

fixMaterialId();
