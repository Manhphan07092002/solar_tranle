import { Request, Response } from 'express';
import User from '../models/User';
import Project from '../models/Project';
import Panel from '../models/Panel';
import Inverter from '../models/Inverter';

// Dashboard
export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const usersCount = await User.countDocuments();
        const projectsCount = await Project.countDocuments();
        const panelsCount = await Panel.countDocuments();
        const invertersCount = await Inverter.countDocuments();

        res.json({
            users: usersCount,
            projects: projectsCount,
            panels: panelsCount,
            inverters: invertersCount
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

// Panel CRUD
export const getPanels = async (req: Request, res: Response) => {
    try {
        const panels = await Panel.find().sort({ createdAt: -1 });
        res.json(panels);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const createPanel = async (req: Request, res: Response) => {
    try {
        const panel = new Panel(req.body);
        const createdPanel = await panel.save();
        res.status(201).json(createdPanel);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const updatePanel = async (req: Request, res: Response) => {
    try {
        const panel = await Panel.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!panel) return res.status(404).json({ message: 'Panel not found' });
        res.json(panel);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const deletePanel = async (req: Request, res: Response) => {
    try {
        const panel = await Panel.findByIdAndDelete(req.params.id);
        if (!panel) return res.status(404).json({ message: 'Panel not found' });
        res.json({ message: 'Panel removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Inverter CRUD
export const getInverters = async (req: Request, res: Response) => {
    try {
        const inverters = await Inverter.find().sort({ createdAt: -1 });
        res.json(inverters);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const createInverter = async (req: Request, res: Response) => {
    try {
        const inverter = new Inverter(req.body);
        const createdInverter = await inverter.save();
        res.status(201).json(createdInverter);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateInverter = async (req: Request, res: Response) => {
    try {
        const inverter = await Inverter.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!inverter) return res.status(404).json({ message: 'Inverter not found' });
        res.json(inverter);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteInverter = async (req: Request, res: Response) => {
    try {
        const inverter = await Inverter.findByIdAndDelete(req.params.id);
        if (!inverter) return res.status(404).json({ message: 'Inverter not found' });
        res.json({ message: 'Inverter removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// User Management
export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const createUser = async (req: Request, res: Response) => {
    try {
        const { name, email, password, role, isActive } = req.body;
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: 'User already exists' });

        const salt = await require('bcryptjs').genSalt(10);
        const passwordHash = await require('bcryptjs').hash(password || '123456', salt);

        const user = await User.create({
            name,
            email,
            passwordHash,
            role: role || 'user',
            isActive: isActive !== undefined ? isActive : true
        });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        if (req.body.role) user.role = req.body.role;
        if (typeof req.body.isActive === 'boolean') user.isActive = req.body.isActive;

        if (req.body.password) {
            const salt = await require('bcryptjs').genSalt(10);
            user.passwordHash = await require('bcryptjs').hash(req.body.password, salt);
        }

        const updatedUser = await user.save();
        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            isActive: updatedUser.isActive
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Project Management
export const getProjects = async (req: Request, res: Response) => {
    try {
        const projects = await Project.find().populate('userId', 'name email').sort({ createdAt: -1 });
        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteProject = async (req: Request, res: Response) => {
    try {
        const project = await Project.findByIdAndDelete(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });
        res.json({ message: 'Project removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
