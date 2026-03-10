import express from 'express';
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, getTransactionById } from '../controllers/transactionController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/').get(protect, getTransactions).post(protect, createTransaction);
router.route('/:id').get(protect, getTransactionById).put(protect, updateTransaction).delete(protect, deleteTransaction);

export default router;
