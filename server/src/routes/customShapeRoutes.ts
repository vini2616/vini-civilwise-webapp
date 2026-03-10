import express from 'express';
import { createCustomShape, getCustomShapes, deleteCustomShape, updateCustomShape } from '../controllers/customShapeController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', protect, createCustomShape);
router.get('/', protect, getCustomShapes);
router.put('/:id', protect, updateCustomShape);
router.delete('/:id', protect, deleteCustomShape);

export default router;
