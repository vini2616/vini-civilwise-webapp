import { Request, Response } from 'express';
import Bill from '../models/Bill';
import { getAccessibleSiteIds, verifySiteAccess } from '../utils/accessControl';

export const getBills = async (req: Request, res: Response) => {
    try {
        const { siteId } = req.query;
        // @ts-ignore
        const user = req.user;
        let query: any = {};

        if (siteId) {
            const hasAccess = await verifySiteAccess(user, siteId as string);
            if (!hasAccess) {
                res.status(403).json({ message: 'Not authorized to view bills for this site' });
                return;
            }
            query.siteId = siteId as any;
        } else {
            const accessibleSiteIds = await getAccessibleSiteIds(user);
            if (accessibleSiteIds.length === 0) {
                res.json([]);
                return;
            }
            query.siteId = { $in: accessibleSiteIds };
        }

        const bills = await Bill.find(query).sort({ date: -1 });
        res.json(bills);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const createBill = async (req: Request, res: Response) => {
    try {
        const { invoiceNo, date, partyName, partyAddress, partyGst, partyMobile, destination, items, freight, gstRate, gstAmount, baseAmount, amount, note, type, siteId } = req.body;

        const bill = new Bill({
            invoiceNo,
            date,
            partyName,
            partyAddress,
            partyGst,
            partyMobile,
            destination,
            items,
            freight,
            gstRate,
            gstAmount,
            baseAmount,
            amount,
            note,
            type,
            siteId,
            // @ts-ignore
            userId: req.user._id,
        });

        const createdBill = await bill.save();
        res.status(201).json(createdBill);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const updateBill = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const bill = await Bill.findById(id);

        if (!bill) {
            res.status(404).json({ message: 'Bill not found' });
            return;
        }

        Object.assign(bill, updateData);

        const updatedBill = await bill.save();
        res.json(updatedBill);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const deleteBill = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const bill = await Bill.findById(id);

        if (!bill) {
            res.status(404).json({ message: 'Bill not found' });
            return;
        }

        await bill.deleteOne();
        res.json({ message: 'Bill removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
