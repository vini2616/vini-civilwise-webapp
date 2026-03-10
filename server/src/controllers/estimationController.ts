import { Request, Response } from 'express';
import Estimation from '../models/Estimation';
import { getAccessibleSiteIds } from '../utils/accessControl';

export const createEstimation = async (req: Request, res: Response) => {
    try {
        const { siteId, title, description, type, date, items, defaultValue } = req.body;

        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(Number(siteId))) {
            return res.status(403).json({ message: 'Access denied for this site' });
        }

        const estimation = await Estimation.create({
            siteId,
            title,
            description,
            type,
            date: date || new Date(),
            items: items || [],
            ...req.body, // spread other defaults
            scrapStock: Array.isArray(req.body.scrapStock) ? req.body.scrapStock : []
        });

        res.status(201).json(estimation);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const getEstimations = async (req: Request, res: Response) => {
    try {
        const { siteId, type } = req.query;

        const accessibleSites = await getAccessibleSiteIds((req as any).user);

        let where: any = {};
        if (siteId) {
            if (!accessibleSites.includes(Number(siteId))) {
                return res.status(403).json({ message: 'Access denied for this site' });
            }
            where.siteId = Number(siteId);
        } else {
            where.siteId = accessibleSites;
        }

        if (type) {
            where.type = type;
        }

        const estimations = await Estimation.findAll({
            where,
            order: [['date', 'DESC']]
        });

        res.status(200).json(estimations);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const getEstimationById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const estimation = await Estimation.findByPk(id);

        if (!estimation) {
            return res.status(404).json({ message: 'Estimation not found' });
        }

        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(estimation.siteId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.status(200).json(estimation);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const updateEstimation = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const estimation = await Estimation.findByPk(id);

        if (!estimation) {
            return res.status(404).json({ message: 'Estimation not found' });
        }

        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(estimation.siteId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        console.log(`Updating Estimation ${id}:`, JSON.stringify(req.body.items ? `Items count: ${req.body.items.length}` : 'No items'));

        if (req.body.items) {
            estimation.items = req.body.items;
            estimation.changed('items', true);
        }

        // Handle scrapStock specifically like items (JSON)
        if (req.body.scrapStock) {
            if (!Array.isArray(req.body.scrapStock)) {
                req.body.scrapStock = [];
            }
            estimation.scrapStock = req.body.scrapStock;
            estimation.changed('scrapStock', true);
        }

        // update other fields
        Object.keys(req.body).forEach(key => {
            if (key !== 'items' && key !== 'id' && key !== 'siteId' && key !== 'scrapStock') {
                (estimation as any)[key] = req.body[key];
            }
        });

        await estimation.save();
        res.status(200).json(estimation);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const deleteEstimation = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const estimation = await Estimation.findByPk(id);

        if (!estimation) {
            return res.status(404).json({ message: 'Estimation not found' });
        }

        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(estimation.siteId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await estimation.destroy();
        res.status(200).json({ message: 'Estimation deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
