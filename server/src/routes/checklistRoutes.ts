import express from 'express';
import { createChecklist, getChecklists, getChecklistById, updateChecklist, deleteChecklist } from '../controllers/checklistController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', protect, createChecklist);
router.get('/', protect, getChecklists);
router.get('/:id', protect, getChecklistById);
router.put('/:id', protect, updateChecklist);
router.delete('/:id', protect, deleteChecklist);

export default router;
