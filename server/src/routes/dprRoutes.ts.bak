import express from 'express';
import { createDPR, getDPRs, updateDPR, deleteDPR } from '../controllers/dprController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/')
    .post(protect, createDPR);

router.route('/:siteId')
    .get(protect, getDPRs);

router.route('/:id')
    .put(protect, updateDPR)
    .delete(protect, deleteDPR);

export default router;
