import { Request, Response } from 'express';
import Checklist from '../models/Checklist';
import { getAccessibleSiteIds } from '../utils/accessControl';
import { processFiles } from '../utils/fileUpload';

export const createChecklist = async (req: Request, res: Response) => {
    try {
        const { siteId, name, type, category, items, status, progress, date } = req.body;

        // Verify access
        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(Number(siteId))) {
            return res.status(403).json({ message: 'Access denied for this site' });
        }

        const checklist = await Checklist.create({
            siteId,
            name,
            type: type || 'Instance',
            category,
            items: items ? items.map((item: any) => {
                if (item.photos) {
                    item.photos = processFiles(item.photos, req, 'checklists');
                }
                return item;
            }) : [],
            status: status || 'In Progress',
            progress: progress || 0,
            date
        });

        res.status(201).json(checklist);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const getChecklists = async (req: Request, res: Response) => {
    try {
        const { siteId, type } = req.query;

        // Verify access
        const accessibleSites = await getAccessibleSiteIds((req as any).user);

        let where: any = {};
        if (siteId) {
            if (!accessibleSites.includes(Number(siteId))) {
                return res.status(403).json({ message: 'Access denied for this site' });
            }
            where.siteId = siteId;
        } else {
            where.siteId = accessibleSites;
        }

        if (type) {
            where.type = type;
        }

        const checklists = await Checklist.findAll({
            where,
            order: [['createdAt', 'DESC']],
            limit: 50
        });

        // Sanitize: Remove photos from items to prevent payload bloat
        const sanitized = checklists.map(c => {
            const json = c.toJSON();
            if (Array.isArray(json.items)) {
                json.items = json.items.map((item: any) => {
                    const { photos, ...rest } = item;
                    return rest;
                });
            }
            return json;
        });

        res.status(200).json(sanitized);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const getChecklistById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const checklist = await Checklist.findByPk(id);

        if (!checklist) {
            return res.status(404).json({ message: 'Checklist not found' });
        }

        // Verify access
        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(checklist.siteId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.status(200).json(checklist);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const updateChecklist = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        console.log(`[Checklist] Updating checklist ${id}`);
        // console.log(`[Checklist] Payload keys: ${Object.keys(req.body).join(', ')}`);

        const checklist = await Checklist.findByPk(id);

        if (!checklist) {
            console.log(`[Checklist] Checklist ${id} not found`);
            return res.status(404).json({ message: 'Checklist not found' });
        }

        // Verify access
        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(checklist.siteId)) {
            console.log(`[Checklist] Access denied for site ${checklist.siteId}`);
            return res.status(403).json({ message: 'Access denied' });
        }

        // Handle items specifically to ensure they are valid JSON
        if (req.body.items && typeof req.body.items === 'string') {
            try {
                req.body.items = JSON.parse(req.body.items);
            } catch (e) {
                console.warn("Could not parse body items, keeping as string");
            }
        }

        if (req.body.items && Array.isArray(req.body.items)) {
            req.body.items = req.body.items.map((item: any) => {
                if (item.photos) {
                    item.photos = processFiles(item.photos, req, 'checklists');
                }
                return item;
            });
        }

        await checklist.update(req.body);

        // Reload to ensure we have latest data (optional, but good for consistency)
        // await checklist.reload(); 

        console.log(`[Checklist] Update successful for ${id}`);
        res.status(200).json(checklist.toJSON());
    } catch (error: any) {
        console.error(`[Checklist] Update Error`, error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const deleteChecklist = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const checklist = await Checklist.findByPk(id);

        if (!checklist) {
            return res.status(404).json({ message: 'Checklist not found' });
        }

        // Verify access
        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(checklist.siteId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await checklist.destroy();
        res.status(200).json({ message: 'Checklist deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
