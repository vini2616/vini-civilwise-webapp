const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://vinibedi2002:Vini2616@vini.4116q.mongodb.net/vini-app?retryWrites=true&w=majority&appName=Vini';

const run = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const companySchema = new mongoose.Schema({ name: String });
        const Company = mongoose.model('Company', companySchema);

        const siteSchema = new mongoose.Schema({ companyId: mongoose.Schema.Types.ObjectId });
        const Site = mongoose.model('Site', siteSchema);

        // Find demo companies
        const demoCompanies = await Company.find({ name: { $regex: /Test/i } });
        console.log(`Found ${demoCompanies.length} demo companies.`);

        for (const comp of demoCompanies) {
            console.log(`Deleting company: ${comp.name} (${comp._id})`);

            // Delete associated sites
            const sitesResult = await Site.deleteMany({ companyId: comp._id });
            console.log(`  Deleted ${sitesResult.deletedCount} sites.`);

            // Delete company
            await Company.deleteOne({ _id: comp._id });
            console.log(`  Deleted company.`);
        }

        console.log('Cleanup complete.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

run();
