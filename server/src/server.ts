import express, { Application, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';

import authRoutes from './routes/authRoutes';
import siteRoutes from './routes/siteRoutes';
import companyRoutes from './routes/companyRoutes';

// Load env vars
dotenv.config();

// Import models to ensure they are registered with Sequelize
import './models';

// Connect to database
import { connectDB } from './config/sequelize';

// Connect to MySQL
connectDB();

const app: Application = express();

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '200mb', type: ['application/json', 'text/plain'] }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Debug middleware to log request size
app.use((req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT') {
        const contentLength = req.headers['content-length'];
        console.log(`Incoming ${req.method} request to ${req.originalUrl}. Content-Length: ${contentLength} bytes (~${(Number(contentLength) / 1024 / 1024).toFixed(2)} MB)`);
    }
    next();
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10000,
});
app.use('/api/auth', limiter);

// Routes

app.use('/api/auth', authRoutes);
app.use('/api/sites', siteRoutes);
console.log("Registering /api/companies route...");
app.use('/api/companies', companyRoutes);
console.log("Registered /api/companies route.");

import transactionRoutes from './routes/transactionRoutes';
// import dprRoutes from './routes/dprRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
// import estimationRoutes from './routes/estimationRoutes';
// import contactRoutes from './routes/contactRoutes';
// import attendanceRoutes from './routes/attendanceRoutes';
import materialRoutes from './routes/materialRoutes';

/* ... */

import billRoutes from './routes/billRoutes';
import checklistRoutes from './routes/checklistRoutes';
import contactRoutes from './routes/contactRoutes';
import projectTaskRoutes from './routes/projectTaskRoutes';
import siteSettingsRoutes from './routes/siteSettingsRoutes';
import customShapeRoutes from './routes/customShapeRoutes';
import noteRoutes from './routes/noteRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import chatRoutes from './routes/messageRoutes'; // Renamed to chatRoutes for consistency with route map
import documentRoutes from './routes/documentRoutes';
import manpowerRoutes from './routes/manpowerRoutes';
import dprRoutes from './routes/dprRoutes';
import estimationRoutes from './routes/estimationRoutes';
import reportRoutes from './routes/reportRoutes';

/* ... */

app.use('/api/transactions', transactionRoutes);
app.use('/api/dpr', dprRoutes);
app.use('/api/estimations', estimationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/checklists', checklistRoutes);
app.use('/api/project-tasks', projectTaskRoutes);
app.use('/api/custom-shapes', customShapeRoutes);
app.use('/api/site-settings', siteSettingsRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/manpower', manpowerRoutes);
app.use('/api/chat', chatRoutes); // messageRoutes imported as chatRoutes
app.use('/api/documents', documentRoutes);
app.use('/api/notes', noteRoutes);


app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ ok: true });
});

// 404 Handler
app.use((req: Request, res: Response, next: NextFunction) => {
    res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    console.log('Server process updated: Ready for deleted sites.');
});

// Increase timeouts for large file uploads
server.keepAliveTimeout = 300000; // 5 minutes
server.headersTimeout = 301000; // slightly more than keepAliveTimeout
