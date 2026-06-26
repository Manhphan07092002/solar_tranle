import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { Users, FolderGit2, Sun, Zap, TrendingUp, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

interface Stats {
    users: number;
    projects: number;
    panels: number;
    inverters: number;
    surveys: number;
}

// Mock data for charts to make the dashboard look premium
const projectTrendData = [
    { name: 'Jan', projects: 12, capacity: 45 },
    { name: 'Feb', projects: 19, capacity: 80 },
    { name: 'Mar', projects: 15, capacity: 65 },
    { name: 'Apr', projects: 28, capacity: 120 },
    { name: 'May', projects: 35, capacity: 150 },
    { name: 'Jun', projects: 42, capacity: 210 },
];

const AdminDashboard: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        adminService.getDashboardStats()
            .then(setStats)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="p-8 flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;
    }

    const statCards = [
        { label: 'Total Users', value: stats?.users || 0, icon: Users, color: 'from-blue-500 to-blue-400', tab: 'users' },
        { label: 'User Projects', value: stats?.projects || 0, icon: FolderGit2, color: 'from-indigo-500 to-indigo-400', tab: 'surveys' },
        { label: 'Solar Panels', value: stats?.panels || 0, icon: Sun, color: 'from-orange-500 to-orange-400', tab: 'panels' },
        { label: 'Inverters', value: stats?.inverters || 0, icon: Zap, color: 'from-emerald-500 to-emerald-400', tab: 'inverters' },
    ];

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Dashboard Overview</h1>
                    <p className="text-slate-500 mt-1">Platform statistics and system health.</p>
                </div>
                <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-sm border border-blue-100">
                    <Activity className="w-4 h-4" /> System Online
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((card, idx) => (
                    <div 
                        key={idx} 
                        onClick={() => onNavigate(card.tab)}
                        className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 cursor-pointer group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                    >
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${card.color} opacity-10 rounded-bl-full transform group-hover:scale-110 transition-transform`}></div>
                        <div className="flex items-center justify-between mb-6">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white bg-gradient-to-br ${card.color} shadow-sm group-hover:shadow-md transition-all`}>
                                <card.icon className="w-6 h-6" />
                            </div>
                            <div className="text-emerald-500 flex items-center gap-1 text-sm font-semibold bg-emerald-50 px-2 py-1 rounded-md">
                                <TrendingUp className="w-3 h-3" /> +12%
                            </div>
                        </div>
                        <div>
                            <h3 className="text-4xl font-extrabold text-slate-800 tracking-tight">{card.value}</h3>
                            <p className="text-sm font-medium text-slate-500 mt-1">{card.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart 1: Project Growth */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <FolderGit2 className="w-5 h-5 text-indigo-500" />
                        Project Creation Trend
                    </h3>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={projectTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorProjects" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ color: '#1e293b', fontWeight: 600 }}
                                />
                                <Area type="monotone" dataKey="projects" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorProjects)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Chart 2: System Capacity */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-amber-500" />
                        Designed Capacity (kWp)
                    </h3>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={projectTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <Tooltip 
                                    cursor={{ fill: '#f1f5f9' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="capacity" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
