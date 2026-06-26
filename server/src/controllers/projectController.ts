import { Request, Response } from 'express';
import crypto from 'crypto';
import Project from '../models/Project';

// Get all projects
export const getProjects = async (req: Request, res: Response) => {
    try {
        const projects = await Project.find({ userId: (req as any).user.id }).sort({ lastModified: -1 });
        // Transform to match frontend interface if needed
        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// Get single project
export const getProjectById = async (req: Request, res: Response) => {
    try {
        const project = await Project.findOne({ id: req.params.id, userId: (req as any).user.id });
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        res.json(project);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// Create new project
export const createProject = async (req: Request, res: Response) => {
    try {
        const { id, name, address, owner, type, thumbnailUrl } = req.body;

        // Check if project with ID already exists
        const existingProject = await Project.findOne({ id, userId: (req as any).user.id });
        if (existingProject) {
            return res.status(400).json({ message: 'Project ID already exists' });
        }

        const newProject = new Project({
            id,
            name,
            address,
            owner,
            type,
            thumbnailUrl,
            status: 'Draft',
            lastModified: new Date(),
            capacityKWp: 0,
            userId: (req as any).user.id
        });

        const savedProject = await newProject.save();
        res.status(201).json(savedProject);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// Update project (including saving design state)
export const updateProject = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const hasDesignState = Object.prototype.hasOwnProperty.call(updates, 'designState');
        console.log('[updateProject] id=', id, 'keys=', Object.keys(updates), 'hasDesignState=', hasDesignState);

        // Use findById + save to properly track Mixed field changes
        const project = await Project.findOne({ id, userId: (req as any).user.id });
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Apply all updates from request body
        for (const [key, value] of Object.entries(updates)) {
            (project as any)[key] = value;
        }

        // Always update lastModified
        project.lastModified = new Date();

        // Mark nested Mixed fields so Mongoose saves them
        if (hasDesignState) {
            project.markModified('designState');
            project.markModified('designState.roofs');
            project.markModified('designState.obstructions');
        }

        const savedProject = await project.save();
        console.log('[updateProject] saved project id=', savedProject.id, 'lastModified=', savedProject.lastModified);
        res.json(savedProject);
    } catch (error) {
        console.error('[updateProject] error:', error);
        res.status(500).json({ message: 'Server Error', error });
    }
};


// Delete project
export const deleteProject = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const project = await Project.findOneAndDelete({ id, userId: (req as any).user.id });

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

export const shareProject = async (req: Request, res: Response) => {
    try {
        const project = await Project.findOne({ id: req.params.id, userId: (req as any).user.id });
        if (!project) return res.status(404).json({ message: 'Project not found' });
        
        project.isPublic = true;
        if (!project.shareToken) {
            project.shareToken = crypto.randomBytes(16).toString('hex');
        }
        await project.save();
        
        res.json({ shareToken: project.shareToken });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

export const getSharedProject = async (req: Request, res: Response) => {
    try {
        const project = await Project.findOne({ shareToken: req.params.token, isPublic: true });
        if (!project) return res.status(404).json({ message: 'Shared project not found or access revoked' });
        
        res.json(project);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};
