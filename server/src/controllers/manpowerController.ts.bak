import { Request, Response } from 'express';
import Manpower from '../models/Manpower';
import ManpowerPayment from '../models/ManpowerPayment';
import ManpowerAttendance from '../models/ManpowerAttendance';

// --- RESOURCES ---
export const getResources = async (req: Request, res: Response) => {
    try {
        const { siteId } = req.query;
        if (!siteId) return res.status(400).json({ message: 'Site ID required' });
        const list = await Manpower.find({ siteId });
        res.json(list);
    } catch (error) { res.status(500).json({ message: 'Server Error' }); }
};

export const createResource = async (req: Request, res: Response) => {
    try {
        const resource = new Manpower(req.body);
        const saved = await resource.save();
        res.status(201).json(saved);
    } catch (error) {
        console.error("Create Resource Error:", error);
        res.status(500).json({ message: (error as any).message || 'Server Error' });
    }
};

export const updateResource = async (req: Request, res: Response) => {
    try {
        const updated = await Manpower.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (error) { res.status(500).json({ message: 'Server Error' }); }
};

export const deleteResource = async (req: Request, res: Response) => {
    try {
        await Manpower.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (error) { res.status(500).json({ message: 'Server Error' }); }
};

// --- ATTENDANCE ---
export const getAttendance = async (req: Request, res: Response) => {
    try {
        const { siteId, start, end } = req.query;
        // Simple query for now, filtering by siteId. Client can filter by date range if needed or we add full range query
        const query: any = { siteId };
        if (start && end) {
            query.date = { $gte: start, $lte: end };
        }
        const list = await ManpowerAttendance.find(query);
        res.json(list);
    } catch (error) { res.status(500).json({ message: 'Server Error' }); }
};

export const saveAttendance = async (req: Request, res: Response) => {
    try {
        const { siteId, date, records } = req.body;
        // Upsert based on siteId + date
        const updated = await ManpowerAttendance.findOneAndUpdate(
            { siteId, date },
            { siteId, date, records },
            { new: true, upsert: true }
        );
        res.json(updated);
    } catch (error) { res.status(500).json({ message: 'Server Error' }); }
};

// --- PAYMENTS ---
export const getPayments = async (req: Request, res: Response) => {
    try {
        const { siteId } = req.query;
        if (!siteId) return res.status(400).json({ message: 'Site ID required' });
        const list = await ManpowerPayment.find({ siteId });
        res.json(list);
    } catch (error) { res.status(500).json({ message: 'Server Error' }); }
};

export const createPayment = async (req: Request, res: Response) => {
    try {
        const payment = new ManpowerPayment(req.body);
        const saved = await payment.save();
        res.status(201).json(saved);
    } catch (error) { res.status(500).json({ message: 'Server Error' }); }
};

export const deletePayment = async (req: Request, res: Response) => {
    try {
        await ManpowerPayment.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (error) { res.status(500).json({ message: 'Server Error' }); }
};
