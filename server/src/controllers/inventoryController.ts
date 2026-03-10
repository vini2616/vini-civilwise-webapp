// @ts-nocheck
import { Request, Response } from 'express';
import InventoryItem from '../models/InventoryItem';
import { processFile } from '../utils/fileUpload';

export const getInventory = async (req: Request, res: Response) => {
    try {
        const siteId = req.params.siteId || req.query.siteId;
        console.log(`[getInventory] Request for siteId: ${siteId}`);

        let whereClause: any = {};
        if (siteId) {
            whereClause.siteId = Number(siteId);
        } else {
            console.log("[getInventory] Warning: No siteId provided in request");
        }

        const items = await InventoryItem.findAll({ where: whereClause });
        console.log(`[getInventory] Found ${items.length} items for siteId: ${siteId}`);
        res.json(items);
    } catch (error) {
        console.error("[getInventory] Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const createInventoryItem = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const enteredBy = req.user?.name;

        if (req.body.documents && Array.isArray(req.body.documents)) {
            req.body.documents = req.body.documents.map((doc: any) => {
                if (doc.url) doc.url = processFile(doc.url, req, 'inventory');
                return doc;
            });
        }

        const item = await InventoryItem.create({ ...req.body, enteredBy });
        res.status(201).json(item);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateInventoryItem = async (req: Request, res: Response) => {
    try {
        const item = await InventoryItem.findByPk(req.params.id);
        if (item) {
            // @ts-ignore
            const editedBy = req.user?.name;

            if (req.body.documents && Array.isArray(req.body.documents)) {
                req.body.documents = req.body.documents.map((doc: any) => {
                    if (doc.url) doc.url = processFile(doc.url, req, 'inventory');
                    return doc;
                });
            }

            await item.update({ ...req.body, editedBy });
            res.json(item);
        } else {
            res.status(404).json({ message: 'Item not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export const deleteInventoryItem = async (req: Request, res: Response) => {
    try {
        const item = await InventoryItem.findByPk(req.params.id);
        if (item) {
            await item.destroy();
            res.json({ message: 'Item removed' });
        } else {
            res.status(404).json({ message: 'Item not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
