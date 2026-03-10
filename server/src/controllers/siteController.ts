// @ts-nocheck
import { Request, Response } from 'express';
import Site from '../models/Site';
import { getAccessibleSiteIds } from '../utils/accessControl';
import { Op } from 'sequelize';

import { exportSiteData, restoreData } from '../services/archiveService';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

export const getSites = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { companyId } = req.query;

        // Get all accessible sites for this user
        const accessibleSiteIds = await getAccessibleSiteIds(user);

        if (accessibleSiteIds.length === 0) {
            // For owners with no sites, they should still see an empty list, not error
            res.json([]);
            return;
        }

        const whereClause: any = {
            id: { [Op.in]: accessibleSiteIds }
        };

        // If companyId was specifically requested, filter by it as well
        if (companyId) {
            whereClause.companyId = Number(companyId);
        }

        // Ensure deleted sites are not returned unless specifically asked
        whereClause.deletedAt = null;

        const sites = await Site.findAll({ where: whereClause });
        res.json(sites);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const createSite = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (user.username !== 'vini') {
            return res.status(403).json({ message: 'Only Super Admin Vini can create sites' });
        }
        const { name, address, companyId, status } = req.body;
        const site = await Site.create({
            name,
            address,
            companyId: Number(companyId),
            status: status || 'active'
        });
        res.status(201).json(site);
    } catch (error) {
        console.error("Create Site Error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const updateSite = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, address, status } = req.body;
        const user = req.user;

        // Check permissions
        if (user.role !== 'Owner' && user.role !== 'Admin' && user.role !== 'Partner' && user.permission !== 'full_control') {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }

        const site = await Site.findByPk(id);

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
        const site = await Site.findByPk(req.params.id);

        if (site) {
            const user = (req as any).user;
            // Check permissions
            if (user.username === 'vini') {

                // Generate Archive
                try {
                    const archive = await exportSiteData(site.id);

                    // Soft Delete
                    site.deletedAt = new Date();
                    // 15 days from now
                    const futureDate = new Date();
                    futureDate.setDate(futureDate.getDate() + 15);
                    site.permanentDeleteAt = futureDate;

                    await site.save();
                    console.log(`[Soft Delete] Site ${site.name} (${site.id}) deletedAt set to ${site.deletedAt}`);

                    // Send Zip
                    res.attachment(`site_backup_${site.id}.zip`);
                    archive.pipe(res);
                    await archive.finalize();
                } catch (err) {
                    console.error("Archive generation failed:", err);
                    // If archive fails, we still deleted the site? Or should we block?
                    // If we already saved deleteAt, we can't return JSON error if headers sent.
                    // But we didn't send headers yet if export failed before pipe.

                    if (!res.headersSent) {
                        // Fallback to json success if export failed but delete succeeded?
                        // Or fail entire operation?
                        // Let's assume if export fails, we just return json success with warning
                        if (site.deletedAt) {
                            res.json({ message: 'Site deleted, but backup generation failed.' });
                        } else {
                            res.status(500).json({ message: 'Failed to generate backup, site not deleted.' });
                        }
                    }
                }

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
                return res.status(400).json({ message: 'No backup file uploaded' });
            }
            const results = await restoreData(req.file.buffer);
            res.json({
                message: `Restore completed. Sites: ${results.restoredSites}, Data Items: ${results.restoredCollections}`,
                results
            });
        } catch (error) {
            console.error("Restore Error:", error);
            res.status(500).json({ message: 'Restore failed', error: error.message });
        }
    }
];

export const getDeletedSites = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        const { companyId } = req.query;

        // Check permissions
        if (user.role !== 'Owner' && user.role !== 'Admin' && user.permission !== 'full_control') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const whereClause: any = {
            deletedAt: { [Op.ne]: null }
        };

        if (companyId) {
            whereClause.companyId = Number(companyId);
        }

        const sites = await Site.findAll({ where: whereClause });
        res.json(sites);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const restoreSiteFromTrash = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user;

        // Permission check
        if (user.role !== 'Owner' && user.role !== 'Admin' && user.permission !== 'full_control') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        console.log(`[restoreSiteFromTrash] Attempting to restore site with ID: ${id}`);
        const site = await Site.findByPk(id);

        if (!site) {
            console.log(`[restoreSiteFromTrash] Site not found for ID: ${id}`);
            return res.status(404).json({ message: 'Site not found' });
        }

        site.deletedAt = null;
        site.permanentDeleteAt = null;
        await site.save();

        res.json({ message: 'Site restored successfully', site });

    } catch (error) {
        console.error("Error in restoreSiteFromTrash:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};
