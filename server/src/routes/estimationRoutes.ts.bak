import express from 'express';
import { getEstimations, createEstimation, updateEstimation, deleteEstimation } from '../controllers/estimationController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/:siteId', protect, getEstimations);
router.post('/', protect, createEstimation);
router.put('/:id', protect, updateEstimation);
router.delete('/:id', protect, deleteEstimation);

export default router;
