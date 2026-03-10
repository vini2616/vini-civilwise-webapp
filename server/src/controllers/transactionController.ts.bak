import { Request, Response } from 'express';
import Transaction from '../models/Transaction';

import { getAccessibleSiteIds, verifySiteAccess } from '../utils/accessControl';

export const getTransactions = async (req: Request, res: Response) => {
    try {
        const { siteId } = req.query;
        // @ts-ignore
        const user = req.user;
        let query: any = {};

        if (siteId) {
            // Verify access to the specific site
            const hasAccess = await verifySiteAccess(user, siteId as string);
            if (!hasAccess) {
                res.status(403).json({ message: 'Not authorized to view transactions for this site' });
                return;
            }
            query.siteId = siteId as any;
        } else {
            // Return transactions for all accessible sites
            const accessibleSiteIds = await getAccessibleSiteIds(user);
            if (accessibleSiteIds.length === 0) {
                res.json([]);
                return;
            }
            query.siteId = { $in: accessibleSiteIds };
        }

        const transactions = await Transaction.find(query).sort({ date: -1 });
        res.json(transactions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const createTransaction = async (req: Request, res: Response) => {
    try {
        const { date, amount, baseAmount, gstRate, gstAmount, type, category, description, note, partyName, billNo, mode, siteId, billImage, paymentProof, userId, isCashbook } = req.body;

        // Normalize type for consistency (Mobile sends income/expense, DB standard is credit/debit)
        let finalType = type;
        if (type === 'income') finalType = 'credit';
        if (type === 'expense') finalType = 'debit';

        const transaction = new Transaction({
            date,
            amount,
            baseAmount,
            gstRate,
            gstAmount,
            type: finalType,
            category,
            description,
            note,
            partyName,
            billNo,
            mode,
            siteId,
            billImage,
            paymentProof,
            // Use provided userId if available (for Admin adding for others), else use logged-in user
            // @ts-ignore
            userId: userId || req.user._id,
            isCashbook: isCashbook || false,
        });
        const createdTransaction = await transaction.save();
        res.status(201).json(createdTransaction);
    } catch (error: any) {
        console.error("Create Transaction Error:", error);
        res.status(500).json({ message: error.message || 'Server Error' });
    }
};

export const updateTransaction = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { date, amount, baseAmount, gstRate, gstAmount, type, category, description, note, partyName, billNo, mode, billImage, paymentProof, isCashbook } = req.body;

        const transaction = await Transaction.findById(id);

        if (!transaction) {
            res.status(404).json({ message: 'Transaction not found' });
            return;
        }

        // Normalize type
        let finalType = type;
        if (type === 'income') finalType = 'credit';
        if (type === 'expense') finalType = 'debit';

        transaction.date = date || transaction.date;
        transaction.amount = amount || transaction.amount;
        transaction.baseAmount = baseAmount || transaction.baseAmount;
        transaction.gstRate = gstRate || transaction.gstRate;
        transaction.gstAmount = gstAmount || transaction.gstAmount;
        transaction.type = finalType || transaction.type;
        transaction.category = category || transaction.category;
        transaction.description = description || transaction.description;
        transaction.note = note || transaction.note;
        transaction.partyName = partyName || transaction.partyName;
        transaction.billNo = billNo || transaction.billNo;
        transaction.mode = mode || transaction.mode;
        transaction.billImage = billImage || transaction.billImage;
        transaction.paymentProof = paymentProof || transaction.paymentProof;
        if (isCashbook !== undefined) transaction.isCashbook = isCashbook;

        const updatedTransaction = await transaction.save();
        res.json(updatedTransaction);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export const deleteTransaction = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const transaction = await Transaction.findById(id);

        if (!transaction) {
            res.status(404).json({ message: 'Transaction not found' });
            return;
        }

        await transaction.deleteOne();
        res.json({ message: 'Transaction removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
