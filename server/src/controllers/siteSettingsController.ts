import { Request, Response } from 'express';
import SiteSettings from '../models/SiteSettings';
import { getAccessibleSiteIds } from '../utils/accessControl';

export const getSiteSettings = async (req: Request, res: Response) => {
    try {
        const { siteId } = req.query;

        if (!siteId) {
            return res.status(400).json({ message: 'Site ID is required' });
        }

        // Verify access
        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(Number(siteId))) {
            return res.status(403).json({ message: 'Access denied for this site' });
        }

        let settings = await SiteSettings.findOne({ where: { siteId: Number(siteId) } });

        if (!settings) {
            // Create default settings if not exists
            settings = await SiteSettings.create({
                siteId: Number(siteId),
                parties: [],
                suppliers: [],
                trades: [],
                materialNames: [],
                materialTypes: [],
                customCategories: [],
                units: [],
                billItems: []
            });
        }

        // Ensure JSON fields are parsed (fix for MySQL returning strings)
        const settingsJSON = settings.toJSON();
        const jsonFields = ['parties', 'suppliers', 'trades', 'materialNames', 'materialTypes', 'customCategories', 'units', 'billItems'];
        jsonFields.forEach((field: string) => {
            if (typeof (settingsJSON as any)[field] === 'string') {
                try {
                    (settingsJSON as any)[field] = JSON.parse((settingsJSON as any)[field]);
                } catch (e) {
                    console.error(`Failed to parse ${field}:`, e);
                    (settingsJSON as any)[field] = [];
                }
            }
        });

        res.status(200).json(settingsJSON);
    } catch (error: any) {
        console.error("Error in getSiteSettings:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const updateSiteSettings = async (req: Request, res: Response) => {
    try {
        let { siteId } = req.body;
        if (!siteId && req.query.siteId) {
            siteId = req.query.siteId;
        }

        const { parties, suppliers, trades, materialNames, materialTypes, customCategories, units, billItems } = req.body;
        console.log("Updating Site Settings Payload:", JSON.stringify(req.body));
        console.log("Updating Site Settings:", { siteId, partiesCount: parties?.length });

        if (!siteId) {
            return res.status(400).json({ message: 'Site ID is required' });
        }

        const id = Number(siteId);

        // Verify access
        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(id)) {
            return res.status(403).json({ message: 'Access denied for this site' });
        }

        let settings = await SiteSettings.findOne({ where: { siteId: id } });

        // Prepare dynamic update object for partial updates
        const updateData: any = {};
        if (parties !== undefined) updateData.parties = parties;
        if (suppliers !== undefined) updateData.suppliers = suppliers;
        if (trades !== undefined) updateData.trades = trades;
        if (materialNames !== undefined) updateData.materialNames = materialNames;
        if (materialTypes !== undefined) updateData.materialTypes = materialTypes;
        if (customCategories !== undefined) updateData.customCategories = customCategories;
        if (units !== undefined) updateData.units = units;
        if (billItems !== undefined) updateData.billItems = billItems;

        if (settings) {
            console.log("Updating existing settings with:", JSON.stringify(updateData));
            await settings.update(updateData);
        } else {
            console.log("Site Settings not found, creating new for siteId:", id);
            // For creation, we use the payload or defaults
            settings = await SiteSettings.create({
                siteId: id,
                parties: parties || [],
                suppliers: suppliers || [],
                trades: trades || [],
                materialNames: materialNames || [],
                materialTypes: materialTypes || [],
                customCategories: customCategories || [],
                units: units || [],
                billItems: billItems || []
            });
        }

        res.status(200).json(settings);
    } catch (error: any) {
        console.error("Error in updateSiteSettings:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
