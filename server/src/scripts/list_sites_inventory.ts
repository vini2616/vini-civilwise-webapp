import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Site from '../models/Site';
import InventoryItem from '../models/InventoryItem';

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log("Connected to DB");

        const sites = await Site.find({});
        console.log(`Found ${sites.length} sites.`);

        for (const site of sites) {
            const count = await InventoryItem.countDocuments({ siteId: site._id as any });
            console.log(`Site: ${site.name} (ID: ${site._id}) - Inventory Items: ${count}`);
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

run();
