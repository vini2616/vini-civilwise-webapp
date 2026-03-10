import { Request, Response } from 'express';
import Doc from '../models/Document';

// @desc    Get all documents for a site
// @route   GET /api/documents
// @access  Private
export const getDocuments = async (req: any, res: Response) => {
    try {
        const siteId = req.user.activeSite || req.query.siteId;

        if (!siteId) {
            return res.status(400).json({ message: 'Site ID is required' });
        }

        const category = req.query.category;
        const query: any = { siteId };
        if (category) query.category = category;

        const documents = await Doc.find(query).select('-url').sort({ uploadedAt: -1 });
        res.json(documents);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Get single document
// @route   GET /api/documents/:id
// @access  Private
export const getDocumentById = async (req: any, res: Response) => {
    try {
        const doc = await Doc.findById(req.params.id);
        if (doc) {
            res.json(doc);
        } else {
            res.status(404).json({ message: 'Document not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Upload a document
// @route   POST /api/documents
// @access  Private
export const createDocument = async (req: any, res: Response) => {
    try {
        const { name, originalName, type, size, url, category } = req.body;
        const siteId = req.user.activeSite || req.body.siteId;

        if (!siteId) {
            return res.status(400).json({ message: 'Site ID is required' });
        }

        const newDoc = new Doc({
            siteId,
            name,
            originalName,
            type,
            size,
            url,
            uploadedBy: req.user._id,
            uploadedAt: new Date(),
            category: category || 'general'
        });

        const savedDoc = await newDoc.save();
        res.status(201).json(savedDoc);
    } catch (error: any) {
        console.error("Create Document Error:", error);
        res.status(500).json({ message: error.message || 'Server Error', error });
    }
};

// @desc    Delete a document
// @route   DELETE /api/documents/:id
// @access  Private
export const deleteDocument = async (req: any, res: Response) => {
    try {
        const doc = await Doc.findById(req.params.id);

        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }

        await doc.deleteOne();
        res.json({ message: 'Document removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};
