
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Site = mongoose.model('Site', new mongoose.Schema({
    name: String
}));

const findHet = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const sites = await Site.find({ name: /het/i });
        console.log(`Found ${sites.length} sites matching /het/i`);
        sites.forEach(s => console.log(`- Name: "${s.name}", ID: ${s._id}`));
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

findHet();
