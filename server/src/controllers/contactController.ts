import { Request, Response } from 'express';
import Contact from '../models/Contact';
import { getAccessibleSiteIds } from '../utils/accessControl';

export const createContact = async (req: Request, res: Response) => {
    try {
        const { siteId, name, companyName, number, mobileNumber, role, type, gstNumber, address, email, contactPerson } = req.body;

        // Verify access
        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(Number(siteId))) {
            return res.status(403).json({ message: 'Access denied for this site' });
        }

        const contact = await Contact.create({
            siteId,
            name,
            companyName,
            number,
            mobileNumber,
            role,
            type,
            gstNumber,
            address,
            email,
            contactPerson
        });

        res.status(201).json(contact);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const getContacts = async (req: Request, res: Response) => {
    try {
        const { siteId } = req.query;

        // Verify access
        const accessibleSites = await getAccessibleSiteIds((req as any).user);

        let where: any = {};
        if (siteId) {
            if (!accessibleSites.includes(Number(siteId))) {
                return res.status(403).json({ message: 'Access denied for this site' });
            }
            where.siteId = siteId;
        } else {
            where.siteId = accessibleSites;
        }

        const contacts = await Contact.findAll({
            where,
            order: [['companyName', 'ASC']]
        });

        res.status(200).json(contacts);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const getContactById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const contact = await Contact.findByPk(id);

        if (!contact) {
            return res.status(404).json({ message: 'Contact not found' });
        }

        // Verify access
        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(contact.siteId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.status(200).json(contact);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const updateContact = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const contact = await Contact.findByPk(id);

        if (!contact) {
            return res.status(404).json({ message: 'Contact not found' });
        }

        // Verify access
        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(contact.siteId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await contact.update(req.body);
        res.status(200).json(contact);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const deleteContact = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const contact = await Contact.findByPk(id);

        if (!contact) {
            return res.status(404).json({ message: 'Contact not found' });
        }

        // Verify access
        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(contact.siteId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await contact.destroy();
        res.status(200).json({ message: 'Contact deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
