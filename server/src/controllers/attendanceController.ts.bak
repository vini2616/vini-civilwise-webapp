import { Request, Response } from 'express';
import Attendance from '../models/Attendance';

export const getAttendance = async (req: Request, res: Response) => {
    try {
        const { siteId } = req.params;
        const attendance = await Attendance.find({ siteId: siteId as any }).sort({ date: -1 });
        res.status(200).json(attendance);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching attendance', error });
    }
};

export const createAttendance = async (req: Request, res: Response) => {
    try {
        const { siteId, date } = req.body;
        // Check if attendance for this date already exists
        const existing = await Attendance.findOne({ siteId, date });
        if (existing) {
            res.status(400).json({ message: 'Attendance for this date already exists. Use update instead.' });
            return;
        }

        const newAttendance = new Attendance(req.body);
        const savedAttendance = await newAttendance.save();
        res.status(201).json(savedAttendance);
    } catch (error) {
        res.status(500).json({ message: 'Error creating attendance', error });
    }
};

export const updateAttendance = async (req: Request, res: Response) => {
    try {
        const updatedAttendance = await Attendance.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.status(200).json(updatedAttendance);
    } catch (error) {
        res.status(500).json({ message: 'Error updating attendance', error });
    }
};

export const deleteAttendance = async (req: Request, res: Response) => {
    try {
        await Attendance.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Attendance deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting attendance', error });
    }
};
