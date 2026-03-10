const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Schema } = mongoose;

dotenv.config();

// Schemas
const SiteSchema = new Schema({ name: String });
const Site = mongoose.model('Site', SiteSchema);

const InventoryItemSchema = new Schema({
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
    block: String,
    floor: String,
    flatNumber: String,
    type: { type: String, default: 'Residential' },
    area: { type: Number, default: 1200 },
    status: { type: String, default: 'Available' }, // Available, Booked, Sold
    cost: { type: Number, default: 5000000 },
    notes: String
});
const InventoryItem = mongoose.model('InventoryItem', InventoryItemSchema);

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const site = await Site.findOne();
        if (!site) {
            console.log("No site found. Creating 'Test Site'...");
            const newSite = await Site.create({ name: 'Test Site', location: 'Test Location' });
            await createInventory(newSite._id);
        } else {
            console.log(`Seeding inventory for site: ${site.name}`);
            await createInventory(site._id);
        }

        console.log("Seeding complete.");
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

const createInventory = async (siteId) => {
    // Clear existing
    await InventoryItem.deleteMany({ siteId });

    const towers = ['A', 'B'];
    const floors = ['1', '2', '3'];
    const flatsPerFloor = 4;

    const items = [];

    for (const block of towers) {
        for (const floor of floors) {
            for (let i = 1; i <= flatsPerFloor; i++) {
                const flatNum = `${block}-${floor}0${i}`;
                items.push({
                    siteId,
                    block,
                    floor,
                    flatNumber: flatNum,
                    status: Math.random() > 0.7 ? 'Sold' : (Math.random() > 0.5 ? 'Booked' : 'Available'),
                    area: 1000 + (Math.random() * 500),
                    cost: 5000000 + (Math.random() * 1000000)
                });
            }
        }
    }

    await InventoryItem.insertMany(items);
    console.log(`Created ${items.length} inventory items.`);
};

seed();
