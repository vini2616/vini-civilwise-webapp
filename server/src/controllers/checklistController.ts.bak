import { Request, Response } from 'express';
import Checklist from '../models/Checklist';
import { verifySiteAccess } from '../utils/accessControl';

// @desc    Get all checklists for a site
// @route   GET /api/checklists/:siteId
// @access  Private
export const getChecklists = async (req: Request, res: Response) => {
    try {
        const { siteId } = req.params;
        // @ts-ignore
        const user = req.user;

        const hasAccess = await verifySiteAccess(user, siteId);
        if (!hasAccess) {
            res.status(403).json({ message: 'Not authorized to view checklists for this site' });
            return;
        }

        const checklists = await Checklist.find({ siteId: siteId as any }).sort({ createdAt: -1 });
        res.json(checklists);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a new checklist
// @route   POST /api/checklists
// @access  Private
export const createChecklist = async (req: Request, res: Response) => {
    try {
        const { siteId, name, type, category, items, status, date } = req.body;
        // @ts-ignore
        const user = req.user;

        if (siteId) {
            const hasAccess = await verifySiteAccess(user, siteId);
            if (!hasAccess) {
                res.status(403).json({ message: 'Not authorized to create checklists for this site' });
                return;
            }
        } else {
            res.status(400).json({ message: 'Site ID is required' });
            return;
        }

        const checklist = await Checklist.create({
            siteId,
            name,
            type,
            category,
            items,
            status,
            date
        });

        res.status(201).json(checklist);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update a checklist
// @route   PUT /api/checklists/:id
// @access  Private
export const updateChecklist = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // @ts-ignore
        const user = req.user;

        const checklist = await Checklist.findById(id);

        if (!checklist) {
            res.status(404).json({ message: 'Checklist not found' });
            return;
        }

        const hasAccess = await verifySiteAccess(user, checklist.siteId.toString());
        if (!hasAccess) {
            res.status(403).json({ message: 'Not authorized to update this checklist' });
            return;
        }

        const updatedChecklist = await Checklist.findByIdAndUpdate(id, req.body, { new: true });
        res.json(updatedChecklist);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete a checklist
// @route   DELETE /api/checklists/:id
// @access  Private
export const deleteChecklist = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // @ts-ignore
        const user = req.user;

        const checklist = await Checklist.findById(id);

        if (!checklist) {
            res.status(404).json({ message: 'Checklist not found' });
            return;
        }

        const hasAccess = await verifySiteAccess(user, checklist.siteId.toString());
        if (!hasAccess) {
            res.status(403).json({ message: 'Not authorized to delete this checklist' });
            return;
        }

        await checklist.deleteOne();
        res.json({ message: 'Checklist removed' });
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
