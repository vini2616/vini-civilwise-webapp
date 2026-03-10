const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${mongoose.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const SiteSchema = new mongoose.Schema({
    name: String,
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' }
});

const Site = mongoose.model('Site', SiteSchema);

const renameDuplicates = async () => {
    await connectDB();

    const sites = await Site.find({});
    const nameCounts = {};

    // Count occurrences
    sites.forEach(s => {
        nameCounts[s.name] = (nameCounts[s.name] || 0) + 1;
    });

    // Identify duplicates
    const duplicates = Object.keys(nameCounts).filter(name => nameCounts[name] > 1);

    if (duplicates.length === 0) {
        console.log('No duplicate sites found.');
        process.exit();
    }

    console.log(`Found duplicates for: ${duplicates.join(', ')}`);

    for (const name of duplicates) {
        const sameNameSites = sites.filter(s => s.name === name);
        console.log(`Renaming ${sameNameSites.length} sites named "${name}"...`);

        for (let i = 0; i < sameNameSites.length; i++) {
            const site = sameNameSites[i];
            // Keep the first one as is, rename others? Or rename all to be safe?
            // Let's rename all to "Name (1)", "Name (2)" etc to be clear.
            // Actually, let's keep one "original" if possible? 
            // No, let's rename duplicates starting from index 1.
            if (i > 0) {
                site.name = `${name} (${i})`;
                await site.save();
                console.log(`Renamed site ${site._id} to "${site.name}"`);
            }
        }
    }

    console.log('Renaming complete.');
    process.exit();
};

renameDuplicates();
