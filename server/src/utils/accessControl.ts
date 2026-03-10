import User from '../models/User';
import Site from '../models/Site';
import Company from '../models/Company';
import { Op } from 'sequelize';

export const getAccessibleSiteIds = async (user: any): Promise<number[]> => {
    // Ensure user.sites is treated as an array of IDs
    let sitesIdx: any = user.sites;
    if (typeof sitesIdx === 'string') {
        try {
            // If it starts with [ it is json array string
            if (sitesIdx.trim().startsWith('[')) {
                sitesIdx = JSON.parse(sitesIdx);
            } else {
                // Might be comma separated string?
                sitesIdx = sitesIdx.split(',').map((s: string) => Number(s.trim()));
            }
        } catch (e) {
            console.error('Error parsing user.sites:', e);
            sitesIdx = [];
        }
    }

    const userSiteIds: number[] = Array.isArray(sitesIdx) ? sitesIdx.map((s: any) => Number(s)) : [];

    if (user.username === 'vini' || user.role === 'Super Admin') {
        const sites = await Site.findAll({ attributes: ['id'] });
        return sites.map(s => s.id);
    }

    if (['Owner', 'Admin', 'Partner'].includes(user.role)) {
        // 1. Sites from the company the user is assigned to
        let assignedCompanySites: number[] = [];
        if (user.companyId) {
            const sites = await Site.findAll({
                where: { companyId: user.companyId },
                attributes: ['id']
            });
            assignedCompanySites = sites.map(s => s.id);
        }

        // 2. Sites from companies OWNED by this user (for multi-company owners)
        let ownedCompanySites: number[] = [];
        try {
            const ownedCompanies = await Company.findAll({
                where: { ownerId: user.id },
                attributes: ['id']
            });
            const ownedCompanyIds = ownedCompanies.map(c => c.id);

            if (ownedCompanyIds.length > 0) {
                const sites = await Site.findAll({
                    where: { companyId: { [Op.in]: ownedCompanyIds } },
                    attributes: ['id']
                });
                ownedCompanySites = sites.map(s => s.id);
            }
        } catch (e) {
            console.error("Error fetching owned company sites:", e);
        }

        // Combine
        const allSiteIds = [...userSiteIds, ...assignedCompanySites, ...ownedCompanySites];
        // Unique
        return [...new Set(allSiteIds)];
    } else {
        // Regular users
        return userSiteIds;
    }
};

export const verifySiteAccess = async (user: any, siteId: number | string): Promise<boolean> => {
    const accessibleSites = await getAccessibleSiteIds(user);
    return accessibleSites.includes(Number(siteId));
};
