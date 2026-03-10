import express from 'express';
import { getAttendance, createAttendance, updateAttendance, deleteAttendance } from '../controllers/attendanceController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/:siteId', protect, getAttendance);
router.post('/', protect, createAttendance);
router.put('/:id', protect, updateAttendance);
router.delete('/:id', protect, deleteAttendance);

export default router;
