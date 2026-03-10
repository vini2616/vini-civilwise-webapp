import express from 'express';
import { createEstimation, getEstimations, getEstimationById, updateEstimation, deleteEstimation } from '../controllers/estimationController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', protect, createEstimation);
router.get('/', protect, getEstimations);
router.get('/:id', protect, getEstimationById);
router.put('/:id', protect, updateEstimation);
router.delete('/:id', protect, deleteEstimation);

export default router;
