import { Request, Response } from 'express';
import DPR from '../models/DPR';
import { getAccessibleSiteIds } from '../utils/accessControl';
import { processFiles } from '../utils/fileUpload';


export const createDPR = async (req: Request, res: Response) => {
    try {
        const { siteId, projectInfo, manpower, workStarted, equipment, materials, work, reconciliation, planTomorrow, remarks, signatures, photos } = req.body;

        const processedPhotos = processFiles(photos as any[], req, 'dpr');

        const userId = (req as any).user.id;

        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(Number(siteId))) {
            return res.status(403).json({ message: 'Access denied for this site' });
        }

        // Ideally, check if DPR already exists for this date and site
        // For now, simpler implementation: just create
        const dpr = await DPR.create({
            siteId,
            userId,
            projectInfo,
            manpower: manpower || [],
            workStarted: workStarted || [],
            equipment: equipment || [],
            materials: materials || [],
            work: work || [],
            reconciliation: reconciliation || [],
            planTomorrow,
            remarks: remarks || {},
            signatures: signatures || {},
            photos: processedPhotos
        });

        res.status(201).json(dpr);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const getDPRs = async (req: Request, res: Response) => {
    try {
        const { siteId } = req.query;

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

        const dprs = await DPR.findAll({
            where,
            order: [['createdAt', 'DESC']],
            limit: 50, // Safety limit
            attributes: { exclude: ['photos', 'signatures'] } // Exclude potential heavy fields
        });

        console.log(`[getDPRs] Found ${dprs.length} DPRs for siteId: ${siteId}`);

        res.status(200).json(dprs);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const getDPRById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const dpr = await DPR.findByPk(id);

        if (!dpr) {
            return res.status(404).json({ message: 'DPR not found' });
        }

        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(dpr.siteId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.status(200).json(dpr);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const updateDPR = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const dpr = await DPR.findByPk(id);

        if (!dpr) {
            return res.status(404).json({ message: 'DPR not found' });
        }

        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(dpr.siteId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        if (req.body.photos) {
            req.body.photos = processFiles(req.body.photos, req, 'dpr');
        }
        await dpr.update(req.body);
        res.status(200).json(dpr);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const deleteDPR = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const dpr = await DPR.findByPk(id);

        if (!dpr) {
            return res.status(404).json({ message: 'DPR not found' });
        }

        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(dpr.siteId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await dpr.destroy();
        res.status(200).json({ message: 'DPR deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
