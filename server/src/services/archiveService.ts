import archiver from 'archiver';
import AdmZip from 'adm-zip';
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

// Helper to get all models with siteId
const siteModels = {
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
};

export const exportSiteData = async (siteId: string | number) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const site = await Site.findByPk(siteId, { raw: true });

    if (!site) throw new Error('Site not found');

    archive.append(JSON.stringify(site, null, 2), { name: 'site.json' });

    for (const [name, model] of Object.entries(siteModels)) {
        try {
            // @ts-ignore
            const data = await model.findAll({ where: { siteId }, raw: true });
            archive.append(JSON.stringify(data, null, 2), { name: `${name}.json` });
        } catch (err) {
            console.error(`Error exporting ${name}:`, err);
            // Continue with other models even if one fails
        }
    }

    return archive;
};

export const exportCompanyData = async (companyId: string | number) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const company = await Company.findByPk(companyId, { raw: true });

    if (!company) throw new Error('Company not found');

    archive.append(JSON.stringify(company, null, 2), { name: 'company.json' });

    // Export Sites
    const sites = await Site.findAll({ where: { companyId }, raw: true });
    archive.append(JSON.stringify(sites, null, 2), { name: 'sites.json' });

    // Export Users (Employees)
    const users = await User.findAll({ where: { companyId }, raw: true });
    archive.append(JSON.stringify(users, null, 2), { name: 'users.json' });

    // For each site, export its data into a subfolder
    for (const site of sites) {
        const siteId = site.id;

        for (const [name, model] of Object.entries(siteModels)) {
            try {
                // @ts-ignore
                const data = await model.findAll({ where: { siteId }, raw: true });
                archive.append(JSON.stringify(data, null, 2), { name: `sites/${site.name}_${siteId}/${name}.json` });
            } catch (err) {
                console.error(`Error exporting ${name} for site ${siteId}:`, err);
            }
        }
    }

    return archive;
};

export const restoreData = async (buffer: Buffer) => {
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    console.log("Restore Data Debug: Found entries:", zipEntries.map(e => e.entryName));

    // Check if it's a Company export or Site export
    // Robust check: look for matches instead of strict root path
    const companyEntry = zipEntries.find(entry => entry.entryName.endsWith('company.json'));
    const isCompanyExport = !!companyEntry;

    const results = {
        restoredSites: 0,
        restoredCollections: 0
    };

    if (isCompanyExport && companyEntry) {
        // Restore Company
        console.log("Restoring Company from:", companyEntry.entryName);
        const companyData = JSON.parse(companyEntry.getData().toString('utf8'));
        // Check if exists
        const existing = await Company.findByPk(companyData.id);
        if (!existing) {
            await Company.create(companyData);
        } else {
            // Un-delete if soft-deleted
            if (existing.deletedAt) {
                existing.deletedAt = null;
                existing.permanentDeleteAt = null;
                await existing.save();
            }
        }

        // Restore Users
        const usersEntry = zipEntries.find(entry => entry.entryName.endsWith('users.json'));
        if (usersEntry) {
            const usersData = JSON.parse(usersEntry.getData().toString('utf8'));
            if (Array.isArray(usersData)) {
                for (const user of usersData) {
                    const existing = await User.findByPk(user.id);
                    if (!existing) {
                        try {
                            const sameEmail = await User.findOne({ where: { email: user.email } });
                            if (!sameEmail) await User.create(user);
                        } catch (e) { console.error("Restore User Error:", e); }
                    }
                }
            }
        }

        // Restore Sites and Site Data
        const sitesEntry = zipEntries.find(entry => entry.entryName.endsWith('sites.json'));
        if (sitesEntry) {
            const sitesData = JSON.parse(sitesEntry.getData().toString('utf8'));
            if (Array.isArray(sitesData)) {
                for (const site of sitesData) {
                    const existing = await Site.findByPk(site.id);
                    if (!existing) {
                        await Site.create(site);
                        results.restoredSites++;
                    } else {
                        // Un-delete if soft-deleted
                        if (existing.deletedAt) {
                            existing.deletedAt = null;
                            existing.permanentDeleteAt = null;
                            await existing.save();
                            results.restoredSites++;
                        }
                    }
                }
            }
        }
    } else {
        // Site Export
        console.log("Detected Site Export");
        const siteEntry = zipEntries.find(entry => entry.entryName.endsWith('site.json'));
        if (siteEntry) {
            console.log("Found site.json at:", siteEntry.entryName);
            const siteData = JSON.parse(siteEntry.getData().toString('utf8'));
            const existing = await Site.findByPk(siteData.id || siteData._id);

            if (!existing) {
                await Site.create(siteData);
                results.restoredSites++;
            } else {
                console.log("Site exists:", existing.name, "DeletedAt:", existing.deletedAt);
                // Un-delete if soft-deleted
                if (existing.deletedAt) {
                    existing.deletedAt = null;
                    existing.permanentDeleteAt = null;
                    await existing.save();
                    results.restoredSites++;
                } else {
                    console.log("Site is active, skipping creation.");
                }
            }
        } else {
            console.warn("No site.json found in zip!");
        }
    }

    // Restore Collections
    for (const [name, model] of Object.entries(siteModels)) {
        for (const entry of zipEntries) {
            // Flexible match: ends with /Name.json or is Name.json
            if (entry.entryName.endsWith(`/${name}.json`) || entry.entryName === `${name}.json`) {
                const content = entry.getData().toString('utf8');
                if (!content) continue;

                try {
                    const data = JSON.parse(content);
                    if (Array.isArray(data)) {
                        for (const item of data) {
                            // @ts-ignore
                            const existing = await model.findByPk(item.id);
                            if (!existing) {
                                try {
                                    // @ts-ignore
                                    await model.create(item);
                                    results.restoredCollections++;
                                } catch (err) {
                                    console.error(`Failed to restore ${name} item ${item.id}:`, err);
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error(`Error parsing ${entry.entryName}:`, e);
                }
            }
        }
    }

    return results;
};
