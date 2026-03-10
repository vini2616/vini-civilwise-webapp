import { Request, Response } from 'express';
import Message from '../models/Message';
import { getAccessibleSiteIds } from '../utils/accessControl';
import { processFile } from '../utils/fileUpload';

export const sendMessage = async (req: Request, res: Response) => {
    try {
        const { siteId, content, type } = req.body;
        const senderId = String((req as any).user.id);
        const senderName = (req as any).user.name;

        // Verify access
        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(Number(siteId))) {
            return res.status(403).json({ message: 'Access denied for this site' });
        }

        let finalContent = content;
        if (type === 'image' || type === 'file') {
            finalContent = processFile(content, req, 'messages');
        }

        const message = await Message.create({
            siteId,
            senderId,
            senderName,
            content: finalContent,
            type: type || 'text'
        });

        res.status(201).json(message);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const getMessages = async (req: Request, res: Response) => {
    try {
        const { siteId, limit } = req.query;

        if (!siteId) {
            return res.status(400).json({ message: 'Site ID is required' });
        }

        // Verify access
        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(Number(siteId))) {
            return res.status(403).json({ message: 'Access denied for this site' });
        }

        const messages = await Message.findAll({
            where: { siteId: Number(siteId) },
            order: [['timestamp', 'DESC']], // Get newest first
            limit: limit ? Number(limit) : 50
        });

        // Reverse to show oldest first in chat UI usually, but API returns latest first for pagination often.
        // Let's return as is (newest first) and let FE reverse if needed, or reverse here.
        // Returning newest first is standard for "load more" pagination.
        res.status(200).json(messages);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
