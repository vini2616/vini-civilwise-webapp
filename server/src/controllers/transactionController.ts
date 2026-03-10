// @ts-nocheck
import { Request, Response } from 'express';
import Transaction from '../models/Transaction';
import { getAccessibleSiteIds, verifySiteAccess } from '../utils/accessControl';
import { processFile } from '../utils/fileUpload';
import { Op } from 'sequelize';

export const getTransactions = async (req: Request, res: Response) => {
    try {
        const { siteId } = req.query;
        // @ts-ignore
        const user = req.user;
        let whereClause: any = {};

        if (siteId) {
            // Verify access to the specific site
            const hasAccess = await verifySiteAccess(user, Number(siteId));
            if (!hasAccess) {
                res.status(403).json({ message: 'Not authorized to view transactions for this site' });
                return;
            }
            whereClause.siteId = Number(siteId);
        } else {
            // Return transactions for all accessible sites
            const accessibleSiteIds = await getAccessibleSiteIds(user);
            if (accessibleSiteIds.length === 0) {
                res.json([]);
                return;
            }
            whereClause.siteId = { [Op.in]: accessibleSiteIds };
        }

        const transactions = await Transaction.findAll({
            where: whereClause,
            order: [['date', 'DESC']],
            limit: 500, // Safety limit
            attributes: { exclude: ['billImage', 'paymentProof'] } // Exclude heavy images
        });
        res.json(transactions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const getTransactionById = async (req: Request, res: Response) => {
    try {
        const transaction = await Transaction.findByPk(req.params.id);
        if (!transaction) return res.status(404).json({ message: 'Not found' });
        res.json(transaction);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export const createTransaction = async (req: Request, res: Response) => {
    try {
        const { date, amount, baseAmount, gstRate, gstAmount, type, category, description, note, partyName, billNo, mode, siteId, billImage, paymentProof, userId, isCashbook } = req.body;

        console.log("Creating Transaction:", { siteId, userId, amount, isCashbook, type });

        // Normalize type for consistency (Mobile sends income/expense, DB standard is credit/debit)
        let finalType = type;
        if (type === 'income') finalType = 'credit';
        if (type === 'expense') finalType = 'debit';

        const transaction = await Transaction.create({
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
            siteId: Number(siteId),
            billImage: processFile(billImage, req, 'transactions'),
            paymentProof: processFile(paymentProof, req, 'transactions'),
            // Use provided userId if available (for Admin adding for others), else use logged-in user
            // @ts-ignore
            userId: userId ? Number(userId) : Number(req.user.id),
            // @ts-ignore
            enteredBy: req.user.name,
            isCashbook: isCashbook || false,
        });

        console.log("Transaction Created:", transaction.toJSON());

        res.status(201).json(transaction);
    } catch (error: any) {
        console.error("Create Transaction Error:", error);
        res.status(500).json({ message: error.message || 'Server Error' });
    }
};

export const updateTransaction = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { date, amount, baseAmount, gstRate, gstAmount, type, category, description, note, partyName, billNo, mode, billImage, paymentProof, isCashbook } = req.body;
        // @ts-ignore
        const user = req.user;

        const transaction = await Transaction.findByPk(id);

        if (!transaction) {
            res.status(404).json({ message: 'Transaction not found' });
            return;
        }

        // Normalize type
        let finalType = type;
        if (type === 'income') finalType = 'credit';
        if (type === 'expense') finalType = 'debit';

        // Update fields if provided
        if (date !== undefined) transaction.date = date;
        if (amount !== undefined) transaction.amount = amount;
        if (baseAmount !== undefined) transaction.baseAmount = baseAmount;
        if (gstRate !== undefined) transaction.gstRate = gstRate;
        if (gstAmount !== undefined) transaction.gstAmount = gstAmount;
        if (finalType !== undefined) transaction.type = finalType;
        if (category !== undefined) transaction.category = category;
        if (description !== undefined) transaction.description = description;
        if (note !== undefined) transaction.note = note;
        if (partyName !== undefined) transaction.partyName = partyName;
        if (billNo !== undefined) transaction.billNo = billNo;
        if (mode !== undefined) transaction.mode = mode;
        if (billImage !== undefined) transaction.billImage = processFile(billImage, req, 'transactions');
        if (paymentProof !== undefined) transaction.paymentProof = processFile(paymentProof, req, 'transactions');
        if (isCashbook !== undefined) transaction.isCashbook = isCashbook;

        transaction.editedBy = user.name;

        const updatedTransaction = await transaction.save();
        res.json(updatedTransaction);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export const deleteTransaction = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const transaction = await Transaction.findByPk(id);

        if (!transaction) {
            res.status(404).json({ message: 'Transaction not found' });
            return;
        }

        await transaction.destroy();
        res.json({ message: 'Transaction removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
