import { Request, Response } from 'express';
import InventoryItem from '../models/InventoryItem';

export const getInventory = async (req: Request, res: Response) => {
    try {
        const { siteId } = req.params;
        const items = await InventoryItem.find({ siteId: siteId as any });
        res.status(200).json(items);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching inventory', error });
    }
};

export const createInventoryItem = async (req: Request, res: Response) => {
    try {
        const newItem = new InventoryItem(req.body);
        const savedItem = await newItem.save();
        res.status(201).json(savedItem);
    } catch (error) {
        res.status(500).json({ message: 'Error creating inventory item', error });
    }
};

export const updateInventoryItem = async (req: Request, res: Response) => {
    try {
        const updatedItem = await InventoryItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json(updatedItem);
    } catch (error) {
        res.status(500).json({ message: 'Error updating inventory item', error });
    }
};

export const deleteInventoryItem = async (req: Request, res: Response) => {
    try {
        await InventoryItem.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Item deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting inventory item', error });
    }
};
