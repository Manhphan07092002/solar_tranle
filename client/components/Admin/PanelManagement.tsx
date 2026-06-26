import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import AdminModal from './AdminModal';

const PanelManagement = () => {
    const [panels, setPanels] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPanel, setEditingPanel] = useState<any>(null);
    const [formData, setFormData] = useState({ manufacturer: '', model: '', power: 400, width: 1134, height: 1722, isActive: true });
    const [loading, setLoading] = useState(false);

    const filteredPanels = panels.filter(p => 
        p.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.model.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const loadPanels = () => {
        adminService.getPanels().then(setPanels).catch(console.error);
    };

    useEffect(() => {
        loadPanels();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingPanel) {
                await adminService.updatePanel(editingPanel._id, formData);
            } else {
                await adminService.createPanel(formData);
            }
            setIsModalOpen(false);
            loadPanels();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this panel?')) {
            try {
                await adminService.deletePanel(id);
                loadPanels();
            } catch (error) {
                console.error(error);
            }
        }
    };

    const openModal = (panel?: any) => {
        if (panel) {
            setEditingPanel(panel);
            setFormData({
                manufacturer: panel.manufacturer,
                model: panel.model,
                power: panel.power,
                width: panel.width,
                height: panel.height,
                isActive: panel.isActive
            });
        } else {
            setEditingPanel(null);
            setFormData({ manufacturer: '', model: '', power: 400, width: 1134, height: 1722, isActive: true });
        }
        setIsModalOpen(true);
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Solar Panels</h1>
                    <p className="text-slate-500 mt-1">Manage PV module database for system designs.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Search by brand or model..." 
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
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-400 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-orange-500/30 transition-all"
                    >
                        <Plus className="w-4 h-4" /> Add Panel
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                            <th className="px-6 py-4 font-semibold">Panel Model</th>
                            <th className="px-6 py-4 font-semibold">Power (W)</th>
                            <th className="px-6 py-4 font-semibold">Dimensions (mm)</th>
                            <th className="px-6 py-4 font-semibold">Status</th>
                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredPanels.map((panel) => (
                            <tr key={panel._id} className="hover:bg-slate-50/80 transition-colors group">
                                <td className="px-6 py-4 font-medium text-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p>{panel.model}</p>
                                            <p className="text-xs text-slate-500 font-normal">{panel.manufacturer}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-600">{panel.power}W</td>
                                <td className="px-6 py-4 text-slate-600">{panel.width} × {panel.height}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${panel.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {panel.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 flex items-center justify-end gap-3 h-full pt-6 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openModal(panel)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Edit2 className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(panel._id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                        {filteredPanels.length === 0 && (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                <div className="flex flex-col items-center justify-center">
                                    <svg className="w-12 h-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                    <p>No panels found matching your search.</p>
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
                title={editingPanel ? 'Edit Panel' : 'Add New Panel'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Manufacturer</label>
                            <input required type="text" className="w-full px-3 py-2 border border-slate-300 rounded-md" value={formData.manufacturer} onChange={e => setFormData({...formData, manufacturer: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                            <input required type="text" className="w-full px-3 py-2 border border-slate-300 rounded-md" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Power (W)</label>
                            <input required type="number" className="w-full px-3 py-2 border border-slate-300 rounded-md" value={formData.power} onChange={e => setFormData({...formData, power: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Width (mm)</label>
                            <input required type="number" className="w-full px-3 py-2 border border-slate-300 rounded-md" value={formData.width} onChange={e => setFormData({...formData, width: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Height (mm)</label>
                            <input required type="number" className="w-full px-3 py-2 border border-slate-300 rounded-md" value={formData.height} onChange={e => setFormData({...formData, height: Number(e.target.value)})} />
                        </div>
                    </div>
                    <div className="flex items-center mt-4">
                        <input type="checkbox" id="isActive" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mr-2" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
                        <label htmlFor="isActive" className="text-sm text-slate-700">Active (Visible to users)</label>
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
                            {loading ? 'Saving...' : 'Save Panel'}
                        </button>
                    </div>
                </form>
            </AdminModal>
        </div>
    );
};

export default PanelManagement;
