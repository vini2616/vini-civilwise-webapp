import sequelize from './src/config/sequelize';
import User from './src/models/User';
import Company from './src/models/Company';
import Site from './src/models/Site';
import Transaction from './src/models/Transaction';
import Material from './src/models/Material';
import InventoryItem from './src/models/InventoryItem';

async function reset() {
    try {
        await sequelize.authenticate();
        console.log('Connected.');

        console.log('Forcing Sync (Drop & Recreate)...');
        await sequelize.sync({ force: true });
        console.log('Database Reset Complete.');

        process.exit(0);
    } catch (error) {
        console.error('Reset Failed:', error);
        process.exit(1);
    }
}

reset();
