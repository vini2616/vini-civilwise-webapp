import express from 'express';
import { getSiteSettings, updateSiteSettings } from '../controllers/siteSettingsController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Uses query param ?siteId=... for GET, body { siteId, ... } for POST/PUT
router.get('/', protect, getSiteSettings);
router.post('/', protect, updateSiteSettings); // Can be used for create or update
router.put('/', protect, updateSiteSettings);

export default router;
