import { Request, Response } from 'express';
import Site from '../models/Site';
import { getAccessibleSiteIds } from '../utils/accessControl';
import { exportSiteData, restoreData } from '../services/archiveService';
import multer from 'multer';

const upload = multer();

export const getSites = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const user = req.user;
        const { companyId } = req.query;

        let query: any = { deletedAt: null }; // Only fetch non-deleted sites

        // Get all accessible sites for this user
        const accessibleSiteIds = await getAccessibleSiteIds(user);

        if (accessibleSiteIds.length === 0) {
            res.json([]);
            return;
        }

        query._id = { $in: accessibleSiteIds };

        // If companyId was specifically requested, filter by it as well
        if (companyId) {
            query.companyId = companyId;
        }

        const sites = await Site.find(query);
        res.json(sites);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const createSite = async (req: Request, res: Response) => {
    try {
        const { name, address, companyId, status } = req.body;
        const site = new Site({
            name,
            address,
            companyId,
            status
        });
        const createdSite = await site.save();
        res.status(201).json(createdSite);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export const updateSite = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, address, status } = req.body;
        // @ts-ignore
        const user = req.user;

        // Check permissions
        if (user.role !== 'Owner' && user.role !== 'Admin' && user.role !== 'Partner' && user.permission !== 'full_control') {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }

        const site = await Site.findById(id);

        if (site) {
            site.name = name || site.name;
            site.address = address || site.address;
            site.status = status || site.status;

            const updatedSite = await site.save();
            res.json(updatedSite);
        } else {
            res.status(404).json({ message: 'Site not found' });
        }
    } catch (error) {
        console.error("Error in updateSite:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const deleteSite = async (req: Request, res: Response) => {
    try {
        const site = await Site.findById(req.params.id);

        if (site) {
            // @ts-ignore
            const user = req.user;
            // Check permissions: Owner, Admin, Partner, or Full Control
            if (user.role === 'Owner' || user.role === 'Admin' || user.role === 'Partner' || user.permission === 'full_control') {

                // Generate ZIP before modifying
                const archive = await exportSiteData(site._id.toString()); // @ts-ignore

                // Soft Delete
                site.deletedAt = new Date();
                site.permanentDeleteAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days
                await site.save();
                console.log(`[Soft Delete] Site ${site.name} (${site._id}) deletedAt set to ${site.deletedAt}`);


                // Send Zip
                res.attachment(`${site.name}_backup.zip`);
                archive.pipe(res);
                archive.finalize();

            } else {
                res.status(401).json({ message: 'Not authorized' });
            }
        } else {
            res.status(404).json({ message: 'Site not found' });
        }
    } catch (error) {
        console.error("Error in deleteSite:", error);
        if (!res.headersSent) res.status(500).json({ message: 'Server Error' });
    }
};

export const restoreSite = [
    upload.single('backup'),
    async (req: Request, res: Response) => {
        try {
            if (!req.file) {
                // @ts-ignore
                return res.status(400).json({ message: 'No file uploaded' });
            }

            const results = await restoreData(req.file.buffer);
            res.json({ message: 'Restore successful', results });
        } catch (error: any) {
            console.error("Restore Error:", error);
            res.status(500).json({ message: 'Restore failed', error: error.message });
        }
    }
];

export const getDeletedSites = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const user = req.user;
        const { companyId } = req.query;

        // Check permissions
        if (user.role !== 'Owner' && user.role !== 'Admin' && user.permission !== 'full_control') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        let query: any = { deletedAt: { $ne: null } };

        if (companyId) {
            query.companyId = companyId;
        }

        console.log(`[getDeletedSites] User: ${user._id}, Role: ${user.role}, Query:`, JSON.stringify(query));

        const sites = await Site.find(query);
        console.log(`[getDeletedSites] Found ${sites.length} sites`);
        res.json(sites);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const restoreSiteFromTrash = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // @ts-ignore
        const user = req.user;

        // Permission check
        if (user.role !== 'Owner' && user.role !== 'Admin' && user.permission !== 'full_control') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const site = await Site.findById(id);
        if (!site) {
            return res.status(404).json({ message: 'Site not found' });
        }

        site.deletedAt = undefined;
        site.permanentDeleteAt = undefined;
        await site.save();

        res.json({ message: 'Site restored successfully', site });

    } catch (error) {
        console.error("Error in restoreSiteFromTrash:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};
