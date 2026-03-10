import express from 'express';
import { sendMessage, getMessages } from '../controllers/messageController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', protect, sendMessage);
router.get('/', protect, getMessages);

export default router;
