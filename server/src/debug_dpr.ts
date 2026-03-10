
import sequelize from './config/sequelize';
import Site from './models/Site';
import DPR from './models/DPR';

const run = async () => {
    try {
        await sequelize.authenticate();
        console.log('DB Connected.');

        const sites = await Site.findAll({ paranoid: false });
        console.log(`Found ${sites.length} total sites.`);

        for (const s of sites) {
            const count = await DPR.count({ where: { siteId: s.id } });
            if (count > 0) {
                console.log(`Site: "${s.name}" (ID: ${s.id}) - DPR Count: ${count}`);
                const latest = await DPR.findOne({ where: { siteId: s.id }, order: [['createdAt', 'DESC']] });
                console.log(`  Latest DPR: ID ${latest?.id}`);
                console.log(`  Info JSON: ${JSON.stringify(latest?.projectInfo)}`);
            } else {
                // console.log(`Site: "${s.name}" (ID: ${s.id}) - No DPRs`);
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
};

run();
