import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { Trash2, UserCog, Plus } from 'lucide-react';
import AdminModal from './AdminModal';

const UserManagement = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'user', isActive: true });
    const [loading, setLoading] = useState(false);

    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const loadUsers = () => {
        adminService.getUsers().then(setUsers).catch(console.error);
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingUser) {
                await adminService.updateUser(editingUser._id, formData);
            } else {
                await adminService.createUser(formData);
            }
            setIsModalOpen(false);
            loadUsers();
        } catch (error) {
            console.error(error);
            alert('Failed to save user. Please check if email already exists.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            try {
                await adminService.deleteUser(id);
                loadUsers();
            } catch (error) {
                console.error(error);
            }
        }
    };

    const openModal = (user?: any) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                name: user.name,
                email: user.email,
                password: '',
                role: user.role || 'user',
                isActive: user.isActive !== undefined ? user.isActive : true
            });
        } else {
            setEditingUser(null);
            setFormData({
                name: '',
                email: '',
                password: '',
                role: 'user',
                isActive: true
            });
        }
        setIsModalOpen(true);
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Users</h1>
                    <p className="text-slate-500 mt-1">Manage platform users and their roles.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Search users..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64 shadow-sm"
                        />
                        <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                        </svg>
                    </div>
                    <button 
                        onClick={() => openModal()}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all"
                    >
                        <Plus className="w-4 h-4" /> Add User
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                            <th className="px-6 py-4 font-semibold">Name</th>
                            <th className="px-6 py-4 font-semibold">Email</th>
                            <th className="px-6 py-4 font-semibold">Role</th>
                            <th className="px-6 py-4 font-semibold">Status</th>
                            <th className="px-6 py-4 font-semibold">Joined Date</th>
                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredUsers.map((user) => (
                            <tr key={user._id} className="hover:bg-slate-50/80 transition-colors group">
                                <td className="px-6 py-4 font-medium text-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        {user.name}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-600">{user.email}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                                        {user.role === 'admin' ? 'Admin' : 'User'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${(user.isActive ?? true) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {(user.isActive ?? true) ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 flex items-center justify-end gap-3 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openModal(user)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><UserCog className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(user._id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                        {filteredUsers.length === 0 && (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                <div className="flex flex-col items-center justify-center">
                                    <svg className="w-12 h-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                    <p>No users found matching your search.</p>
                                </div>
                            </td></tr>
                        )}
                    </tbody>
                </table>
                </div>
            </div>

            <AdminModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                title={editingUser ? "Edit User" : "Add New User"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                            <input required type="text" className="w-full px-3 py-2 border border-slate-300 rounded-md" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <input required type="email" className="w-full px-3 py-2 border border-slate-300 rounded-md disabled:bg-slate-50 disabled:text-slate-500" disabled={!!editingUser} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                {editingUser ? 'New Password (Optional)' : 'Password'}
                            </label>
                            <input 
                                required={!editingUser} 
                                type="password" 
                                minLength={6} 
                                className="w-full px-3 py-2 border border-slate-300 rounded-md" 
                                placeholder={editingUser ? "Leave blank to keep current" : "Minimum 6 characters"} 
                                value={formData.password} 
                                onChange={e => setFormData({...formData, password: e.target.value})} 
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                            <select 
                                className="w-full px-3 py-2 border border-slate-300 rounded-md" 
                                value={formData.role} 
                                onChange={e => setFormData({...formData, role: e.target.value})}
                            >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                            <select 
                                className="w-full px-3 py-2 border border-slate-300 rounded-md" 
                                value={formData.isActive ? 'true' : 'false'} 
                                onChange={e => setFormData({...formData, isActive: e.target.value === 'true'})}
                            >
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
                            {loading ? 'Saving...' : (editingUser ? 'Update User' : 'Create User')}
                        </button>
                    </div>
                </form>
            </AdminModal>
        </div>
    );
};

export default UserManagement;
