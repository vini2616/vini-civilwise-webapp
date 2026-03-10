const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Schema } = mongoose;

dotenv.config();

// Define schemas inline to avoid import issues
const SiteSchema = new Schema({
    name: String,
    location: String
});
const Site = mongoose.model('Site', SiteSchema);

const InventoryItemSchema = new Schema({
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
    block: String,
    floor: String,
    flatNumber: String,
    status: String
});
const InventoryItem = mongoose.model('InventoryItem', InventoryItemSchema);

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const sites = await Site.find({});
        console.log(`Found ${sites.length} sites.`);

        for (const site of sites) {
            const count = await InventoryItem.countDocuments({ siteId: site._id });
            console.log(`Site: ${site.name} (ID: ${site._id}) - Inventory Items: ${count}`);
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

run();
