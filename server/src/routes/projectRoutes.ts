import express from 'express';
import { protect } from '../middleware/authMiddleware';
import {
    getProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject
} from '../controllers/projectController';

const router = express.Router();

router.route('/').get(protect, getProjects).post(protect, createProject);
router.route('/:id').get(protect, getProjectById).put(protect, updateProject).delete(protect, deleteProject);

export default router;
