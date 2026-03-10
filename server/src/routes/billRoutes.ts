import express from 'express';
import { createBill, getBills, getBillById, updateBill, deleteBill } from '../controllers/billController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', protect, createBill);
router.get('/', protect, getBills);
router.get('/:id', protect, getBillById);
router.put('/:id', protect, updateBill);
router.delete('/:id', protect, deleteBill);

export default router;
