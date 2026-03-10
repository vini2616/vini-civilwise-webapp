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

        const companySchema = new mongoose.Schema({
            name: String,
            mobile: String,
            ownerId: mongoose.Schema.Types.ObjectId
        });
        const Company = mongoose.model('Company', companySchema);

        const companies = await Company.find({});
        console.log('--- All Companies ---');
        companies.forEach(c => {
            console.log(`ID: ${c._id}, Name: "${c.name}", Mobile: ${c.mobile}`);
        });
        console.log('---------------------');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

run();
