import express from 'express';
import { createContact, getContacts, getContactById, updateContact, deleteContact } from '../controllers/contactController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', protect, createContact);
router.get('/', protect, getContacts);
router.get('/:id', protect, getContactById);
router.put('/:id', protect, updateContact);
router.delete('/:id', protect, deleteContact);

export default router;
