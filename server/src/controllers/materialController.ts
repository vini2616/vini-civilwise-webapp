// @ts-nocheck
import { Request, Response } from 'express';
import Material from '../models/Material';
import { Op } from 'sequelize';
import { processFile } from '../utils/fileUpload';

export const getMaterials = async (req: Request, res: Response) => {
    try {
        const siteId = req.params.siteId || req.query.siteId;
        let whereClause: any = {};
        if (siteId) {
            whereClause.siteId = Number(siteId);
        }
        const materials = await Material.findAll({
            where: whereClause,
            order: [['date', 'DESC']],
            limit: 500, // Safety limit
            attributes: { exclude: ['challanImage'] } // Exclude heavy image data
        });
        res.json(materials);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export const getMaterialById = async (req: Request, res: Response) => {
    try {
        const material = await Material.findByPk(req.params.id);
        if (!material) return res.status(404).json({ message: 'Not found' });
        res.json(material);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export const createMaterial = async (req: Request, res: Response) => {
    try {
        console.log("Create Material Body:", JSON.stringify(req.body));

        // Strict payload construction to avoid ID injection
        const safeData: any = {
            siteId: req.body.siteId,
            name: req.body.name,
            type: req.body.type,
            unit: req.body.unit,
            quantity: req.body.quantity,
            date: req.body.date,
            supplier: req.body.supplier,
            challanImage: processFile(req.body.challanImage, req, 'materials'),
            notes: req.body.notes,
            usedFor: req.body.usedFor,
            source: req.body.source
        };

        const material = await Material.create(safeData);
        res.status(201).json(material);
    } catch (error: any) {
        console.error("Create Material Error:", error);
        res.status(500).json({ message: error.message });
    }
};

export const updateMaterial = async (req: Request, res: Response) => {
    try {
        const material = await Material.findByPk(req.params.id);
        if (material) {
            // Security: Data Entry users can only edit within 30 mins
            const user = (req as any).user;
            const globalPerm = user.permission ? user.permission.trim() : '';
            // Check module perm too if needed, but safe to assume data_entry restriction applies if not full_control
            if (globalPerm === 'data_entry' || user.modulePermissions?.materials === 'data_entry') {
                const created = new Date(material.createdAt).getTime();
                const now = Date.now();
                const diffMins = (now - created) / 1000 / 60;
                if (diffMins > 30) {
                    return res.status(403).json({ message: 'Restricted: Time limit exceeded for editing.' });
                }
            }

            if (req.body.challanImage) {
                req.body.challanImage = processFile(req.body.challanImage, req, 'materials');
            }
            await material.update(req.body);
            res.json(material);
        } else {
            res.status(404).json({ message: 'Material not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export const deleteMaterial = async (req: Request, res: Response) => {
    try {
        const material = await Material.findByPk(req.params.id);
        if (material) {
            // Security: Data Entry users can only delete within 30 mins
            const user = (req as any).user;
            const globalPerm = user.permission ? user.permission.trim() : '';

            if (globalPerm === 'data_entry' || user.modulePermissions?.materials === 'data_entry') {
                const created = new Date(material.createdAt).getTime();
                const now = Date.now();
                const diffMins = (now - created) / 1000 / 60;
                if (diffMins > 30) {
                    return res.status(403).json({ message: 'Restricted: Time limit exceeded for deleting.' });
                }
            }

            await material.destroy();
            res.json({ message: 'Material removed' });
        } else {
            res.status(404).json({ message: 'Material not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
