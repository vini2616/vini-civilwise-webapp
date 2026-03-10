import express from 'express';
import { getBills, createBill, updateBill, deleteBill } from '../controllers/billController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/')
    .get(protect, getBills)
    .post(protect, createBill);

router.route('/:id')
    .put(protect, updateBill)
    .delete(protect, deleteBill);

export default router;
