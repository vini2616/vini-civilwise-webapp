import express from 'express';
import { createReport, getReports, getReportById, updateReport, deleteReport } from '../controllers/reportController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', protect, createReport);
router.get('/', protect, getReports);
router.get('/:id', protect, getReportById);
router.put('/:id', protect, updateReport);
router.delete('/:id', protect, deleteReport);

export default router;
