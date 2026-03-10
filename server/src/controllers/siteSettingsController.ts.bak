import { Request, Response } from 'express';
import SiteSettings from '../models/SiteSettings';

// @desc    Get site settings (trades, material names, etc.)
// @route   GET /api/site-settings
// @access  Private
export const getSiteSettings = async (req: Request, res: Response) => {
    try {
        const { siteId } = req.query;

        if (!siteId || typeof siteId !== 'string') {
            return res.status(400).json({ message: 'Site ID is required' });
        }

        let settings: any = await SiteSettings.findOne({ siteId: siteId as any });

        if (!settings) {
            // Create default if not exists
            const newSettings = {
                siteId: siteId as any,
                parties: [],
                suppliers: [],
                trades: [],
                materialNames: [],
                materialTypes: ['Concrete', 'Steel', 'Brick', 'Sand', 'Other'],
                customCategories: [],
                units: [],
                billItems: []
            };

            settings = await SiteSettings.create(newSettings as any);
        }

        res.status(200).json(settings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching site settings' });
    }
};

// @desc    Update site settings
// @route   PUT /api/site-settings
// @access  Private
export const updateSiteSettings = async (req: Request, res: Response) => {
    try {
        const { siteId } = req.query;
        const updates = req.body;

        if (!siteId || typeof siteId !== 'string') {
            return res.status(400).json({ message: 'Site ID is required' });
        }

        let settings: any = await SiteSettings.findOne({ siteId: siteId as any });

        if (!settings) {
            settings = await SiteSettings.create({
                siteId: siteId as any,
                ...updates
            } as any);
        } else {
            // Update fields provided in body
            if (updates.parties) settings.parties = updates.parties;
            if (updates.suppliers) settings.suppliers = updates.suppliers;
            if (updates.trades) settings.trades = updates.trades;
            if (updates.materialNames) settings.materialNames = updates.materialNames;
            if (updates.materialTypes) settings.materialTypes = updates.materialTypes;
            if (updates.materialTypes) settings.materialTypes = updates.materialTypes;
            if (updates.customCategories) settings.customCategories = updates.customCategories;
            if (updates.units) settings.units = updates.units;
            if (updates.billItems) settings.billItems = updates.billItems;

            await settings.save();
        }

        res.status(200).json(settings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating site settings' });
    }
};
