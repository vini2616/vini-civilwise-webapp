import express from 'express';
import { getChecklists, createChecklist, updateChecklist, deleteChecklist } from '../controllers/checklistController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/:siteId', protect, getChecklists);
router.post('/', protect, createChecklist);
router.put('/:id', protect, updateChecklist);
router.delete('/:id', protect, deleteChecklist);

export default router;
