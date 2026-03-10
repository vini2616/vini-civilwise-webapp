import express from 'express';
import { createDPR, getDPRs, getDPRById, updateDPR, deleteDPR } from '../controllers/dprController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', protect, createDPR);
router.get('/', protect, getDPRs);
router.get('/:id', protect, getDPRById);
router.put('/:id', protect, updateDPR);
router.delete('/:id', protect, deleteDPR);

export default router;
