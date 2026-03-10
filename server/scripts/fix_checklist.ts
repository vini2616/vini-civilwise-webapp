import sequelize from '../src/config/sequelize';

async function fixChecklists() {
    try {
        await sequelize.authenticate();
        console.log("Connected");

        const [results, metadata] = await sequelize.query("SELECT id, items FROM checklists");

        for (const row of results as any[]) {
            let isValid = true;
            if (typeof row.items === 'string') {
                try {
                    JSON.parse(row.items);
                } catch (e: any) {
                    isValid = false;
                    console.error(`ID ${row.id}: Invalid JSON in items: ${e.message}`);
                    console.error(`Value: ${row.items}`);
                }
            }

            if (!isValid) {
                console.log(`Fixing Checklist ${row.id}... setting items to []`);
                await sequelize.query(`UPDATE checklists SET items = '[]' WHERE id = ${row.id}`);
                console.log("Fixed.");
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

fixChecklists();
