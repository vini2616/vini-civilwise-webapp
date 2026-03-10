import express from 'express';
import { getProjectTasks, createProjectTask, updateProjectTask, deleteProjectTask } from '../controllers/projectTaskController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/:siteId', protect, getProjectTasks);
router.post('/', protect, createProjectTask);
router.put('/:id', protect, updateProjectTask);
router.delete('/:id', protect, deleteProjectTask);

export default router;
