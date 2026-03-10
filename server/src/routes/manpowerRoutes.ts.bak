import express from 'express';
import { protect } from '../middleware/authMiddleware';
import {
    getResources, createResource, updateResource, deleteResource,
    getAttendance, saveAttendance,
    getPayments, createPayment, deletePayment
} from '../controllers/manpowerController';

const router = express.Router();

// Resources (Manpower)
router.get('/resources', protect, getResources);
router.post('/resources', protect, createResource);
router.put('/resources/:id', protect, updateResource);
router.delete('/resources/:id', protect, deleteResource);

// Attendance
router.get('/attendance', protect, getAttendance);
router.post('/attendance', protect, saveAttendance); // Used for both create and update (Upsert)

// Payments
router.get('/payments', protect, getPayments);
router.post('/payments', protect, createPayment);
router.delete('/payments/:id', protect, deletePayment);

export default router;
