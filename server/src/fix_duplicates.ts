
import sequelize from './config/sequelize';
import Site from './models/Site';
import InventoryItem from './models/InventoryItem';

const run = async () => {
    try {
        await sequelize.authenticate();
        console.log("DB Connected");
        const sites = await Site.findAll(); // ACTIVE sites only

        // Group by Name
        const byName: Record<string, typeof sites> = {};
        for (const s of sites) {
            const name = s.name.trim();
            if (!byName[name]) byName[name] = [];
            byName[name].push(s);
        }

        for (const name in byName) {
            const group = byName[name];
            if (group.length > 1) {
                console.log(`Checking duplicate: ${name}`);
                // Get counts
                const counts = [];
                for (const s of group) {
                    const count = await InventoryItem.count({ where: { siteId: s.id } });
                    counts.push({ site: s, count });
                }

                // Sorting: Keep the one with MOST items, rename others with 0 items
                counts.sort((a, b) => b.count - a.count);

                const losers = counts.slice(1);

                for (const loser of losers) {
                    if (loser.count === 0) {
                        const newName = `${name} (Duplicate ${loser.site.id})`;
                        console.log(`Renaming Site ${loser.site.id} to "${newName}"`);
                        loser.site.name = newName;
                        await loser.site.save();
                    } else {
                        console.log(`Skipping Site ${loser.site.id} (Has ${loser.count} items)`);
                    }
                }
            }
        }
        console.log("Done.");

    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
};

run();
