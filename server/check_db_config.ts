
import sequelize from './src/config/sequelize';

async function checkMaxAllowedPacket() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB.');
        const [results, metadata] = await sequelize.query("SHOW VARIABLES LIKE 'max_allowed_packet'");
        console.log('Max Allowed Packet:', results);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

checkMaxAllowedPacket();
