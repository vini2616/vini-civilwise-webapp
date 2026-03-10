import { Request, Response } from 'express';
import Material from '../models/Material';

export const getMaterials = async (req: Request, res: Response) => {
    try {
        const { siteId } = req.params;
        const materials = await Material.find({ siteId: siteId as any });
        res.status(200).json(materials);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching materials', error });
    }
};

export const createMaterial = async (req: Request, res: Response) => {
    try {
        const newMaterial = new Material(req.body);
        const savedMaterial = await newMaterial.save();
        res.status(201).json(savedMaterial);
    } catch (error) {
        res.status(500).json({ message: 'Error creating material', error });
    }
};

export const updateMaterial = async (req: Request, res: Response) => {
    try {
        const updatedMaterial = await Material.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.status(200).json(updatedMaterial);
    } catch (error) {
        res.status(500).json({ message: 'Error updating material', error });
    }
};

export const deleteMaterial = async (req: Request, res: Response) => {
    try {
        await Material.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Material deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting material', error });
    }
};

export const deleteMaterialsByDPR = async (req: Request, res: Response) => {
    try {
        const { dprId } = req.query;
        if (!dprId) {
            res.status(400).json({ message: 'dprId is required' });
            return;
        }
        await Material.deleteMany({ dprId: dprId as string });
        res.status(200).json({ message: 'Materials deleted for DPR' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting materials by DPR', error });
    }
};
