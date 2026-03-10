import sequelize from '../src/config/sequelize';

async function checkChecklists() {
    try {
        await sequelize.authenticate();
        console.log("Connected");

        // Use raw query to bypass Sequelize model parsing
        const [results, metadata] = await sequelize.query("SELECT id, items FROM checklists");

        console.log("Checklists found:", results.length);

        for (const row of results as any[]) {
            console.log(`ID: ${row.id}`);
            console.log(`Raw Items (First 50 chars):`, typeof row.items, String(row.items).substring(0, 50));

            if (typeof row.items === 'string') {
                try {
                    JSON.parse(row.items);
                    console.log("JSON Parse: OK");
                } catch (e: any) {
                    console.error("JSON Parse Error:", e.message);
                }
            } else {
                console.log("Items is already object/array");
            }
            console.log("---");
        }

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkChecklists();
