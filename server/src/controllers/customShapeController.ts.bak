import { Request, Response } from 'express';
import CustomShape from '../models/CustomShape';
import { verifySiteAccess } from '../utils/accessControl';

// @desc    Get all custom shapes for a site
// @route   GET /api/custom-shapes/:siteId
// @access  Private
export const getCustomShapes = async (req: Request, res: Response) => {
    try {
        const { siteId } = req.params;
        // @ts-ignore
        const user = req.user;

        const hasAccess = await verifySiteAccess(user, siteId);
        if (!hasAccess) {
            res.status(403).json({ message: 'Not authorized to view shapes for this site' });
            return;
        }

        const shapes = await CustomShape.find({ siteId: siteId as any }).sort({ createdAt: -1 });
        res.json(shapes);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a new custom shape
// @route   POST /api/custom-shapes
// @access  Private
export const createCustomShape = async (req: Request, res: Response) => {
    try {
        const { siteId, name, description, type, segments, deductions } = req.body;
        // @ts-ignore
        const user = req.user;

        if (siteId) {
            const hasAccess = await verifySiteAccess(user, siteId);
            if (!hasAccess) {
                res.status(403).json({ message: 'Not authorized to create shapes for this site' });
                return;
            }
        } else {
            res.status(400).json({ message: 'Site ID is required' });
            return;
        }

        const shape = await CustomShape.create({
            siteId,
            name,
            description,
            type,
            segments,
            deductions
        });

        res.status(201).json(shape);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update a custom shape
// @route   PUT /api/custom-shapes/:id
// @access  Private
export const updateCustomShape = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // @ts-ignore
        const user = req.user;

        const shape = await CustomShape.findById(id);

        if (!shape) {
            res.status(404).json({ message: 'Shape not found' });
            return;
        }

        const hasAccess = await verifySiteAccess(user, shape.siteId.toString());
        if (!hasAccess) {
            res.status(403).json({ message: 'Not authorized to update this shape' });
            return;
        }

        const updatedShape = await CustomShape.findByIdAndUpdate(id, req.body, { new: true });
        res.json(updatedShape);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete a custom shape
// @route   DELETE /api/custom-shapes/:id
// @access  Private
export const deleteCustomShape = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // @ts-ignore
        const user = req.user;

        const shape = await CustomShape.findById(id);

        if (!shape) {
            res.status(404).json({ message: 'Shape not found' });
            return;
        }

        const hasAccess = await verifySiteAccess(user, shape.siteId.toString());
        if (!hasAccess) {
            res.status(403).json({ message: 'Not authorized to delete this shape' });
            return;
        }

        await shape.deleteOne();
        res.json({ message: 'Shape removed' });
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
