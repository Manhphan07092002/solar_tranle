import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { Trash2, FileText } from 'lucide-react';

const SurveyManagement = () => {
    const [projects, setProjects] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    const filteredProjects = projects.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (p.owner && p.owner.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === 'all' || p.status.toLowerCase() === statusFilter.toLowerCase();
        return matchesSearch && matchesStatus;
    });

    const loadProjects = async () => {
        try {
            const data = await adminService.getProjects();
            setProjects(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProjects();
    }, []);

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this project?')) {
            try {
                await adminService.deleteProject(id);
                loadProjects();
            } catch (error) {
                console.error(error);
            }
        }
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">User Projects</h1>
                    <p className="text-slate-500 mt-1">Manage solar PV design projects created by users.</p>
                </div>
                <div className="flex items-center gap-4">
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    >
                        <option value="all">All Statuses</option>
                        <option value="draft">Draft</option>
                        <option value="designed">Designed</option>
                    </select>
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Search projects or owners..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64 shadow-sm"
                        />
                        <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                        </svg>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                            <th className="px-6 py-4 font-semibold">Project Name</th>
                            <th className="px-6 py-4 font-semibold">Owner/Client</th>
                            <th className="px-6 py-4 font-semibold">Creator</th>
                            <th className="px-6 py-4 font-semibold">Capacity</th>
                            <th className="px-6 py-4 font-semibold">Status</th>
                            <th className="px-6 py-4 font-semibold">Date</th>
                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading && <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500"><div className="w-8 h-8 mx-auto border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></td></tr>}
                        {!loading && filteredProjects.map(project => (
                            <tr key={project._id} className="hover:bg-slate-50/80 transition-colors group">
                                <td className="px-6 py-4 font-medium text-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                            {project.thumbnailUrl ? (
                                                <img src={project.thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover rounded-lg" />
                                            ) : (
                                                <FileText className="w-5 h-5" />
                                            )}
                                        </div>
                                        <div>
                                            <p>{project.name}</p>
                                            <p className="text-xs text-slate-500 font-normal">{project.type}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-600">{project.owner || '-'}</td>
                                <td className="px-6 py-4 text-slate-600">
                                    <p className="font-medium">{project.userId?.name || 'Unknown'}</p>
                                    <p className="text-xs text-slate-500">{project.userId?.email || ''}</p>
                                </td>
                                <td className="px-6 py-4 text-slate-600">{project.capacityKWp || 0} kWp</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${project.status === 'Designed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        <span className="capitalize">{project.status}</span>
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                    {new Date(project.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 flex items-center justify-end gap-3 h-full pt-6 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleDelete(project._id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                        {!loading && filteredProjects.length === 0 && (
                            <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                <div className="flex flex-col items-center justify-center">
                                    <svg className="w-12 h-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                    <p>No projects found matching your criteria.</p>
                                </div>
                            </td></tr>
                        )}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    );
};

export default SurveyManagement;
