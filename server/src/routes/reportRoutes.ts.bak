import express from 'express';
import { getReports, createReport, deleteReport, updateReport } from '../controllers/reportController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/')
    .get(protect, getReports)
    .post(protect, createReport);

router.route('/:id')
    .put(protect, updateReport)
    .delete(protect, deleteReport);

export default router;
