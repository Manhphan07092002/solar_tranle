import { Project } from '../types';

const API_URL = '/api/projects';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
};

export const projectService = {
    // Get all projects
    getAll: async (): Promise<Project[]> => {
        const response = await fetch(API_URL, {
            headers: getAuthHeaders()
        });
        if (!response.ok) {
            throw new Error('Failed to fetch projects');
        }
        return response.json();
    },

    // Get project by ID
    getById: async (id: string): Promise<Project> => {
        const response = await fetch(`${API_URL}/${id}`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) {
            throw new Error('Failed to fetch project');
        }
        return response.json();
    },

    // Create new project
    create: async (project: Partial<Project>): Promise<Project> => {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(project),
        });
        if (!response.ok) {
            throw new Error('Failed to create project');
        }
        return response.json();
    },

    // Update project
    update: async (id: string, updates: Partial<Project>): Promise<Project> => {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(updates),
        });
        if (!response.ok) {
            throw new Error('Failed to update project');
        }
        return response.json();
    },

    // Delete project
    delete: async (id: string): Promise<void> => {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (!response.ok) {
            throw new Error('Failed to delete project');
        }
    },

    // Share project
    share: async (id: string): Promise<{ shareToken: string }> => {
        const response = await fetch(`${API_URL}/${id}/share`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        if (!response.ok) {
            throw new Error('Failed to generate share link');
        }
        return response.json();
    },

    // Get shared project
    getShared: async (token: string): Promise<Project> => {
        const response = await fetch(`/api/public/shared/${token}`, {
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
            throw new Error('Shared project not found');
        }
        return response.json();
    }
};
