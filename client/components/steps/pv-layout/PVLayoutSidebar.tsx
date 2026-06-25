import React, { useState } from 'react';
import { Grid, Eraser, Zap, Shield, ArrowUpDown, ArrowLeftRight, Sun, Moon, Calendar, Maximize, MousePointer2, Pen, ChevronDown, ChevronRight, Settings2, CloudSun } from 'lucide-react';
import { DesignState } from '../../../types';
import { MODULE_DATABASE } from '../../../constants';
import { ActiveTool, PVConfig, ModuleOrientation } from './types';

interface Props {
    designData: DesignState;
    setDesignData: React.Dispatch<React.SetStateAction<DesignState>>;
    pvConfig: PVConfig;
    setPvConfig: (partial: Partial<PVConfig>) => void;
    activeTool: ActiveTool;
    setActiveTool: (t: ActiveTool) => void;
    isRecalculatingShading: boolean;
    totalPower: number;
    onAutoLayout: () => void;
    onClearModules: () => void;
    onRecalculateShading: () => void;
}

const formatTime = (hour: number) => {
    const h = Math.floor(hour);
    const m = Math.floor((hour - h) * 60);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function PVLayoutSidebar({
    designData, setDesignData,
    pvConfig, setPvConfig,
    activeTool, setActiveTool,
    isRecalculatingShading, totalPower,
    onAutoLayout, onClearModules, onRecalculateShading,
}: Props) {
    const { rowSpacing, colSpacing, orientation, setback, sideSetback, simMonth, simHour, showShading } = pvConfig;
    
    // Accordion State
    const [expandedSection, setExpandedSection] = useState<'module' | 'placement' | 'shading'>('placement');

    const toggleSection = (section: 'module' | 'placement' | 'shading') => {
        setExpandedSection(prev => prev === section ? prev : section);
    };

    return (
        <div className="w-80 bg-white border-r border-slate-200 p-5 flex flex-col gap-4 z-10 shadow-xl overflow-y-auto">
            <div>
                <h3 className="font-bold text-slate-800 text-lg mb-1">PV Layout</h3>
                <p className="text-sm text-slate-500">Configure and place solar modules</p>
            </div>

            {/* Tool Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-lg w-full mb-2 shadow-inner">
                {(['select', 'edit'] as ActiveTool[]).map(tool => (
                    <button
                        key={tool}
                        onClick={() => setActiveTool(tool)}
                        className={`flex items-center justify-center gap-2 flex-1 py-1.5 px-3 text-sm font-medium rounded-md transition-all ${activeTool === tool
                                ? 'bg-white shadow text-blue-600 border border-slate-200/60'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                            }`}
                    >
                        {tool === 'select' ? <MousePointer2 size={16} /> : <Pen size={16} />}
                        {tool.charAt(0).toUpperCase() + tool.slice(1)}
                    </button>
                ))}
            </div>

            <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1">
                
                {/* ACCORDION 1: Module Specs */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <button 
                        onClick={() => toggleSection('module')}
                        className={`w-full flex items-center justify-between p-3 text-left transition-colors ${expandedSection === 'module' ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                    >
                        <div className="flex items-center gap-2 font-semibold text-slate-700">
                            <Zap size={16} className="text-blue-500" />
                            <span className="text-sm">Module Specifications</span>
                        </div>
                        {expandedSection === 'module' ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                    </button>
                    
                    {expandedSection === 'module' && (
                        <div className="p-4 bg-white border-t border-slate-100 space-y-3 animate-in slide-in-from-top-2 duration-200">
                            <select
                                className="w-full border-2 border-slate-200 rounded-lg p-2.5 bg-slate-50 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
                                value={designData.selectedModule?.id}
                                onChange={e => {
                                    const m = MODULE_DATABASE.find(mod => mod.id === e.target.value) || MODULE_DATABASE[0];
                                    setDesignData(prev => ({ ...prev, selectedModule: m }));
                                }}
                            >
                                {MODULE_DATABASE.map(m => (
                                    <option key={m.id} value={m.id}>{m.manufacturer} - {m.model} ({m.power}W)</option>
                                ))}
                            </select>
                            {designData.selectedModule && (
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-600 space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Dimensions</span>
                                        <span className="font-semibold text-slate-700">{designData.selectedModule.width} x {designData.selectedModule.height} mm</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Power Rating</span>
                                        <span className="font-semibold text-blue-600">{designData.selectedModule.power} W</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Technology</span>
                                        <span className="font-semibold text-slate-700">Mono N-type</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ACCORDION 2: Placement Rules */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <button 
                        onClick={() => toggleSection('placement')}
                        className={`w-full flex items-center justify-between p-3 text-left transition-colors ${expandedSection === 'placement' ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                    >
                        <div className="flex items-center gap-2 font-semibold text-slate-700">
                            <Settings2 size={16} className="text-orange-500" />
                            <span className="text-sm">Placement Rules</span>
                        </div>
                        {expandedSection === 'placement' ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                    </button>
                    
                    {expandedSection === 'placement' && (
                        <div className="p-4 bg-white border-t border-slate-100 space-y-5 animate-in slide-in-from-top-2 duration-200">
                            
                            {/* Orientation Selection (Visual) */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                                    Module Orientation
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['portrait', 'landscape'] as ModuleOrientation[]).map(o => (
                                        <button 
                                            key={o} 
                                            onClick={() => setPvConfig({ orientation: o })}
                                            className={`flex flex-col items-center justify-center gap-2 py-3 rounded-lg border-2 transition-all ${
                                                orientation === o 
                                                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                                                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className={`border-2 rounded-sm ${orientation === o ? 'border-blue-500 bg-blue-100' : 'border-slate-400 bg-slate-100'}`} 
                                                 style={{ 
                                                     width: o === 'portrait' ? '12px' : '20px', 
                                                     height: o === 'portrait' ? '20px' : '12px' 
                                                 }} 
                                            />
                                            <span className="text-xs font-medium">{o.charAt(0).toUpperCase() + o.slice(1)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Spacing */}
                            <div className="flex gap-4">
                                {[
                                    { label: 'Row Spacing (m)', icon: <ArrowUpDown size={14} className="text-slate-400" />, key: 'rowSpacing' as const, val: rowSpacing },
                                    { label: 'Col Spacing (m)', icon: <ArrowLeftRight size={14} className="text-slate-400" />, key: 'colSpacing' as const, val: colSpacing },
                                ].map(({ label, icon, key, val }) => (
                                    <div key={key} className="space-y-1.5 flex-1">
                                        <label className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">{label}</label>
                                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition-all">
                                            {icon}
                                            <input type="number" min="0" max="1" step="0.01" value={val}
                                                onChange={e => setPvConfig({ [key]: Number(e.target.value) })}
                                                className="w-full text-sm p-1.5 bg-transparent font-medium text-slate-700 outline-none" />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Setbacks */}
                            <div className="space-y-4 pt-2">
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 uppercase tracking-wider">
                                            <Shield size={12} /> Ridge Setback
                                        </label>
                                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 rounded">{setback}m</span>
                                    </div>
                                    <input type="range" min="0" max="2" step="0.05" value={setback}
                                        onChange={e => setPvConfig({ setback: Number(e.target.value) })}
                                        className="w-full accent-blue-500 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                                </div>

                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 uppercase tracking-wider">
                                            <Shield size={12} /> Edge Setback
                                        </label>
                                        <span className="text-xs font-bold text-orange-500 bg-orange-50 px-1.5 rounded">{sideSetback}m</span>
                                    </div>
                                    <input type="range" min="0" max="2" step="0.05" value={sideSetback}
                                        onChange={e => setPvConfig({ sideSetback: Number(e.target.value) })}
                                        className="w-full accent-orange-500 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                                </div>
                            </div>
                            
                            {/* Action Buttons inside Placement */}
                            <div className="pt-2 grid grid-cols-2 gap-3">
                                <button onClick={onAutoLayout}
                                    className="bg-blue-600 text-white px-3 py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0">
                                    <Grid size={16} /> Auto Fill
                                </button>
                                <button onClick={onClearModules}
                                    className="bg-white border-2 border-slate-200 text-slate-600 px-3 py-2.5 rounded-lg font-medium text-sm hover:bg-slate-50 hover:border-slate-300 hover:text-red-600 flex items-center justify-center gap-2 transition-all">
                                    <Eraser size={16} /> Clear
                                </button>
                            </div>

                        </div>
                    )}
                </div>

                {/* ACCORDION 3: Shading Analysis */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <button 
                        onClick={() => toggleSection('shading')}
                        className={`w-full flex items-center justify-between p-3 text-left transition-colors ${expandedSection === 'shading' ? 'bg-amber-50/50' : 'hover:bg-slate-50'}`}
                    >
                        <div className="flex items-center gap-2 font-semibold text-slate-700">
                            <CloudSun size={16} className="text-amber-500" />
                            <span className="text-sm">Shading Analysis</span>
                        </div>
                        {expandedSection === 'shading' ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                    </button>
                    
                    {expandedSection === 'shading' && (
                        <div className="p-4 bg-white border-t border-slate-100 space-y-4 animate-in slide-in-from-top-2 duration-200">
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Calendar size={12} /> Month</label>
                                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-1.5 rounded">{MONTHS[simMonth - 1]}</span>
                                </div>
                                <input type="range" min="1" max="12" step="1" value={simMonth}
                                    onChange={e => setPvConfig({ simMonth: Number(e.target.value) })}
                                    className="w-full accent-amber-500 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer mt-2" />
                            </div>
                            
                            <div className="space-y-1 pt-1">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Sun size={12} /> Time</label>
                                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-1.5 rounded">{formatTime(simHour)}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <Moon size={14} className="text-slate-400" />
                                    <input type="range" min="6" max="18" step="0.5" value={simHour}
                                        onChange={e => setPvConfig({ simHour: Number(e.target.value) })}
                                        className="w-full flex-1 accent-amber-500 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                                    <Sun size={14} className="text-amber-500" />
                                </div>
                            </div>
                            
                            <div className="pt-2 flex items-center justify-between border-t border-slate-100 mt-2">
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                                    <input type="checkbox" checked={showShading}
                                        onChange={e => setPvConfig({ showShading: e.target.checked })}
                                        className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500" />
                                    Show Shadows
                                </label>
                            </div>
                            
                            <button onClick={onRecalculateShading} disabled={isRecalculatingShading}
                                className={`w-full py-2.5 rounded-lg font-bold text-sm transition-all shadow-md active:translate-y-0 ${isRecalculatingShading ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-slate-800 text-white hover:bg-slate-900 hover:shadow-lg hover:-translate-y-0.5'
                                    }`}>
                                {isRecalculatingShading ? 'Calculating...' : 'Run Shading Analysis'}
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
