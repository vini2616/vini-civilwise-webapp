import { Request, Response } from 'express';
import Company from '../models/Company';
import { Op } from 'sequelize';
import { exportCompanyData, restoreData } from '../services/archiveService';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

export const getCompanies = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const userId = user.id;

        console.log(`[getCompanies] User: ${user.username}, ID: ${userId}, Role: ${user.role}`);
        console.log(`[getCompanies] Primary CompanyID: ${user.companyId}`);
        console.log(`[getCompanies] Companies List:`, user.companies);

        // Find companies owned by user OR where user is a member
        // Since we only have companyId on User, we can logic:
        // 1. Owned companies
        // 2. The company the user belongs to (if any)
        // 3. Companies in the user.companies list

        let where: any = {
            deletedAt: null,
            [Op.or]: [
                { ownerId: userId }
            ]
        };

        // Super Master Access - Only 'vini' sees EVERYTHING
        if (user.username === 'vini') {
            where = { deletedAt: null };
        } else {
            // Everyone else (including other Super Admins) sees only their assigned company
            // or companies they own.

            // Primary Company
            if (user.companyId) {
                where[Op.or].push({ id: user.companyId });
            }

            // Additional Companies (via Import/Assignment)
            if (user.companies && Array.isArray(user.companies) && user.companies.length > 0) {
                console.log(`[getCompanies] Adding additional companies to query:`, user.companies);
                where[Op.or].push({ id: { [Op.in]: user.companies } });
            }
        }

        // console.log(`[getCompanies] Query Where:`, JSON.stringify(where, null, 2));

        const companies = await Company.findAll({ where });
        res.json(companies);
    } catch (error: any) {
        console.error("Get Companies Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const createCompany = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        if (user.username !== 'vini') {
            return res.status(403).json({ message: 'Only Super Admin Vini can create companies' });
        }

        const { name, address, gst, mobile, email, website, accountHolderName, bankName, accountNumber, ifscCode, branch } = req.body;

        const company = await Company.create({
            name,
            address: address || 'Head Office',
            gst,
            mobile,
            email,
            website,
            accountHolderName,
            bankName,
            accountNumber,
            ifscCode,
            branch,
            ownerId: user.id
        });

        res.status(201).json(company);
    } catch (error: any) {
        console.error("Create Company Error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const updateCompany = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const company = await Company.findByPk(id);

        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        const user = (req as any).user;
        // Check ownership or Master Admin
        if (company.ownerId !== user.id && user.username !== 'vini') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await company.update(req.body);
        res.json(company);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export const deleteCompany = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const company = await Company.findByPk(id);

        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        const user = (req as any).user;
        if (user.username !== 'vini') {
            return res.status(403).json({ message: 'Only Super Admin Vini can delete companies' });
        }

        // Generate Archive
        try {
            const archive = await exportCompanyData(company.id);

            // Soft delete
            await company.update({
                deletedAt: new Date(),
                permanentDeleteAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
            });

            // Send Zip
            res.attachment(`company_backup_${company.id}.zip`);
            archive.pipe(res);
            await archive.finalize();

        } catch (err) {
            console.error("Archive generation failed:", err);
            if (!res.headersSent) {
                // Perform soft delete even if archive fails
                if (!company.deletedAt) {
                    await company.update({
                        deletedAt: new Date(),
                        permanentDeleteAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
                    });
                }
                res.json({ message: 'Company deleted successfully (Backup generation failed)' });
            }
        }
    } catch (error: any) {
        console.error("Delete Company Error:", error);
        if (!res.headersSent) res.status(500).json({ message: 'Server Error' });
    }
};

export const restoreCompany = [
    upload.single('backup'),
    async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            if (user.username !== 'vini') {
                return res.status(403).json({ message: 'Only Super Admin Vini can restore companies' });
            }

            if (!req.file) {
                return res.status(400).json({ message: 'No backup file uploaded' });
            }

            const results = await restoreData(req.file.buffer);
            res.json({
                message: `Restore completed. Sites: ${results.restoredSites}, Data Items: ${results.restoredCollections}`,
                results
            });
        } catch (error) {
            console.error("Restore Company Error:", error);
            res.status(500).json({ message: 'Restore failed', error: error.message });
        }
    }
];

export const getDeletedCompanies = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        let where: any = {
            deletedAt: { [Op.ne]: null }
        };

        if (user.username !== 'vini') {
            where.ownerId = user.id;
        }

        const companies = await Company.findAll({ where });
        res.json(companies);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export const restoreCompanyFromTrash = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const company = await Company.findByPk(id);

        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        const user = (req as any).user;
        if (company.ownerId !== user.id && user.username !== 'vini') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await company.update({ deletedAt: null, permanentDeleteAt: null });
        res.json(company);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error' });
    }
};
