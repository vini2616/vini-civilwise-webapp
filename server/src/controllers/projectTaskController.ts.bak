import { Request, Response } from 'express';
import ProjectTask from '../models/ProjectTask';
import { verifySiteAccess } from '../utils/accessControl';

// @desc    Get all tasks for a site
// @route   GET /api/project-tasks/:siteId
// @access  Private
export const getProjectTasks = async (req: Request, res: Response) => {
    try {
        const { siteId } = req.params;
        // @ts-ignore
        const user = req.user;

        const hasAccess = await verifySiteAccess(user, siteId);
        if (!hasAccess) {
            res.status(403).json({ message: 'Not authorized to view tasks for this site' });
            return;
        }

        const tasks = await ProjectTask.find({ siteId: siteId as any }).sort({ startDate: 1 });
        res.json(tasks);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a new task
// @route   POST /api/project-tasks
// @access  Private
export const createProjectTask = async (req: Request, res: Response) => {
    try {
        const { siteId, title, description, startDate, endDate, status, assignedTo, priority, color, progress } = req.body;
        // @ts-ignore
        const user = req.user;

        if (siteId) {
            const hasAccess = await verifySiteAccess(user, siteId);
            if (!hasAccess) {
                res.status(403).json({ message: 'Not authorized to create tasks for this site' });
                return;
            }
        } else {
            res.status(400).json({ message: 'Site ID is required' });
            return;
        }

        const task = await ProjectTask.create({
            siteId,
            title,
            description,
            startDate,
            endDate,
            status,
            assignedTo,
            priority,
            color,
            progress
        });

        res.status(201).json(task);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update a task
// @route   PUT /api/project-tasks/:id
// @access  Private
export const updateProjectTask = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // @ts-ignore
        const user = req.user;

        const task = await ProjectTask.findById(id);

        if (!task) {
            res.status(404).json({ message: 'Task not found' });
            return;
        }

        const hasAccess = await verifySiteAccess(user, task.siteId.toString());
        if (!hasAccess) {
            res.status(403).json({ message: 'Not authorized to update this task' });
            return;
        }

        const updatedTask = await ProjectTask.findByIdAndUpdate(id, req.body, { new: true });
        res.json(updatedTask);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete a task
// @route   DELETE /api/project-tasks/:id
// @access  Private
export const deleteProjectTask = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // @ts-ignore
        const user = req.user;

        const task = await ProjectTask.findById(id);

        if (!task) {
            res.status(404).json({ message: 'Task not found' });
            return;
        }

        const hasAccess = await verifySiteAccess(user, task.siteId.toString());
        if (!hasAccess) {
            res.status(403).json({ message: 'Not authorized to delete this task' });
            return;
        }

        await task.deleteOne();
        res.json({ message: 'Task removed' });
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
