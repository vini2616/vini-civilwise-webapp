import { Request, Response } from 'express';
import Contact from '../models/Contact';

export const getContacts = async (req: Request, res: Response) => {
    try {
        const { siteId } = req.params;
        const contacts = await Contact.find({ siteId: siteId as any }).sort({ companyName: 1 });
        res.status(200).json(contacts);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching contacts', error });
    }
};

export const createContact = async (req: Request, res: Response) => {
    try {
        const newContact = new Contact(req.body);
        const savedContact = await newContact.save();
        res.status(201).json(savedContact);
    } catch (error) {
        res.status(500).json({ message: 'Error creating contact', error });
    }
};

export const deleteContact = async (req: Request, res: Response) => {
    try {
        await Contact.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Contact deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting contact', error });
    }
};
