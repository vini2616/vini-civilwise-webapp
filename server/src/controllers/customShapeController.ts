import { Request, Response } from 'express';
import CustomShape from '../models/CustomShape';
import { getAccessibleSiteIds } from '../utils/accessControl';

export const createCustomShape = async (req: Request, res: Response) => {
    try {
        const { siteId, name, description, type, segments, deductions } = req.body;

        // Verify access
        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(Number(siteId))) {
            return res.status(403).json({ message: 'Access denied for this site' });
        }

        const shape = await CustomShape.create({
            siteId,
            name,
            description,
            type: type || 'SEGMENT_BASED',
            segments: segments || [],
            deductions: deductions || {}
        });

        res.status(201).json(shape);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const updateCustomShape = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, segments, deductions } = req.body;

        const shape = await CustomShape.findByPk(id);
        if (!shape) {
            return res.status(404).json({ message: 'Shape not found' });
        }

        // Verify access - check if user has access to the site this shape belongs to
        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(shape.siteId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        shape.name = name || shape.name;
        shape.description = description !== undefined ? description : shape.description;
        shape.segments = segments || shape.segments;
        shape.deductions = deductions || shape.deductions;
        shape.type = (req.body.type) ? req.body.type : shape.type;

        await shape.save();
        res.status(200).json(shape);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const getCustomShapes = async (req: Request, res: Response) => {
    try {
        const { siteId } = req.query;

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

        const shapes = await CustomShape.findAll({
            where,
            order: [['name', 'ASC']]
        });

        res.status(200).json(shapes);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const deleteCustomShape = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const shape = await CustomShape.findByPk(id);

        if (!shape) {
            return res.status(404).json({ message: 'Shape not found' });
        }

        // Verify access
        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(shape.siteId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await shape.destroy();
        res.status(200).json({ message: 'Shape deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
