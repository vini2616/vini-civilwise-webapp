import { Request, Response } from 'express';
import Bill from '../models/Bill';
import { getAccessibleSiteIds } from '../utils/accessControl';
import { processFile } from '../utils/fileUpload';

export const createBill = async (req: Request, res: Response) => {
    try {
        const { siteId, invoiceNo, date, partyName, amount, items, destination, note, type } = req.body;
        const userId = (req as any).user.id;

        // Verify access
        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(Number(siteId))) {
            return res.status(403).json({ message: 'Access denied for this site' });
        }

        const bill = await Bill.create({
            siteId,
            userId,
            invoiceNo,
            date,
            partyName,
            partyAddress: req.body.partyAddress,
            partyGst: req.body.partyGst,
            partyMobile: req.body.partyMobile,
            destination,
            items: items ? items.map((item: any) => {
                if (item.image) item.image = processFile(item.image, req, 'bills');
                return item;
            }) : [],
            freight: req.body.freight,
            gstRate: req.body.gstRate,
            gstAmount: req.body.gstAmount,
            baseAmount: req.body.baseAmount,
            amount,
            note,
            type: type || 'invoice'
        });

        res.status(201).json(bill);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const getBills = async (req: Request, res: Response) => {
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

        const bills = await Bill.findAll({
            where,
            order: [['date', 'DESC']]
        });

        res.status(200).json(bills);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const getBillById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const bill = await Bill.findByPk(id);

        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }

        // Verify access
        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(bill.siteId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.status(200).json(bill);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const updateBill = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const bill = await Bill.findByPk(id);

        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }

        // Verify access
        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(bill.siteId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        if (req.body.items && Array.isArray(req.body.items)) {
            req.body.items = req.body.items.map((item: any) => {
                if (item.image) item.image = processFile(item.image, req, 'bills');
                return item;
            });
        }
        await bill.update(req.body);
        res.status(200).json(bill);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const deleteBill = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const bill = await Bill.findByPk(id);

        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }

        // Verify access
        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(bill.siteId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await bill.destroy();
        res.status(200).json({ message: 'Bill deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
