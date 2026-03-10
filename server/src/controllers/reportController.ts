import { Request, Response } from 'express';
import Report from '../models/Report';
import { getAccessibleSiteIds } from '../utils/accessControl';

import { processFile } from '../utils/fileUpload';

export const createReport = async (req: Request, res: Response) => {
    try {
        const { siteId, type, date, location, image, status, data } = req.body;
        const createdBy = (req as any).user.name || 'Unknown';

        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(Number(siteId))) {
            return res.status(403).json({ message: 'Access denied for this site' });
        }

        // Process image
        const processedImage = processFile(image, req, 'reports');

        const report = await Report.create({
            siteId,
            type,
            date: date || new Date(),
            location,
            image: processedImage,
            status: status || 'Scheduled',
            createdBy,
            data: data || {}
        });

        res.status(201).json(report);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const getReports = async (req: Request, res: Response) => {
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

        const reports = await Report.findAll({
            where,
            order: [['date', 'DESC']],
            limit: 100, // Hard limit
            attributes: { exclude: ['image'] } // Exclude top-level image
        });

        // SANITIZE: Remove image from 'data' JSON to prevent payload bloat
        // This is necessary because older records saved full base64 photos in 'data'
        const sanitizedReports = reports.map(r => {
            const reportJson = r.toJSON();
            if (reportJson.data && reportJson.data.image) {
                delete reportJson.data.image;
            }
            return reportJson;
        });

        res.status(200).json(sanitizedReports);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const getReportById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const report = await Report.findByPk(id);

        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(report.siteId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.status(200).json(report);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const updateReport = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const report = await Report.findByPk(id);

        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(report.siteId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        if (req.body.image) {
            req.body.image = processFile(req.body.image, req, 'reports');
        }
        await report.update(req.body);
        res.status(200).json(report);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
export const deleteReport = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const report = await Report.findByPk(id);

        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(report.siteId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await report.destroy();
        res.status(200).json({ message: 'Report deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
