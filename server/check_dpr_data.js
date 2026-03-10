const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

const DPRSchema = new mongoose.Schema({
    siteId: mongoose.Schema.Types.ObjectId,
    projectInfo: Object,
    manpower: Array,
    workStarted: Array,
    equipment: Array,
    materials: Array,
    work: Array,
    reconciliation: Array,
    remarks: Object,
    signatures: Object
}, { strict: false });

const DPR = mongoose.model('DPR', DPRSchema);

const checkData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const dprs = await DPR.find().sort({ createdAt: -1 }).limit(5);

        const output = dprs.map((dpr, i) => ({
            id: dpr._id,
            date: dpr.projectInfo?.date,
            dprNo: dpr.projectInfo?.dprNo,
            manpowerKeys: dpr.manpower ? Object.keys(dpr.manpower) : 'MISSING',
            manpowerLength: dpr.manpower?.length,
            materialsLength: dpr.materials?.length,
            allKeys: Object.keys(dpr.toObject())
        }));

        fs.writeFileSync('dpr_dump.json', JSON.stringify(output, null, 2));
        console.log("Dump saved to dpr_dump.json");

        mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
};

checkData();
