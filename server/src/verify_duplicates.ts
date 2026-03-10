
import sequelize from './config/sequelize';
import Site from './models/Site';
import InventoryItem from './models/InventoryItem';

const run = async () => {
    try {
        await sequelize.authenticate();
        console.log('DB Connected.');

        const sites = await Site.findAll({ paranoid: false });
        const counts_map: Record<number, number> = {};

        // Get counts
        for (const s of sites) {
            const count = await InventoryItem.count({ where: { siteId: s.id } });
            counts_map[s.id] = count;
        }

        // Group by Name
        const byName: Record<string, typeof sites> = {};
        for (const s of sites) {
            const name = s.name.trim();
            if (!byName[name]) byName[name] = [];
            byName[name].push(s);
        }

        // Check duplicates
        for (const name in byName) {
            const group = byName[name];
            if (group.length > 1) {
                console.log(`Duplicate found for: "${name}"`);
                const active = group.filter(s => !s.deletedAt);
                console.log(`  Active duplicates: ${active.length}`);

                for (const s of group) {
                    console.log(`    - ID: ${s.id}, Items: ${counts_map[s.id]}, Deleted: ${s.deletedAt ? 'Yes' : 'No'}`);
                }
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
};

run();
