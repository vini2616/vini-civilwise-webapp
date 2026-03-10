import express from 'express';
import { getMessages, sendMessage, deleteMessage, updateMessage } from '../controllers/chatController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/')
    .get(protect, getMessages)
    .post(protect, sendMessage);

router.route('/:id')
    .put(protect, updateMessage)
    .delete(protect, deleteMessage);

export default router;
