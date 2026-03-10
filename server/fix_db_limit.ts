
import sequelize from './src/config/sequelize';

async function increasePacketSize() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB.');

        console.log('Attemping to set max_allowed_packet to 64MB...');
        await sequelize.query("SET GLOBAL max_allowed_packet = 67108864");
        console.log('Set command executed. Verifying...');

        // Need to reconnect or query global specifically to see change? 
        // Global changes affect NEW connections. This connection might still show old value or updated global value.

        const [results, metadata] = await sequelize.query("SHOW VARIABLES LIKE 'max_allowed_packet'");
        console.log('Current Session/Global variable state:', results);

        const [globalResults] = await sequelize.query("SHOW GLOBAL VARIABLES LIKE 'max_allowed_packet'");
        console.log('Global variable state:', globalResults);

    } catch (error) {
        console.error('Error setting packet size:', error);
    } finally {
        await sequelize.close();
    }
}

increasePacketSize();
