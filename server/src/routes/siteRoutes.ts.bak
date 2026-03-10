import express from 'express';
import { getSites, createSite, deleteSite, restoreSite, getDeletedSites, restoreSiteFromTrash, updateSite } from '../controllers/siteController'; // Updated import
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

console.log('LOADING SITE ROUTES');

router.get('/deleted', protect, getDeletedSites); // New route - Moved to top
router.post('/restore-trash/:id', protect, restoreSiteFromTrash); // New route - Moved to top

router.route('/').get(protect, getSites).post(protect, createSite);
router.route('/:id').delete(protect, deleteSite).put(protect, updateSite);
router.route('/restore').post(protect, restoreSite);

export default router;
