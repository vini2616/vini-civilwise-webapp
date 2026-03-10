import express from 'express';
import { getInventory, createInventoryItem, updateInventoryItem, deleteInventoryItem } from '../controllers/inventoryController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/:siteId', protect, getInventory);
router.post('/', protect, createInventoryItem);
router.put('/:id', protect, updateInventoryItem);
router.delete('/:id', protect, deleteInventoryItem);

export default router;
