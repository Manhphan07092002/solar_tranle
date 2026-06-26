import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { adminOnly } from '../middleware/adminMiddleware';
import {
    getDashboardStats,
    getPanels, createPanel, updatePanel, deletePanel,
    getInverters, createInverter, updateInverter, deleteInverter,
    getUsers, createUser, updateUser, deleteUser,
    getProjects, deleteProject,
    getSettings, updateSettings
} from '../controllers/adminController';

const router = express.Router();

// All routes here are protected and admin only
router.use(protect);
router.use(adminOnly);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Panels
router.get('/panels', getPanels);
router.post('/panels', createPanel);
router.put('/panels/:id', updatePanel);
router.delete('/panels/:id', deletePanel);

// Inverters
router.get('/inverters', getInverters);
router.post('/inverters', createInverter);
router.put('/inverters/:id', updateInverter);
router.delete('/inverters/:id', deleteInverter);

// Users
router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Projects
router.get('/projects', getProjects);
router.delete('/projects/:id', deleteProject);

// System Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

export default router;
