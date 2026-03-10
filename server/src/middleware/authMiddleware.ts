// @ts-nocheck
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

interface DecodedToken {
    id: string;
    iat: number;
    exp: number;
}

// Extend Request interface to include user
declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as DecodedToken;

            req.user = await User.findByPk(Number(decoded.id), { attributes: { exclude: ['passwordHash'] } });

            if (!req.user) {
                res.status(401).json({ message: 'Not authorized, user not found' });
                return;
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
            return;
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

export const checkPermission = (moduleName: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        // @ts-ignore
        const user = req.user;

        if (!user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }

        // SUPER ADMIN HARDCORE CHECK
        if (user.username === 'vini') {
            next();
            return;
        }

        // Admins/Partners/Owners/Full Control users have access to everything
        if (['Owner', 'Admin', 'Partner'].includes(user.role) || user.permission === 'full_control') {
            next();
            return;
        }

        // Check specific module permission
        const userPerms = user.modulePermissions || {};
        let modulePerm = userPerms[moduleName] || 'no_access';

        const globalPerm = user.permission ? user.permission.trim() : '';
        if (globalPerm === 'data_entry') {
            modulePerm = 'data_entry';
        }

        // Determine request method
        const method = req.method;

        if (modulePerm === 'no_access') {
            res.status(403).json({ message: `Access denied to ${moduleName}` });
            return;
        }

        if (modulePerm === 'view_only') {
            if (method === 'GET') {
                next();
                return;
            } else {
                res.status(403).json({ message: 'View only access' });
                return;
            }
        }

        if (modulePerm === 'data_entry') {
            // Allow all methods to pass to controller
            // The controller MUST enforce the 30-minute edit/delete limit for data_entry role
            next();
            return;
        }

        if (modulePerm === 'full_control') {
            next();
            return;
        }

        // Default deny if unknown permission value
        res.status(403).json({ message: 'Unauthorized permission level' });
    };
};
