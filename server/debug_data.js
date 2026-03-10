const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'src', '.env') });

// Define Schemas (Simplified)
const CompanySchema = new mongoose.Schema({
    name: String,
    ownerId: mongoose.Schema.Types.ObjectId
});
const SiteSchema = new mongoose.Schema({
    name: String,
    companyId: mongoose.Schema.Types.ObjectId
});

const Company = mongoose.model('Company', CompanySchema);
const Site = mongoose.model('Site', SiteSchema);

const run = async () => {
    try {
        await mongoose.connect('mongodb+srv://Vini:lLVPNz5ehvRJGYBK@cluster0.cjkrwz6.mongodb.net/?appName=Cluster0');
        console.log('Connected to DB');

        const companies = await Company.find({});
        console.log('\n--- COMPANIES ---');
        companies.forEach(c => {
            console.log(`ID: ${c._id}, Name: ${c.name}, Owner: ${c.ownerId}`);
        });

        const sites = await Site.find({});
        console.log('\n--- SITES ---');
        sites.forEach(s => {
            console.log(`ID: ${s._id}, Name: ${s.name}, CompanyId: ${s.companyId}`);
        });

        console.log('\n--- ANALYSIS ---');
        companies.forEach(c => {
            const companySites = sites.filter(s => s.companyId && s.companyId.toString() === c._id.toString());
            console.log(`Company: ${c.name} has sites: ${companySites.map(s => s.name).join(', ')}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
