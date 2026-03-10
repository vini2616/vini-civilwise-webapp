import { Request, Response } from 'express';
import DocumentModel from '../models/Document';
import DocumentChunk from '../models/DocumentChunk';
import { getAccessibleSiteIds } from '../utils/accessControl';
import fs from 'fs';
import path from 'path';
import { processFile } from '../utils/fileUpload';

export const createDocument = async (req: Request, res: Response) => {
    try {
        console.log("createDocument called");
        const { siteId, name, type, category } = req.body;
        let { size, url } = req.body;

        if (req.file) {
            console.log(`Processing file upload: ${req.file.originalname}, Path: ${req.file.filename}`);
            // Use relative path matching the static serve setup
            url = `/uploads/${req.file.filename}`;
            size = req.file.size;
        } else if (url) {
            // Handle Base64 URL
            url = processFile(url, req, 'documents');
        }

        console.log(`Creating document. Name: ${name}, Size: ${size}, URL: ${url}`);

        const uploadedBy = (req as any).user.name || 'Unknown';

        // Verify access
        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(Number(siteId))) {
            return res.status(403).json({ message: 'Access denied for this site' });
        }

        const doc = await DocumentModel.create({
            siteId,
            name,
            originalName: (req.file?.originalname) || req.body.originalName || name,
            type,
            size,
            url,
            uploadedBy,
            category: category || 'general'
        });

        res.status(201).json(doc);
    } catch (error: any) {
        console.error("Error in createDocument:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const getDocuments = async (req: Request, res: Response) => {
    try {
        const { siteId, category } = req.query;

        // Verify access
        const accessibleSites = await getAccessibleSiteIds((req as any).user);

        let where: any = {};
        if (siteId) {
            if (!accessibleSites.includes(Number(siteId))) {
                return res.status(403).json({ message: 'Access denied for this site' });
            }
            where.siteId = siteId;
        } else {
            where.siteId = accessibleSites;
        }

        if (category) {
            where.category = category;
        }

        const docs = await DocumentModel.findAll({
            where,
            order: [['uploadedAt', 'DESC']],
            limit: 100, // Limit list size
            attributes: ['id', 'siteId', 'name', 'originalName', 'type', 'size', 'uploadedBy', 'uploadedAt', 'category', 'url']
        });

        // Optimize payload: Don't send full base64 URLs or reassembled chunks in list view
        const payload = docs.map((d: any) => {
            const docJson = d.toJSON();
            // If URL is base64 (long) or 'CHUNKED', explicitly exclude it from list view
            // Only keep it if it's a short file path (e.g. /uploads/file.pdf)
            if (docJson.url && (docJson.url === 'CHUNKED' || docJson.url.length > 500)) {
                docJson.url = null; // Client must fetch details to get content
                docJson.isHeavy = true; // Flag for UI
            }
            return docJson;
        });

        res.status(200).json(payload);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const getDocument = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const doc = await DocumentModel.findByPk(id, {
            include: [{
                model: DocumentChunk,
                as: 'chunks',
                attributes: ['chunkIndex', 'data']
            }]
        });

        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Verify access - Check if user has access to the site this doc belongs to
        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(doc.siteId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const docJson = doc.toJSON() as any;

        // Reassemble chunks if needed
        if (docJson.url === 'CHUNKED' && docJson.chunks && docJson.chunks.length > 0) {
            // Sort chunks by index and join
            docJson.chunks.sort((a: any, b: any) => a.chunkIndex - b.chunkIndex);
            docJson.url = docJson.chunks.map((c: any) => c.data).join('');
            delete docJson.chunks;
        }

        res.status(200).json(docJson);
    } catch (error: any) {
        console.error("GetDocument Error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const deleteDocument = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const doc = await DocumentModel.findByPk(id);

        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Verify access
        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(doc.siteId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Delete from filesystem if it's a file path (starts with /uploads)
        if (doc.url && doc.url.startsWith('/uploads/')) {
            try {
                // Construct absolute path
                const filename = doc.url.split('/').pop();
                if (filename) {
                    const filePath = path.join(process.cwd(), 'uploads', filename);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log("Deleted file:", filePath);
                    }
                }
            } catch (err) {
                console.error("Failed to delete file from disk:", err);
            }
        }

        await doc.destroy();
        res.status(200).json({ message: 'Document deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
