import express from 'express';
import { getContacts, createContact, deleteContact } from '../controllers/contactController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/:siteId', protect, getContacts);
router.post('/', protect, createContact);
router.delete('/:id', protect, deleteContact);

export default router;
