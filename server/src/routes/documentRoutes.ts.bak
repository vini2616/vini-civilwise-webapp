import express from 'express';
import { getDocuments, createDocument, deleteDocument, getDocumentById } from '../controllers/documentController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/')
    .get(protect, getDocuments)
    .post(protect, createDocument);

router.route('/:id')
    .get(protect, getDocumentById)
    .delete(protect, deleteDocument);

export default router;
