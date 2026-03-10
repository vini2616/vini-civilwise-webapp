
import sequelize from './config/sequelize';
import Site from './models/Site';
import DPR from './models/DPR';

const run = async () => {
    try {
        await sequelize.authenticate();
        console.log('DB Connected.');

        const allSites = await Site.findAll({ paranoid: false });
        for (const s of allSites) {
            const count = await DPR.count({ where: { siteId: s.id } });
            if (s.name.includes("Abode") || count > 0) {
                console.log(`[SITE] "${s.name}" (ID:${s.id}) DPRs:${count}`);
            }
        }

        const dpr5 = await DPR.findByPk(5);
        if (dpr5) console.log(`[DPR#5] belongs to Site:${dpr5.siteId}`);
        else console.log(`[DPR#5] Not Found`);

    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
};

run();
