
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const exploreDB = async () => {
    // Connect to the 'admin' database to list all dbs
    // We need to modify the URI to remove the db name for the initial connection or just use the admin db
    const uri = process.env.MONGO_URI || '';

    // Create a connection without a specific DB to list all DBs
    // Extract base URI
    const baseUri = uri.split('?')[0].substring(0, uri.lastIndexOf('/'));
    const options = uri.split('?')[1];
    const adminUri = `${baseUri}/admin?${options}`;

    console.log('Connecting to inspect databases...');

    try {
        const conn = await mongoose.connect(uri);
        console.log('Connected to specified DB.');

        // Get the admin interface
        if (!conn.connection.db) {
            throw new Error('Database connection not established');
        }
        const admin = conn.connection.db.admin();

        // List all databases
        const result = await admin.listDatabases();
        console.log('--- Available Azure Databases ---');
        result.databases.forEach((db: any) => {
            console.log(` - ${db.name} (Size: ${db.sizeOnDisk} bytes)`);
        });
        console.log('---------------------------------');

        // List collections in current DB
        const collections = await conn.connection.db.listCollections().toArray();
        console.log(`\nCollections in '${conn.connection.db.databaseName}':`);
        collections.forEach((c: any) => {
            console.log(` - ${c.name}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

exploreDB();
