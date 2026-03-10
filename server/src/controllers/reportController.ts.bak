import { Request, Response } from 'express';
import Report from '../models/Report';

// @desc    Get all reports for a site
// @route   GET /api/reports
// @access  Private
export const getReports = async (req: any, res: Response) => {
    try {
        const siteId = req.user.activeSite || req.query.siteId;

        if (!siteId) {
            return res.status(400).json({ message: 'Site ID is required' });
        }

        const reports = await Report.find({ siteId }).sort({ createdAt: -1 });
        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Create a new report
// @route   POST /api/reports
// @access  Private
export const createReport = async (req: any, res: Response) => {
    try {
        const { type, location, date, image, status, data } = req.body;
        const siteId = req.user.activeSite || req.body.siteId;

        if (!siteId) {
            return res.status(400).json({ message: 'Site ID is required' });
        }

        const newReport = new Report({
            siteId,
            type,
            location,
            date: date || new Date(),
            status: status || 'Scheduled', // Default status if not provided
            image,
            createdBy: req.user._id,
            data
        });

        const savedReport = await newReport.save();
        res.status(201).json(savedReport);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Delete a report
// @route   DELETE /api/reports/:id
// @access  Private
export const deleteReport = async (req: any, res: Response) => {
    try {
        const report = await Report.findById(req.params.id);

        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        await report.deleteOne();
        res.json({ message: 'Report removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};
// @desc    Update a report
// @route   PUT /api/reports/:id
// @access  Private
export const updateReport = async (req: any, res: Response) => {
    try {
        const { type, location, date, image, status, data } = req.body;
        const report = await Report.findById(req.params.id);

        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        report.type = type || report.type;
        report.location = location || report.location;
        report.date = date || report.date;
        report.status = status || report.status; // Update status
        report.image = image !== undefined ? image : report.image;
        report.data = data || report.data;

        const updatedReport = await report.save();
        res.json(updatedReport);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};
