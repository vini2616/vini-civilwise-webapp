import { Request, Response } from 'express';
import ProjectTask from '../models/ProjectTask';
import { getAccessibleSiteIds } from '../utils/accessControl';
import fs from 'fs';
import path from 'path';

const logFile = path.join(process.cwd(), 'server_debug.log');

const logToFile = (msg: string) => {
    fs.appendFileSync(logFile, new Date().toISOString() + ': ' + msg + '\n');
};

export const createTask = async (req: Request, res: Response) => {
    try {
        const { siteId, title, description, startDate, endDate, status, assignedTo, priority, color, progress } = req.body;

        logToFile(`Create Task Request Body: ${JSON.stringify(req.body)}`);
        const user = (req as any).user;
        logToFile(`User: ${user.id} ${user.username} ${user.role}`);

        // Verify access
        const accessibleSites = await getAccessibleSiteIds(user);
        logToFile(`Accessible Sites for user ${user.id}: ${accessibleSites}`);
        logToFile(`Requested Site ID: ${siteId} (Type: ${typeof siteId})`);

        if (!accessibleSites.includes(Number(siteId))) {
            logToFile("Access Denied: Site ID not in accessible sites");
            return res.status(403).json({ message: 'Access denied for this site' });
        }

        const task = await ProjectTask.create({
            siteId: Number(siteId),
            title,
            description,
            startDate,
            endDate,
            status: status || 'Pending',
            assignedTo,
            priority: priority || 'Medium',
            color: color || '#3b82f6',
            progress: progress || 0
        });

        logToFile(`Task Created: ${task.id}`);
        res.status(201).json(task);
    } catch (error: any) {
        logToFile(`Create Task Error: ${error.message} \nStack: ${error.stack}`);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const getTasks = async (req: Request, res: Response) => {
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

        const tasks = await ProjectTask.findAll({
            where,
            order: [['startDate', 'ASC']]
        });

        res.status(200).json(tasks);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const getTaskById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const task = await ProjectTask.findByPk(id);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Verify access
        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(task.siteId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.status(200).json(task);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const updateTask = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const task = await ProjectTask.findByPk(id);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Verify access
        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(task.siteId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Permission Check for Data Entry
        const user = (req as any).user;
        if (user.permission === 'data_entry') {
            const created = new Date(task.createdAt).getTime();
            const now = Date.now();
            const diffMins = (now - created) / 1000 / 60;
            if (diffMins > 30) {
                // Double check if it's negative (future) -> treat as valid? Or safer to just block > 30. 
                // If local time is behind server time, created might be "future". 
                // But typically created is past. 
                return res.status(403).json({ message: 'Restricted: Time limit exceeded for editing.' });
            }
        }

        await task.update(req.body);
        res.status(200).json(task);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const deleteTask = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const task = await ProjectTask.findByPk(id);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Verify access
        const accessibleSites = await getAccessibleSiteIds((req as any).user);
        if (!accessibleSites.includes(task.siteId)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Permission Check for Data Entry
        const user = (req as any).user;
        if (user.permission === 'data_entry') {
            const created = new Date(task.createdAt).getTime();
            const now = Date.now();
            const diffMins = (now - created) / 1000 / 60;
            if (diffMins > 30) {
                return res.status(403).json({ message: 'Restricted: Time limit exceeded for deleting.' });
            }
        }

        await task.destroy();
        res.status(200).json({ message: 'Task deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
