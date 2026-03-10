import express from 'express';
import {
    createManpower, getManpower, updateManpower, deleteManpower,
    markAttendance, getAttendance,
    addPayment, getPayments, deletePayment
} from '../controllers/manpowerController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Manpower CRUD
router.post('/', protect, createManpower);
router.get('/', protect, getManpower);
router.put('/:id', protect, updateManpower);
router.delete('/:id', protect, deleteManpower);

// Attendance
router.post('/attendance', protect, markAttendance);
router.get('/attendance', protect, getAttendance);

// Payments
router.post('/payments', protect, addPayment);
router.get('/payments', protect, getPayments);
router.delete('/payments/:id', protect, deletePayment);

export default router;
