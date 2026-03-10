import sequelize from '../src/config/sequelize';

async function forceFixFF() {
    try {
        await sequelize.authenticate();
        console.log("Connected");

        // Find ID of checklist "FF"
        const [results, _] = await sequelize.query("SELECT id FROM checklists WHERE name LIKE '%FF%'");
        const rows = results as any[];

        if (rows.length > 0) {
            for (const row of rows) {
                console.log(`Resetting items for Checklist ID ${row.id} ('FF')...`);
                await sequelize.query(`UPDATE checklists SET items = '[]' WHERE id = ${row.id}`);
                console.log("Reset complete.");
            }
        } else {
            console.log("Checklist 'FF' not found.");
            // Fallback: Reset any checklist with suspiciously short items string?
            // Or just reset ID 2 if it exists
            await sequelize.query(`UPDATE checklists SET items = '[]' WHERE id = 2`);
            console.log("Reset ID 2 just in case.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

forceFixFF();
