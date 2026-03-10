import express from 'express';
import {
    getCustomShapes,
    createCustomShape,
    updateCustomShape,
    deleteCustomShape
} from '../controllers/customShapeController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/')
    .post(protect, createCustomShape);

router.route('/:id')
    .put(protect, updateCustomShape)
    .delete(protect, deleteCustomShape);

router.route('/:siteId')
    .get(protect, getCustomShapes);

export default router;
