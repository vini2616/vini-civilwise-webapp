
import sequelize from './config/sequelize';
import Site from './models/Site';
import InventoryItem from './models/InventoryItem';

const run = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        const inventory = await InventoryItem.findAll();
        console.log(`Total Inventory Items in DB: ${inventory.length}`);

        const bySite: any = {};
        inventory.forEach(i => {
            const sid = i.siteId;
            if (!bySite[sid]) bySite[sid] = 0;
            bySite[sid]++;
        });

        console.log('Inventory by Site ID:', bySite);

        const sites = await Site.findAll({ paranoid: false }); // Fetch soft deleted too
        sites.forEach(s => {
            console.log(`Site: ${s.name} (ID: ${s.id}, Company: ${s.companyId}, Deleted: ${s.deletedAt})`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
};

run();
