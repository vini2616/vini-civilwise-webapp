import express from 'express';
import {
    getSites,
    createSite,
    updateSite,
    deleteSite,
    restoreSite,
    getDeletedSites,
    restoreSiteFromTrash
} from '../controllers/siteController'; // Ensure this points to the new file, not .bak

import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getSites);
router.post('/', protect, createSite);
router.put('/:id', protect, updateSite);
router.delete('/:id', protect, deleteSite);

// Restore from backup file
router.post('/restore', protect, restoreSite);

// Trash management
router.get('/deleted', protect, getDeletedSites);
router.post('/restore-trash/:id', protect, restoreSiteFromTrash);

export default router;
