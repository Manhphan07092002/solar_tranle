import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import AdminModal from './AdminModal';

const InverterManagement = () => {
    const [inverters, setInverters] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInverter, setEditingInverter] = useState<any>(null);
    const [formData, setFormData] = useState({ manufacturer: '', model: '', maxPowerAC: 5000, efficiency: 98.0, minStringLength: 8, maxStringLength: 20, isActive: true });
    const [loading, setLoading] = useState(false);

    const filteredInverters = inverters.filter(inv => 
        inv.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) || 
        inv.model.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const loadInverters = () => {
        adminService.getInverters().then(setInverters).catch(console.error);
    };

    useEffect(() => {
        loadInverters();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingInverter) {
                await adminService.updateInverter(editingInverter._id, formData);
            } else {
                await adminService.createInverter(formData);
            }
            setIsModalOpen(false);
            loadInverters();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this inverter?')) {
            try {
                await adminService.deleteInverter(id);
                loadInverters();
            } catch (error) {
                console.error(error);
            }
        }
    };

    const openModal = (inverter?: any) => {
        if (inverter) {
            setEditingInverter(inverter);
            setFormData({
                manufacturer: inverter.manufacturer,
                model: inverter.model,
                maxPowerAC: inverter.maxPowerAC,
                efficiency: inverter.efficiency,
                minStringLength: inverter.minStringLength,
                maxStringLength: inverter.maxStringLength,
                isActive: inverter.isActive
            });
        } else {
            setEditingInverter(null);
            setFormData({ manufacturer: '', model: '', maxPowerAC: 5000, efficiency: 98.0, minStringLength: 8, maxStringLength: 20, isActive: true });
        }
        setIsModalOpen(true);
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Inverters</h1>
                    <p className="text-slate-500 mt-1">Manage solar inverter database and specifications.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Search by brand or model..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-64 shadow-sm"
                        />
                        <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                        </svg>
                    </div>
                    <button 
                        onClick={() => openModal()}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-400 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
                    >
                        <Plus className="w-4 h-4" /> Add Inverter
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                            <th className="px-6 py-4 font-semibold">Inverter Model</th>
                            <th className="px-6 py-4 font-semibold">Max Power AC</th>
                            <th className="px-6 py-4 font-semibold">Efficiency</th>
                            <th className="px-6 py-4 font-semibold">String Lengths</th>
                            <th className="px-6 py-4 font-semibold">Status</th>
                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredInverters.map((inverter) => (
                            <tr key={inverter._id} className="hover:bg-slate-50/80 transition-colors group">
                                <td className="px-6 py-4 font-medium text-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p>{inverter.model}</p>
                                            <p className="text-xs text-slate-500 font-normal">{inverter.manufacturer}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-600">{inverter.maxPowerAC}W</td>
                                <td className="px-6 py-4 text-slate-600">{inverter.efficiency}%</td>
                                <td className="px-6 py-4 text-slate-600">{inverter.minStringLength} - {inverter.maxStringLength} mods</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${inverter.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {inverter.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 flex items-center justify-end gap-3 h-full pt-6 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openModal(inverter)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Edit2 className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(inverter._id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                        {filteredInverters.length === 0 && (
                            <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                <div className="flex flex-col items-center justify-center">
                                    <svg className="w-12 h-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    <p>No inverters found matching your search.</p>
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
                title={editingInverter ? 'Edit Inverter' : 'Add New Inverter'}
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
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Max AC Power (W)</label>
                            <input required type="number" className="w-full px-3 py-2 border border-slate-300 rounded-md" value={formData.maxPowerAC} onChange={e => setFormData({...formData, maxPowerAC: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Efficiency (%)</label>
                            <input required type="number" step="0.1" className="w-full px-3 py-2 border border-slate-300 rounded-md" value={formData.efficiency} onChange={e => setFormData({...formData, efficiency: Number(e.target.value)})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Min String Length</label>
                            <input required type="number" className="w-full px-3 py-2 border border-slate-300 rounded-md" value={formData.minStringLength} onChange={e => setFormData({...formData, minStringLength: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Max String Length</label>
                            <input required type="number" className="w-full px-3 py-2 border border-slate-300 rounded-md" value={formData.maxStringLength} onChange={e => setFormData({...formData, maxStringLength: Number(e.target.value)})} />
                        </div>
                    </div>
                    <div className="flex items-center mt-4">
                        <input type="checkbox" id="isActive" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mr-2" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
                        <label htmlFor="isActive" className="text-sm text-slate-700">Active (Visible to users)</label>
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
                            {loading ? 'Saving...' : 'Save Inverter'}
                        </button>
                    </div>
                </form>
            </AdminModal>
        </div>
    );
};

export default InverterManagement;
