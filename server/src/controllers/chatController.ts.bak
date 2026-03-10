import { Request, Response } from 'express';
import Message from '../models/Message';

// @desc    Get all messages for a site
// @route   GET /api/chat
// @access  Private
export const getMessages = async (req: any, res: Response) => {
    try {
        const siteId = req.user.activeSite; // Assuming middleware sets activeSite on user or we get it from headers/query

        // If siteId is not directly on user in middleware, check if passed in query
        const targetSiteId = siteId || req.query.siteId;

        if (!targetSiteId) {
            return res.status(400).json({ message: 'Site ID is required' });
        }

        const messages = await Message.find({ siteId: targetSiteId }).sort({ timestamp: 1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Send a message
// @route   POST /api/chat
// @access  Private
export const sendMessage = async (req: any, res: Response) => {
    try {
        const { content, type, senderName } = req.body;
        const siteId = req.user.activeSite || req.body.siteId;

        if (!siteId) {
            return res.status(400).json({ message: 'Site ID is required' });
        }

        const newMessage = new Message({
            siteId,
            senderId: req.user._id,
            senderName: req.user.name || senderName,
            content,
            type: type || 'text',
            timestamp: new Date()
        });

        const savedMessage = await newMessage.save();
        res.status(201).json(savedMessage);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Update a message
// @route   PUT /api/chat/:id
// @access  Private
export const updateMessage = async (req: any, res: Response) => {
    try {
        const { content } = req.body;
        const message = await Message.findById(req.params.id);

        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        // Allow update only by sender
        if (message.senderId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized to edit this message' });
        }

        message.content = content || message.content;
        const updatedMessage = await message.save();
        res.json(updatedMessage);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Delete a message
// @route   DELETE /api/chat/:id
// @access  Private
export const deleteMessage = async (req: any, res: Response) => {
    try {
        const message = await Message.findById(req.params.id);

        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        // Allow deletion only by sender or Admin
        if (message.senderId.toString() !== req.user._id.toString() && req.user.role !== 'Admin' && req.user.role !== 'Owner') {
            return res.status(401).json({ message: 'Not authorized to delete this message' });
        }

        await message.deleteOne();
        res.json({ message: 'Message removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};
