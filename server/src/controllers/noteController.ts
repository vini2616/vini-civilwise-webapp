import { Request, Response } from 'express';
import Note from '../models/Note';

export const createNote = async (req: Request, res: Response) => {
    try {
        const { title, body } = req.body;
        const userId = (req as any).user.id;

        const note = await Note.create({
            userId,
            title,
            body
        });

        res.status(201).json(note);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const getNotes = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;

        const notes = await Note.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json(notes);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const updateNote = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const note = await Note.findByPk(id);

        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }

        if (note.userId !== (req as any).user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await note.update(req.body);
        res.status(200).json(note);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const deleteNote = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const note = await Note.findByPk(id);

        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }

        if (note.userId !== (req as any).user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await note.destroy();
        res.status(200).json({ message: 'Note deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
