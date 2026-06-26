import React, { useState } from 'react';
import { LayoutDashboard, Sun, Zap, Users, FileText, LogOut, Home, Bell, Search, Settings } from 'lucide-react';
import AdminDashboard from './AdminDashboard';
import PanelManagement from './PanelManagement';
import InverterManagement from './InverterManagement';
import UserManagement from './UserManagement';
import SurveyManagement from './SurveyManagement';
import AdminSettings from './AdminSettings';

interface AdminLayoutProps {
    onExitAdmin: () => void;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ onExitAdmin }) => {
    const [activeTab, setActiveTab] = useState('dashboard');

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <AdminDashboard onNavigate={setActiveTab} />;
            case 'panels': return <PanelManagement />;
            case 'inverters': return <InverterManagement />;
            case 'users': return <UserManagement />;
            case 'surveys': return <SurveyManagement />;
            case 'settings': return <AdminSettings />;
            default: return <AdminDashboard onNavigate={setActiveTab} />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <div className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0">
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-white tracking-tight">Admin Panel</h2>
                    <p className="text-xs text-slate-500 mt-1">SolarEdge Designer Clone</p>
                </div>
                
                <nav className="flex-1 px-4 space-y-2 mt-4">
                    <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
                        <LayoutDashboard size={18} />
                        Dashboard
                    </button>
                    <button onClick={() => setActiveTab('panels')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === 'panels' ? 'bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-lg shadow-orange-500/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
                        <Sun size={18} />
                        Solar Panels
                    </button>
                    <button onClick={() => setActiveTab('inverters')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === 'inverters' ? 'bg-gradient-to-r from-yellow-500 to-yellow-400 text-white shadow-lg shadow-yellow-500/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
                        <Zap size={18} />
                        Inverters
                    </button>
                    <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === 'users' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white shadow-lg shadow-emerald-500/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
                        <Users size={18} />
                        Users
                    </button>
                    <button onClick={() => setActiveTab('surveys')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === 'surveys' ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
                        <FileText size={18} />
                        User Projects
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === 'settings' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
                        <Settings size={18} />
                        Settings
                    </button>
                </nav>
                
                <div className="p-4 border-t border-slate-800">
                    <button onClick={onExitAdmin} className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                        <Home className="w-5 h-5" />
                        <span className="font-medium">Exit Admin</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
                {/* Top Header */}
                <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-8 sticky top-0 z-10">
                    <div className="flex items-center bg-slate-100/80 px-4 py-2 rounded-full w-96 border border-slate-200/50 focus-within:ring-2 ring-blue-500/20 transition-all">
                        <Search className="w-4 h-4 text-slate-400 mr-2" />
                        <input type="text" placeholder="Global search..." className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder-slate-400" />
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <button className="text-slate-400 hover:text-blue-600 transition-colors relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                        <button className="text-slate-400 hover:text-blue-600 transition-colors">
                            <Settings className="w-5 h-5" />
                        </button>
                        <div className="h-8 w-px bg-slate-200"></div>
                        <div className="flex items-center gap-3 cursor-pointer group">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-medium shadow-sm group-hover:shadow-md transition-all">
                                A
                            </div>
                            <div className="hidden md:block">
                                <p className="text-sm font-semibold text-slate-700 leading-none">Admin</p>
                                <p className="text-xs text-slate-500 mt-1">System Manager</p>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-auto">
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {renderContent()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLayout;
