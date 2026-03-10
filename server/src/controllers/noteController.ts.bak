import { Request, Response } from 'express';
import Note, { INote } from '../models/Note';

// @desc    Get user notes
// @route   GET /api/notes
// @access  Private
export const getNotes = async (req: Request, res: Response) => {
    const notes = await Note.find({ userId: req.user._id });
    res.status(200).json(notes);
};

// @desc    Create new note
// @route   POST /api/notes
// @access  Private
export const createNote = async (req: Request, res: Response) => {
    const { title, body } = req.body;

    if (!title || !body) {
        res.status(400).json({ message: 'Please add a title and body' });
        return;
    }

    const note = await Note.create({
        userId: req.user._id,
        title,
        body,
    });

    res.status(201).json(note);
};

// @desc    Update note
// @route   PUT /api/notes/:id
// @access  Private
export const updateNote = async (req: Request, res: Response) => {
    const note = await Note.findById(req.params.id);

    if (!note) {
        res.status(404).json({ message: 'Note not found' });
        return;
    }

    // Check for user
    if (!req.user) {
        res.status(401).json({ message: 'User not found' });
        return;
    }

    // Make sure the logged in user matches the note user
    if (note.userId.toString() !== req.user._id.toString()) {
        res.status(401).json({ message: 'User not authorized' });
        return;
    }

    const updatedNote = await Note.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
    );

    res.status(200).json(updatedNote);
};

// @desc    Delete note
// @route   DELETE /api/notes/:id
// @access  Private
export const deleteNote = async (req: Request, res: Response) => {
    const note = await Note.findById(req.params.id);

    if (!note) {
        res.status(404).json({ message: 'Note not found' });
        return;
    }

    // Check for user
    if (!req.user) {
        res.status(401).json({ message: 'User not found' });
        return;
    }

    // Make sure the logged in user matches the note user
    if (note.userId.toString() !== req.user._id.toString()) {
        res.status(401).json({ message: 'User not authorized' });
        return;
    }

    await note.deleteOne();

    res.status(200).json({ success: true });
};
