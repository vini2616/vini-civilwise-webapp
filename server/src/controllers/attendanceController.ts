import { Request, Response } from 'express';
import Attendance from '../models/Attendance';
import { getAccessibleSiteIds } from '../utils/accessControl';

export const createAttendance = async (req: Request, res: Response) => {
    try {
        const { siteId, date, workers, notes } = req.body;

        // Verify access
        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(Number(siteId))) {
            return res.status(403).json({ message: 'Access denied for this site' });
        }

        const attendance = await Attendance.create({
            siteId,
            date,
            workers: workers || [],
            notes
        });

        res.status(201).json(attendance);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const getAttendance = async (req: Request, res: Response) => {
    try {
        const { siteId, date } = req.query;

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

        if (date) {
            where.date = date; // Might need to handle date ranges or exact matches better
        }

        const attendance = await Attendance.findAll({
            where,
            order: [['date', 'DESC']]
        });

        res.status(200).json(attendance);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const deleteAttendance = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const attendance = await Attendance.findByPk(id);

        if (!attendance) {
            return res.status(404).json({ message: 'Attendance record not found' });
        }

        // Verify access
        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(attendance.siteId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await attendance.destroy();
        res.status(200).json({ message: 'Attendance deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
