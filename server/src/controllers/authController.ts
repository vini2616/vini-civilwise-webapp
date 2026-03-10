// @ts-nocheck
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import User from '../models/User';
import Site from '../models/Site';
import Company from '../models/Company';
import Transaction from '../models/Transaction';
import DPR from '../models/DPR';

const generateToken = (id: number) => {
    return jwt.sign({ id }, process.env.JWT_SECRET as string, {
        expiresIn: '30d',
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req: Request, res: Response) => {
    const { name, email, username, password, role, companyId } = req.body;

    if (!name || !email || !password) {
        res.status(400).json({ message: 'Please add all fields' });
        return;
    }

    // Check if user exists
    const userExists = await User.findOne({
        where: {
            [Op.or]: [{ email }, { username: username || email }]
        }
    });

    if (userExists) {
        res.status(400).json({ message: 'User already exists' });
        return;
    }

    // Create user
    // password hashing is handled in the User model pre-save hook
    const user = await User.create({
        name,
        email,
        username: username || email, // Fallback to email if no username provided (for backward compat)
        passwordHash: password,
        role: role || 'User',
        companyId: companyId || null // Also allow companyId if needed
    });

    if (user) {
        res.status(201).json({
            _id: user.id,
            name: user.name,
            email: user.email,
            username: user.username,
            token: generateToken(user.id),
        });
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req: Request, res: Response) => {
    const { email, username, password } = req.body;

    // Check for user by email or username
    const user = await User.findOne({
        where: {
            [Op.or]: [
                { email: email || '' },
                { username: username || '' }
            ]
        }
    });

    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            username: user.username,
            role: user.role,
            permissions: user.permissions,
            permission: user.permission,
            modulePermissions: user.modulePermissions,
            token: generateToken(user.id),
        });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
};

// @desc    Create a new user (Admin/Owner/Partner only)
// @route   POST /api/auth/create-user
// @access  Private (Owner, Admin, Partner)
// DEBUG LOGGING
const fs = require('fs');
const logDebug = (msg: string, data?: any) => {
    try {
        fs.appendFileSync('server_debug.log', `${new Date().toISOString()} - ${msg}\n${data ? JSON.stringify(data, null, 2) + '\n' : ''}`);
    } catch (e) { console.error('Log failed', e); }
};

export const createUser = async (req: Request, res: Response) => {
    try {
        logDebug('createUser called', req.body);
        // @ts-ignore
        const requestingUser = req.user;

        if (!['Owner', 'Admin', 'Partner'].includes(requestingUser.role) && requestingUser.permission !== 'full_control') {
            res.status(403).json({ message: 'Not authorized to create users' });
            return;
        }

        const { name, email, username, password, role, permissions, permission, modulePermissions, siteId, companyId, mobile, salary } = req.body;

        if (!name || !email || !username || !password) {
            res.status(400).json({ message: 'Please add all fields' });
            return;
        }

        const userExists = await User.findOne({
            where: {
                [Op.or]: [{ email }, { username }]
            }
        });

        if (userExists) {
            // Check if user is already in this company
            // @ts-ignore
            const existingCompanyIds = userExists.companies || (userExists.companyId ? [userExists.companyId] : []);

            // @ts-ignore
            if (companyId && existingCompanyIds.some(id => id == companyId)) {
                res.status(400).json({ message: 'User already exists in this company' });
                return;
            }

            /*
                        // Add to new company
                        if (companyId) {
                            // @ts-ignore
                            if (!userExists.companies) userExists.companies = [];
                            // @ts-ignore
                            if (userExists.companyId) {
                                // Ensure primary is also in list
                                // @ts-ignore
                                if (!userExists.companies.some((id: any) => id == userExists.companyId)) {
                                    // @ts-ignore
                                    userExists.companies.push(userExists.companyId);
                                }
                            }
                            // @ts-ignore
                            userExists.companies.push(companyId);
                            await userExists.save();
            
                            res.status(200).json({
                                message: 'User added to company successfully',
                                _id: userExists.id,
                                name: userExists.name,
                                email: userExists.email,
                                username: userExists.username,
                                role: userExists.role,
                                // @ts-ignore
                                companies: userExists.companies
                            });
                            return;
                        } else {
                            res.status(400).json({ message: 'User already exists' });
                            return;
                        }
            */
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        const user = await User.create({
            name,
            email,
            username,
            passwordHash: password,
            role: role || 'User',
            mobile: mobile || '',
            salary: salary || 0,
            permissions: permissions || [],
            permission: permission || 'view_edit',
            modulePermissions: modulePermissions || {},

            // sites: (siteId && /^[0-9a-fA-F]{24}$/.test(siteId)) ? [siteId] : [],
            sites: req.body.sites || [],
            companyId: companyId || null,
            companies: companyId ? [companyId] : []
        });

        if (user) {
            res.status(201).json({
                _id: user.id,
                name: user.name,
                email: user.email,
                username: user.username,
                role: user.role,
                permissions: user.permissions,
                permission: user.permission,
                modulePermissions: user.modulePermissions,
                sites: user.sites,
                companyId: user.companyId,
                companies: user.companies
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error: any) {
        console.error("Create User Error Detailed:", error);
        // Check for SequelizeValidation Error
        const msg = error.errors ? error.errors.map((e: any) => e.message).join(', ') : error.message;
        res.status(500).json({ message: 'Server Error: ' + msg, error: error });
    }
};

// @desc    Get all users (optionally filtered by site or company)
// @route   GET /api/auth/users
// @access  Private
export const getUsers = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const user = req.user;
        const { siteId, companyId } = req.query;
        console.log("getUsers Request - Query:", req.query);
        console.log("getUsers Request - User Role:", user.role);
        console.log("getUsers Request - User Company:", user.companyId);
        let query: any = {};

        // Security Check: Users can only see users from their own company
        // Unless they are super admin (not implemented yet)
        // Security Check: Users can only see users from their own company
        // Unless they are super admin (not implemented yet)
        // REMOVED: This strict filter was blocking unassigned users. 
        // Logic is handled in the if(companyId) and fallback blocks below.

        // If specific company requested, ensure it matches user's company
        if (companyId) {
            // SUPER ADMIN BYPASS
            if (user.username === 'vini') {
                // Allowed to see any company's users
            }
            // Check if user is authorized for this company
            // @ts-ignore
            else if (user.companyId && user.companyId != Number(companyId)) {
                // Allow Super Admin to bypass
                if (user.permission !== 'full_control') {
                    // If user is Owner, check if they own this company
                    const targetCompany = await Company.findByPk(Number(companyId));
                    // @ts-ignore
                    if (!targetCompany || targetCompany.ownerId != user.id) {
                        res.status(403).json({ message: 'Not authorized to view users of another company' });
                        return;
                    }
                }
            }

            // If user is Owner/Admin/Partner, allow fetching users from ALL their owned companies + unassigned
            if (['Owner', 'Admin', 'Partner'].includes(user.role)) {
                // @ts-ignore
                const ownedCompanies = await Company.findAll({ where: { ownerId: user.id } });
                const ownedCompanyIds = ownedCompanies.map(c => c.id);

                // Include the requested companyId in the list if not already there (though it should be)
                if (!ownedCompanyIds.some(id => id == Number(companyId))) {
                    // @ts-ignore
                    ownedCompanyIds.push(Number(companyId));
                }

                query = {
                    [Op.or]: [
                        { companyId: { [Op.in]: ownedCompanyIds } },
                        { companyId: null }
                    ]
                };
            } else {
                // Regular users: strict company filter + unassigned
                query = {
                    [Op.or]: [
                        { companyId: companyId },
                        { companyId: null }
                    ]
                };
            }
        }

        if (siteId) {
            // query.sites = siteId;
        }

        // Fallback: If no companyId on user, and no companyId in query, what to do?
        // Maybe return empty or just their own profile?
        // For now, if query is empty, it returns all users which is BAD.
        if (Object.keys(query).length === 0) {
            // Super Admins can see EVERYTHING
            if (user.permission === 'full_control' || user.username === 'vini') {
                // No filter = return all users
            }
            // If no filters, default to user's company if available
            if (user.companyId) {
                if (['Owner', 'Admin', 'Partner'].includes(user.role)) {
                    // Owners can see their company users AND unassigned users
                    query = {
                        [Op.or]: [
                            { companyId: user.companyId },
                            { companyId: null }
                        ]
                    };
                } else {
                    query.companyId = user.companyId;
                }
            } else {
                // ... existing fallback ...
            }
        }

        let users = await User.findAll({ where: query, attributes: { exclude: ['passwordHash'] } });

        // Filter by siteId in Javascript
        if (siteId) {
            // We need to know the companyId of the requested site to check for implicit Admin access
            const site = await Site.findByPk(Number(siteId));
            const siteCompanyId = site ? site.companyId : null;

            users = users.filter((u: any) => {
                // 1. Explicit Assignment
                const userSites = Array.isArray(u.sites) ? u.sites : [];
                if (userSites.some((s: any) => s == siteId)) return true;

                // 2. Implicit Admin/Owner Access via Company
                if (['Owner', 'Admin', 'Partner'].includes(u.role)) {
                    // If user belongs to the company of the site
                    if (siteCompanyId && u.companyId === siteCompanyId) return true;
                    // If user has access to the company (multi-company support)
                    if (siteCompanyId && Array.isArray(u.companies) && u.companies.some((c: any) => c == siteCompanyId)) return true;
                }

                return false;
            });
        }

        res.json(users);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

/*
export const assignUserToSite = async (req: Request, res: Response) => {
    // ... code ...
    res.status(501).json({ message: 'Not implemented in MySQL migration yet' });
};
*/
/*
export const removeUserFromSite = async (req: Request, res: Response) => {
    // ... code ...
    res.status(501).json({ message: 'Not implemented in MySQL migration yet' });
};
*/

// @desc    Delete a user permanently
// @route   DELETE /api/auth/users/:id
// @access  Private (Owner, Admin, Partner)
export const deleteUser = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const requestingUser = req.user;

        if (!['Owner', 'Admin', 'Partner'].includes(requestingUser.role) && requestingUser.permission !== 'full_control' && requestingUser.username !== 'vini') {
            res.status(403).json({ message: 'Not authorized' });
            return;
        }

        const user = await User.findByPk(req.params.id);

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // Prevent deleting yourself
        const requesterId = requestingUser.id || requestingUser._id;
        if (user.id.toString() === requesterId?.toString()) {
            res.status(400).json({ message: 'Cannot delete yourself' });
            return;
        }

        await user.destroy();

        res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
        console.error("Delete User Error Detailed:", error);
        // Check for ForeignKeyConstraintError
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            try {
                // Attempt to auto-fix by re-assigning associations to the Admin deleting the user
                const adminId = requestingUser.id || requestingUser._id;

                // 1. Transactions
                await Transaction.update({ userId: adminId }, { where: { userId: user.id } });

                // 2. DPRs
                await DPR.update({ userId: adminId }, { where: { userId: user.id } });

                // 3. Companies (if they owned any)
                await Company.update({ ownerId: adminId }, { where: { ownerId: user.id } });

                // Retry deletion
                await user.destroy();
                res.json({ message: 'User deleted successfully. Their data (Transactions, Reports, Comapnies) has been transferred to you.' });
                return;
            } catch (cleanupError: any) {
                // If that fails, then return error
                console.error("Cleanup failed", cleanupError);
                res.status(400).json({ message: 'Cannot delete user due to data constraints. Please remove their data first.', error: cleanupError.message });
                return;
            }
        }
        res.status(500).json({ message: 'Server Error: ' + error.message, error: error });
    }
};

// @desc    Update user details
// @route   PUT /api/auth/users/:id
// @access  Private (Owner/Admin/Partner only)
export const updateUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, mobile, role, salary, username, password, permission, modulePermissions } = req.body;

    try {
        const user = await User.findByPk(id);

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // Update fields
        if (name) user.name = name;
        if (mobile) user.mobile = mobile;
        if (role) user.role = role;
        if (salary) user.salary = salary;
        if (username) user.username = username;
        if (password) user.passwordHash = password; // Will be hashed by pre-save hook
        if (permission) user.permission = permission;
        if (modulePermissions) user.modulePermissions = modulePermissions;

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            username: updatedUser.username,
            role: updatedUser.role,
            mobile: updatedUser.mobile,
            salary: updatedUser.salary,
            permission: updatedUser.permission,
            modulePermissions: updatedUser.modulePermissions,
        });
    } catch (error: any) {
        console.error("Update User Error:", error);
        res.status(500).json({ message: 'Server error: ' + error.message, error: error.message });
    }
};

// @desc    Verify token and return user data
// @route   GET /api/auth/verify
// @access  Private
export const verifyUser = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const user = req.user;

        if (user) {
            res.json({
                _id: user.id,
                name: user.name,
                email: user.email,
                username: user.username,
                role: user.role,
                permissions: user.permissions,
                permission: user.permission,
                modulePermissions: user.modulePermissions,
                token: req.headers.authorization?.split(' ')[1] // Return same token
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Assign user to site
// @route   POST /api/auth/assign-site
// @access  Private
export const assignUserToSite = async (req: Request, res: Response) => {
    try {
        const { userId, siteId } = req.body;

        const user = await User.findByPk(userId);
        const site = await Site.findByPk(siteId);

        if (!user || !site) {
            res.status(404).json({ message: 'User or Site not found' });
            return;
        }

        let isModified = false;

        // Initialize sites array if null
        // Currently sites is configured as JSON in User model
        let sites: any[] = Array.isArray(user.sites) ? user.sites : [];
        const siteIdNum = Number(siteId);

        // Check if string or number present
        const alreadyExists = sites.some(s => Number(s) === siteIdNum);

        if (!alreadyExists) {
            sites.push(siteIdNum);
            user.sites = sites;
            user.changed('sites', true);
            isModified = true;
        }

        // AUTO-GRANT COMPANY ACCESS
        if (site.companyId) {
            let companies: any[] = Array.isArray(user.companies) ? user.companies : [];
            const companyIdNum = Number(site.companyId);

            // Add to companies list if not present
            if (!companies.some((id: any) => Number(id) === companyIdNum)) {
                companies.push(companyIdNum);
                user.companies = companies; // Assign new reference
                user.changed('companies', true); // Explicitly mark changed
                isModified = true;

                // Also helpfully logging this
                console.log(`[Permission] Automatically added User ${user.id} to Company ${companyIdNum} via functionality`);
            }

            // If user has no primary company, set it
            if (!user.companyId) {
                user.companyId = companyIdNum;
                isModified = true;
            }
        }

        if (isModified) {
            await user.save();
        }

        res.json({ message: 'User assigned to site', sites: user.sites });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Remove user from site
// @route   POST /api/auth/remove-site
// @access  Private
export const removeUserFromSite = async (req: Request, res: Response) => {
    try {
        const { userId, siteId } = req.body;

        const user = await User.findByPk(userId);

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        let sites: number[] = Array.isArray(user.sites) ? user.sites : [];
        const siteIdNum = Number(siteId);

        // Check for loose equality to handle mixed string/number types in JSON
        if (sites.some((id: any) => id == siteIdNum)) {
            user.sites = sites.filter((id: any) => id != siteIdNum);
            user.changed('sites', true);
            await user.save();
        }

        res.json({ message: 'User removed from site', sites: user.sites });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
