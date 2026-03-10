
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Site = mongoose.model('Site', new mongoose.Schema({
    name: String,
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' }
}));

const listSites = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const sites = await Site.find({});
        console.log(`Total Sites: ${sites.length}`);
        sites.forEach(s => console.log(`- ${s.name} (${s._id})`));
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

listSites();
