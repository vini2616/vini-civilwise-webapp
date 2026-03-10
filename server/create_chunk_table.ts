
import sequelize from './src/config/sequelize';
import DocumentChunk from './src/models/DocumentChunk';

async function createChunkTable() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB.');

        console.log('Creating DocumentChunk table...');
        await DocumentChunk.sync({ force: true });
        console.log('DocumentChunk table created successfully.');

    } catch (error) {
        console.error('Error creating table:', error);
    } finally {
        await sequelize.close();
    }
}

createChunkTable();
