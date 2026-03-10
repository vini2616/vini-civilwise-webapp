import express from 'express';
import { registerUser, loginUser, createUser, getUsers, assignUserToSite, removeUserFromSite, deleteUser, updateUser, verifyUser } from '../controllers/authController';

import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/create-user', protect, createUser);
router.get('/users', protect, getUsers);
router.post('/assign-site', protect, assignUserToSite);
router.post('/remove-site', protect, removeUserFromSite);
router.delete('/users/:id', protect, deleteUser);
router.put('/users/:id', protect, updateUser);
router.get('/verify', protect, verifyUser);

export default router;
