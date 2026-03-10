import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { getSiteSettings, updateSiteSettings } from '../controllers/siteSettingsController';

const router = express.Router();

router.route('/')
    .get(protect, getSiteSettings)
    .put(protect, updateSiteSettings);

export default router;
