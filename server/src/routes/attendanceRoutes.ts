import express from 'express';
import { createAttendance, getAttendance, deleteAttendance } from '../controllers/attendanceController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', protect, createAttendance);
router.get('/', protect, getAttendance);
router.delete('/:id', protect, deleteAttendance);

export default router;
