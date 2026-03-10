import { Request, Response } from 'express';
import DPR from '../models/DPR';
import { verifySiteAccess } from '../utils/accessControl';

// @desc    Create new DPR
// @route   POST /api/dpr
// @access  Private
export const createDPR = async (req: Request, res: Response) => {
    try {
        const { siteId, projectInfo, manpower, workStarted, equipment, materials, work, reconciliation, planTomorrow, remarks, signatures, photos } = req.body;

        console.log("CREATE DPR BODY:", JSON.stringify({ siteId, manpowerLength: manpower?.length, materialsLength: materials?.length })); // DEBUG

        // @ts-ignore
        const user = req.user;

        // Verify site access
        if (siteId) {
            const hasAccess = await verifySiteAccess(user, siteId);
            if (!hasAccess) {
                res.status(403).json({ message: 'Not authorized to create DPR for this site' });
                return;
            }
        } else {
            res.status(400).json({ message: 'Site ID is required' });
            return;
        }

        const dpr = new DPR({
            siteId,
            userId: user._id,
            projectInfo,
            manpower,
            workStarted,
            equipment,
            materials,
            work,
            reconciliation,
            planTomorrow,
            remarks,
            signatures,
            photos
        });

        const createdDPR = await dpr.save();
        res.status(201).json(createdDPR);
    } catch (error: any) {
        console.error("Error creating DPR:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get DPRs for a site
// @route   GET /api/dpr/:siteId
// @access  Private
export const getDPRs = async (req: Request, res: Response) => {
    try {
        const { siteId } = req.params;
        // @ts-ignore
        const user = req.user;

        const hasAccess = await verifySiteAccess(user, siteId);
        if (!hasAccess) {
            res.status(403).json({ message: 'Not authorized to view DPRs for this site' });
            return;
        }

        const dprs = await DPR.find({ siteId: siteId as any }).sort({ 'projectInfo.date': -1 });
        res.json(dprs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update DPR
// @route   PUT /api/dpr/:id
// @access  Private
export const updateDPR = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        console.log("UPDATE DPR BODY:", JSON.stringify({ id, manpowerLength: req.body.manpower?.length })); // DEBUG
        // @ts-ignore
        const user = req.user;

        const dpr = await DPR.findById(id);

        if (!dpr) {
            res.status(404).json({ message: 'DPR not found' });
            return;
        }

        // Verify site access (ensure user still has access to the site this DPR belongs to)
        const hasAccess = await verifySiteAccess(user, dpr.siteId.toString());
        if (!hasAccess) {
            res.status(403).json({ message: 'Not authorized to update this DPR' });
            return;
        }

        // Update fields
        const updatedDPR = await DPR.findByIdAndUpdate(id, req.body, { new: true });
        res.json(updatedDPR);

    } catch (error: any) {
        console.error("Error updating DPR:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete DPR
// @route   DELETE /api/dpr/:id
// @access  Private
export const deleteDPR = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // @ts-ignore
        const user = req.user;

        const dpr = await DPR.findById(id);

        if (!dpr) {
            res.status(404).json({ message: 'DPR not found' });
            return;
        }

        const hasAccess = await verifySiteAccess(user, dpr.siteId.toString());
        if (!hasAccess) {
            res.status(403).json({ message: 'Not authorized to delete this DPR' });
            return;
        }

        await dpr.deleteOne();
        res.json({ message: 'DPR removed' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
