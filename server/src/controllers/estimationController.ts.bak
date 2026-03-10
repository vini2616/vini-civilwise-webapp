import { Request, Response } from 'express';
import Estimation from '../models/Estimation';

export const getEstimations = async (req: Request, res: Response) => {
    try {
        const { siteId } = req.params;
        const estimations = await Estimation.find({ siteId: siteId as any }).sort({ createdAt: -1 });
        res.status(200).json(estimations);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching estimations', error });
    }
};

export const createEstimation = async (req: Request, res: Response) => {
    try {
        const newEstimation = new Estimation(req.body);
        const savedEstimation = await newEstimation.save();
        res.status(201).json(savedEstimation);
    } catch (error) {
        res.status(500).json({ message: 'Error creating estimation', error });
    }
};

export const updateEstimation = async (req: Request, res: Response) => {
    try {
        const updatedEstimation = await Estimation.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json(updatedEstimation);
    } catch (error) {
        res.status(500).json({ message: 'Error updating estimation', error });
    }
};

export const deleteEstimation = async (req: Request, res: Response) => {
    try {
        await Estimation.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Estimation deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting estimation', error });
    }
};
