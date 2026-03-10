import { Request, Response } from 'express';
import Company from '../models/Company';


import { exportCompanyData, restoreData } from '../services/archiveService';
import multer from 'multer';

const upload = multer();

export const getCompanies = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const user = req.user as any;
        console.log("getCompanies User:", user.name, user._id);
        console.log("User Companies:", user.companies);
        console.log("User CompanyID:", user.companyId);

        let query: any = { ownerId: user._id, deletedAt: null }; // Filter deleted

        // If user belongs to a company (employee), include that company too
        if (user.companyId || (user.companies && user.companies.length > 0)) {
            const companyIds = user.companies || [];
            if (user.companyId && !companyIds.includes(user.companyId)) {
                companyIds.push(user.companyId);
            }

            query = {
                $and: [
                    { deletedAt: null },
                    {
                        $or: [
                            { ownerId: user._id },
                            { _id: { $in: companyIds } }
                        ]
                    }
                ]
            };
        }

        const companies = await Company.find(query);
        res.json(companies);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export const createCompany = async (req: Request, res: Response) => {
    try {
        console.log("Create Company Request Body:", req.body);
        // @ts-ignore
        console.log("Create Company User:", req.user?._id);

        // @ts-ignore
        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: 'User not authenticated or found' });
        }

        const { name, address, gst, mobile, email, website, accountHolderName, bankName, accountNumber, ifscCode, branch } = req.body;
        const company = new Company({
            name,
            address: address || 'Head Office', // Default if empty to satisfy any lingering requirement or logical need
            gst,
            mobile,
            email,
            website,
            accountHolderName,
            bankName,
            accountNumber,
            ifscCode,
            branch,
            // @ts-ignore
            ownerId: req.user._id,
        });
        const createdCompany = await company.save();
        console.log("Company Created Successfully:", createdCompany);
        res.status(201).json(createdCompany);
    } catch (error: any) {
        console.error("Create Company Error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const deleteCompany = async (req: Request, res: Response) => {
    try {
        const company = await Company.findById(req.params.id);

        if (company) {
            // @ts-ignore
            if (company.ownerId.toString() === req.user._id.toString()) {

                // Export
                const archive = await exportCompanyData(company._id.toString()); // @ts-ignore

                // Soft Delete
                company.deletedAt = new Date();
                company.permanentDeleteAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
                await company.save();

                // Pipe Zip
                res.attachment(`${company.name}_backup.zip`);
                archive.pipe(res);
                archive.finalize();

            } else {
                res.status(401).json({ message: 'Not authorized' });
            }
        } else {
            res.status(404).json({ message: 'Company not found' });
        }
    } catch (error) {
        console.error(error);
        if (!res.headersSent) res.status(500).json({ message: 'Server Error' });
    }
};

export const updateCompany = async (req: Request, res: Response) => {
    try {
        const { name, address, gst, mobile, email, website, accountHolderName, bankName, accountNumber, ifscCode, branch } = req.body;
        const company = await Company.findById(req.params.id);

        if (company) {
            // @ts-ignore
            if (company.ownerId.toString() === req.user._id.toString()) {
                company.name = name || company.name;
                company.address = address || company.address;
                company.gst = gst || company.gst;
                company.mobile = mobile || company.mobile;
                company.email = email || company.email;
                company.website = website || company.website;
                company.accountHolderName = accountHolderName || company.accountHolderName;
                company.bankName = bankName || company.bankName;
                company.accountNumber = accountNumber || company.accountNumber;
                company.ifscCode = ifscCode || company.ifscCode;
                company.branch = branch || company.branch;

                const updatedCompany = await company.save();
                res.json(updatedCompany);
            } else {
                res.status(401).json({ message: 'Not authorized' });
            }
        } else {
            res.status(404).json({ message: 'Company not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};


export const restoreCompany = [
    upload.single('backup'),
    async (req: Request, res: Response) => {
        try {
            if (!(req as any).file) {
                // @ts-ignore
                return res.status(400).json({ message: 'No file uploaded' });
            }

            const results = await restoreData((req as any).file.buffer);
            res.json({ message: 'Restore successful', results });
        } catch (error: any) {
            console.error("Restore Error:", error);
            res.status(500).json({ message: 'Restore failed', error: error.message });
        }
    }
];

export const getDeletedCompanies = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const user = req.user;
        // Only owner can see deleted companies
        const companies = await Company.find({
            ownerId: user._id,
            deletedAt: { $ne: null }
        });
        res.json(companies);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export const restoreCompanyFromTrash = async (req: Request, res: Response) => {
    try {
        const company = await Company.findOne({ _id: req.params.id });
        if (company) {
            // @ts-ignore
            if (company.ownerId.toString() === req.user._id.toString()) {
                company.deletedAt = undefined;
                company.permanentDeleteAt = undefined;
                await company.save();
                res.json(company);
            } else {
                res.status(401).json({ message: 'Not authorized' });
            }
        } else {
            res.status(404).json({ message: 'Company not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

