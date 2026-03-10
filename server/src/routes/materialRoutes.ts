import express from 'express';
import { getMaterials, createMaterial, updateMaterial, deleteMaterial, getMaterialById } from '../controllers/materialController';
import { protect, checkPermission } from '../middleware/authMiddleware';

const router = express.Router();

// router.delete('/dpr', protect, deleteMaterialsByDPR); // DPR not migrated yet
router.get('/', protect, checkPermission('materials'), getMaterials); // Support ?siteId=...
router.get('/detail/:id', protect, checkPermission('materials'), getMaterialById); // New Detail endpoint
router.get('/:siteId', protect, checkPermission('materials'), getMaterials); // Support /:siteId (This is greedy!)
router.post('/', protect, checkPermission('materials'), createMaterial);
router.put('/:id', protect, checkPermission('materials'), updateMaterial);
router.delete('/:id', protect, checkPermission('materials'), deleteMaterial);

export default router;
