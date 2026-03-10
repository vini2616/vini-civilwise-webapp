import cron from 'node-cron';
import Site from '../models/Site';
import Company from '../models/Company';
import Transaction from '../models/Transaction';
import SiteSettings from '../models/SiteSettings';
import Report from '../models/Report';
import ProjectTask from '../models/ProjectTask';
import Message from '../models/Message';
import Material from '../models/Material';
import ManpowerPayment from '../models/ManpowerPayment';
import ManpowerAttendance from '../models/ManpowerAttendance';
import Manpower from '../models/Manpower';
import InventoryItem from '../models/InventoryItem';
import Estimation from '../models/Estimation';
import DPR from '../models/DPR';
import Document from '../models/Document';
import CustomShape from '../models/CustomShape';
import Contact from '../models/Contact';
import Checklist from '../models/Checklist';
import Bill from '../models/Bill';
import Attendance from '../models/Attendance';
import User from '../models/User';

const siteModels = [
    Transaction,
    SiteSettings,
    Report,
    ProjectTask,
    Message,
    Material,
    ManpowerPayment,
    ManpowerAttendance,
    Manpower,
    InventoryItem,
    Estimation,
    DPR,
    Document,
    CustomShape,
    Contact,
    Checklist,
    Bill,
    Attendance
];

export const startCleanupJob = () => {
    // Run every day at midnight
    cron.schedule('0 0 * * *', async () => {
        console.log('Running Cleanup Job...');
        const now = new Date();

        try {
            // Find Sites to delete
            const sitesToDelete = await Site.find({ permanentDeleteAt: { $lt: now } });

            for (const site of sitesToDelete) {
                console.log(`Permanently deleting site: ${site.name} (${site._id})`);
                const siteId = site._id;

                // Delete all related data
                for (const model of siteModels) {
                    await (model as any).deleteMany({ siteId });
                }

                // Delete the Site itself
                await Site.deleteOne({ _id: siteId });
            }

            // Find Companies to delete
            const companiesToDelete = await Company.find({ permanentDeleteAt: { $lt: now } });

            for (const company of companiesToDelete) {
                console.log(`Permanently deleting company: ${company.name} (${company._id})`);
                const companyId = company._id;

                // Delete remaining sites (if any were not caught by site logic, though they should have been marked deleted too if logic is sound)
                // But if company deletion marks sites as deleted, they will be picked up by site logic above.
                // However, let's be safe and clean up any lingering sites for this company.
                const sites = await Site.find({ companyId });
                for (const site of sites) {
                    const siteId = site._id;
                    for (const model of siteModels) {
                        await (model as any).deleteMany({ siteId });
                    }
                    await Site.deleteOne({ _id: siteId });
                }

                // Delete Employees
                await (User as any).deleteMany({ companyId });

                // Delete the Company itself
                await Company.deleteOne({ _id: companyId });
            }

            console.log('Cleanup Job Completed.');
        } catch (error) {
            console.error('Error in Cleanup Job:', error);
        }
    });

    console.log('Cleanup Job Scheduled.');
};
