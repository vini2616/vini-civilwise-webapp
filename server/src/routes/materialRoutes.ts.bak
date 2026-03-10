import express from 'express';
import { getMaterials, createMaterial, updateMaterial, deleteMaterial, deleteMaterialsByDPR } from '../controllers/materialController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.delete('/dpr', protect, deleteMaterialsByDPR); // Use query param ?dprId=...
router.get('/:siteId', protect, getMaterials);
router.post('/', protect, createMaterial);
router.put('/:id', protect, updateMaterial);
router.delete('/:id', protect, deleteMaterial);

export default router;
