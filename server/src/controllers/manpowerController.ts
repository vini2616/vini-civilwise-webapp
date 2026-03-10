import { Request, Response } from 'express';
import Manpower from '../models/Manpower';
import ManpowerAttendance from '../models/ManpowerAttendance';
import ManpowerPayment from '../models/ManpowerPayment';
import { getAccessibleSiteIds } from '../utils/accessControl';
import { Op } from 'sequelize';

// --- Manpower Management ---

export const createManpower = async (req: Request, res: Response) => {
    try {
        const { siteId, name, type, trade, rate, contractor } = req.body;

        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(Number(siteId))) {
            return res.status(403).json({ message: 'Access denied for this site' });
        }

        const manpower = await Manpower.create({
            siteId,
            name,
            type,
            trade,
            rate,
            contractor,
            enteredBy: (req as any).user?.name
        });

        console.log("Created Manpower:", manpower.toJSON());
        res.status(201).json(manpower);
    } catch (error: any) {
        console.error("Create Manpower Error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const getManpower = async (req: Request, res: Response) => {
    try {
        const { siteId } = req.query;
        console.log("GetManpower Request:", { siteId, user: (req as any).user?.id });

        const accessibleSites = await getAccessibleSiteIds((req as any).user);

        let where: any = {};
        if (siteId) {
            if (!accessibleSites.includes(Number(siteId))) {
                console.warn("Access Denied for site:", siteId, "Accessible:", accessibleSites);
                return res.status(403).json({ message: 'Access denied for this site' });
            }
            where.siteId = Number(siteId);
        } else {
            where.siteId = accessibleSites;
        }

        console.log("GetManpower Query Where:", where);

        const manpower = await Manpower.findAll({
            where,
            order: [['name', 'ASC']]
        });

        console.log(`Found ${manpower.length} manpower resources`);

        res.status(200).json(manpower);
    } catch (error: any) {
        console.error("GetManpower Error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const updateManpower = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const manpower = await Manpower.findByPk(id);

        if (!manpower) {
            return res.status(404).json({ message: 'Manpower not found' });
        }

        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(manpower.siteId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // await manpower.update({ ...req.body, editedBy: req.user?.name });
        await manpower.update({ ...req.body });
        res.status(200).json(manpower);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const deleteManpower = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const manpower = await Manpower.findByPk(id);

        if (!manpower) {
            return res.status(404).json({ message: 'Manpower not found' });
        }

        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(manpower.siteId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await manpower.destroy();
        res.status(200).json({ message: 'Manpower deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// --- Attendance ---

export const markAttendance = async (req: Request, res: Response) => {
    try {
        const { siteId, date, records } = req.body; // records: [{ manpowerId, status, overtime }]
        console.log("MarkAttendance Request:", { siteId, date, recordsCount: records?.length, recordsSample: records?.slice(0, 2) });

        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(Number(siteId))) {
            return res.status(403).json({ message: 'Access denied for this site' });
        }

        // Check if records is valid array
        if (!Array.isArray(records)) {
            return res.status(400).json({ message: 'Invalid format: records must be an array' });
        }

        // Upsert attendance for this site and date
        const [attendance, created] = await (ManpowerAttendance as any).findOrCreate({
            where: { siteId, date },
            defaults: { records }
        });

        if (!created) {
            console.log("Attendance exists for date, updating records...");
            await attendance.update({ records });
            console.log("Attendance updated successfully.");
        } else {
            console.log("New attendance record created.");
        }

        res.status(200).json(attendance);
    } catch (error: any) {
        console.error("MarkAttendance Error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const getAttendance = async (req: Request, res: Response) => {
    try {
        const { siteId, date, month } = req.query; // date for specific day, month for YYYY-MM
        console.log("GetAttendance Request:", { siteId, date, month });

        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(Number(siteId))) {
            return res.status(403).json({ message: 'Access denied for this site' });
        }

        let where: any = { siteId: Number(siteId) };
        if (date) {
            where.date = date;
        } else if (month) {
            where.date = { [Op.like]: `${month}%` }; // Simple string match for 'YYYY-MM'
        }

        const attendance = await ManpowerAttendance.findAll({
            where,
            order: [['date', 'DESC']]
        });

        console.log(`Found ${attendance.length} attendance documents.`);

        // Ensure records are parsed correctly (handle Sequelize returning string for JSON columns)
        const parsedAttendance = attendance.map(doc => {
            const data = doc.toJSON() as any;
            if (typeof data.records === 'string') {
                try {
                    console.log(`Parsing records string for date ${data.date}`);
                    data.records = JSON.parse(data.records);
                } catch (e) {
                    console.error("Failed to parse records JSON for date", data.date, e);
                    data.records = [];
                }
            }
            return data;
        });

        res.status(200).json(parsedAttendance);
    } catch (error: any) {
        console.error("GetAttendance Error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// --- Payments ---

export const addPayment = async (req: Request, res: Response) => {
    try {
        const { siteId, manpowerId, amount, date, note } = req.body;

        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(Number(siteId))) {
            return res.status(403).json({ message: 'Access denied for this site' });
        }

        const payment = await ManpowerPayment.create({
            siteId,
            manpowerId,
            amount,
            date,
            note
        });

        res.status(201).json(payment);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const getPayments = async (req: Request, res: Response) => {
    try {
        const { siteId, manpowerId } = req.query;

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

        if (manpowerId) {
            where.manpowerId = manpowerId;
        }

        const payments = await ManpowerPayment.findAll({
            where,
            include: [{ model: Manpower, as: 'manpower', attributes: ['name', 'trade'] }],
            order: [['date', 'DESC']]
        });

        res.status(200).json(payments);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const deletePayment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const payment = await ManpowerPayment.findByPk(id);

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(payment.siteId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await payment.destroy();
        res.status(200).json({ message: 'Payment deleted' });
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
