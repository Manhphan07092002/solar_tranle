const API_URL = '/api/admin';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
};

export const adminService = {
    getDashboardStats: async () => {
        const response = await fetch(`${API_URL}/dashboard`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error('Failed to fetch stats');
        return response.json();
    },

    // Panels
    getPanels: async () => {
        const response = await fetch(`${API_URL}/panels`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error('Failed to fetch panels');
        return response.json();
    },
    createPanel: async (data: any) => {
        const response = await fetch(`${API_URL}/panels`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to create panel');
        return response.json();
    },
    updatePanel: async (id: string, data: any) => {
        const response = await fetch(`${API_URL}/panels/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update panel');
        return response.json();
    },
    deletePanel: async (id: string) => {
        const response = await fetch(`${API_URL}/panels/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete panel');
        return response.json();
    },

    // Inverters
    getInverters: async () => {
        const response = await fetch(`${API_URL}/inverters`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error('Failed to fetch inverters');
        return response.json();
    },
    createInverter: async (data: any) => {
        const response = await fetch(`${API_URL}/inverters`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to create inverter');
        return response.json();
    },
    updateInverter: async (id: string, data: any) => {
        const response = await fetch(`${API_URL}/inverters/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update inverter');
        return response.json();
    },
    deleteInverter: async (id: string) => {
        const response = await fetch(`${API_URL}/inverters/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete inverter');
        return response.json();
    },

    // Users
    getUsers: async () => {
        const response = await fetch(`${API_URL}/users`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error('Failed to fetch users');
        return response.json();
    },
    createUser: async (data: any) => {
        const response = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to create user');
        return response.json();
    },
    updateUser: async (id: string, data: any) => {
        const response = await fetch(`${API_URL}/users/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update user');
        return response.json();
    },
    deleteUser: async (id: string) => {
        const response = await fetch(`${API_URL}/users/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete user');
        return response.json();
    },

    // Projects
    getProjects: async () => {
        const response = await fetch(`${API_URL}/projects`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error('Failed to fetch projects');
        return response.json();
    },
    deleteProject: async (id: string) => {
        const response = await fetch(`${API_URL}/projects/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete project');
        return response.json();
    },

    // System Settings
    getSettings: async () => {
        const response = await fetch(`${API_URL}/settings`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error('Failed to fetch settings');
        return response.json();
    },
    updateSettings: async (settings: any) => {
        const response = await fetch(`${API_URL}/settings`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(settings)
        });
        if (!response.ok) throw new Error('Failed to update settings');
        return response.json();
    }
};

export const publicService = {
    getSettings: async () => {
        const response = await fetch('/api/public/settings', { headers: { 'Content-Type': 'application/json' } });
        if (!response.ok) throw new Error('Failed to get public settings');
        return response.json();
    }
};
