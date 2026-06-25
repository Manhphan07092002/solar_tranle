import React from 'react';
import { Grid, Eraser, Zap, Shield, ArrowUpDown, ArrowLeftRight, Sun, Moon, Calendar, Maximize, MousePointer2, Pen } from 'lucide-react';
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

    return (
        <div className="w-80 bg-white border-r border-slate-200 p-6 flex flex-col gap-6 z-10 shadow-xl overflow-y-auto">
            <div>
                <h3 className="font-bold text-slate-800 text-lg mb-1">PV Module Layout</h3>
                <p className="text-sm text-slate-500">Select panels and auto-fill roof surfaces.</p>
            </div>

            {/* Tool Switcher */}
            <div className="flex bg-slate-50 border border-slate-200 p-1 rounded-lg w-full">
                {(['select', 'edit'] as ActiveTool[]).map(tool => (
                    <button
                        key={tool}
                        onClick={() => setActiveTool(tool)}
                        className={`flex items-center justify-center gap-2 flex-1 py-1.5 px-3 text-sm font-medium rounded-md transition-all ${activeTool === tool
                                ? 'bg-white shadow-sm text-blue-600 border border-slate-200/60'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                            }`}
                    >
                        {tool === 'select' ? <MousePointer2 size={16} /> : <Pen size={16} />}
                        {tool.charAt(0).toUpperCase() + tool.slice(1)}
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {/* Module Selector */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Select PV Module</label>
                    <select
                        className="w-full border rounded-lg p-2.5 bg-slate-50"
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
                        <div className="bg-slate-50 p-3 rounded border text-xs text-slate-600 space-y-1">
                            <p>Dimensions: {designData.selectedModule.width} x {designData.selectedModule.height} mm</p>
                            <p>Power: {designData.selectedModule.power} W</p>
                            <p>Tech: Monocrystalline N-type</p>
                        </div>
                    )}
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                    {/* Ridge Setback */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                            <Shield size={13} className="text-blue-500" /> Ridge Setback (m)
                        </label>
                        <div className="flex items-center gap-2">
                            <input type="range" min="0" max="2" step="0.05" value={setback}
                                onChange={e => setPvConfig({ setback: Number(e.target.value) })}
                                className="flex-1 accent-blue-500" />
                            <input type="number" min="0" max="2" step="0.05" value={setback}
                                onChange={e => setPvConfig({ setback: Math.max(0, Math.min(2, Number(e.target.value))) })}
                                className="w-16 text-xs p-1 border border-blue-300 rounded text-center text-blue-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        </div>
                    </div>

                    {/* Side Setback */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                            <Shield size={13} className="text-orange-400" /> Side Edge Setback (m)
                        </label>
                        <div className="flex items-center gap-2">
                            <input type="range" min="0" max="2" step="0.05" value={sideSetback}
                                onChange={e => setPvConfig({ sideSetback: Number(e.target.value) })}
                                className="flex-1 accent-orange-500" />
                            <input type="number" min="0" max="2" step="0.05" value={sideSetback}
                                onChange={e => setPvConfig({ sideSetback: Math.max(0, Math.min(2, Number(e.target.value))) })}
                                className="w-16 text-xs p-1 border border-orange-300 rounded text-center text-orange-600 font-semibold focus:outline-none focus:ring-1 focus:ring-orange-400" />
                        </div>
                    </div>

                    {/* Orientation */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                            <Maximize size={14} className="text-slate-500" /> Module Orientation
                        </label>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            {(['portrait', 'landscape'] as ModuleOrientation[]).map(o => (
                                <button key={o} onClick={() => setPvConfig({ orientation: o })}
                                    className={`flex-1 py-1 text-xs font-medium rounded ${orientation === o ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                                    {o.charAt(0).toUpperCase() + o.slice(1)}
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
                            <div key={key} className="space-y-2 flex-1">
                                <label className="text-xs font-semibold text-slate-700 block">{label}</label>
                                <div className="flex items-center gap-2">
                                    {icon}
                                    <input type="number" min="0" max="1" step="0.01" value={val}
                                        onChange={e => setPvConfig({ [key]: Number(e.target.value) })}
                                        className="w-full text-xs p-1 border rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                    <button onClick={onAutoLayout}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 flex items-center justify-center gap-2">
                        <Grid size={16} /> Auto Layout
                    </button>
                    <button onClick={onClearModules}
                        className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium text-sm hover:bg-slate-50 flex items-center justify-center gap-2">
                        <Eraser size={16} /> Clear
                    </button>
                </div>

                {/* Sun Path Simulation */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex items-center gap-2 text-slate-700 mb-1">
                        <Sun size={16} className="text-amber-500" />
                        <h4 className="font-bold text-sm">Sun Path Simulation</h4>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                            <span className="flex items-center gap-1"><Calendar size={12} /> Month</span>
                            <span className="text-amber-600 font-medium">{MONTHS[simMonth - 1]}</span>
                        </label>
                        <input type="range" min="1" max="12" step="1" value={simMonth}
                            onChange={e => setPvConfig({ simMonth: Number(e.target.value) })}
                            className="w-full accent-amber-500" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                            <span className="flex items-center gap-1"><Sun size={12} /> Time of Day</span>
                            <span className="text-amber-600 font-medium">{formatTime(simHour)}</span>
                        </label>
                        <div className="flex items-center gap-2">
                            <Moon size={14} className="text-slate-400" />
                            <input type="range" min="6" max="18" step="0.5" value={simHour}
                                onChange={e => setPvConfig({ simHour: Number(e.target.value) })}
                                className="w-full flex-1 accent-amber-500" />
                            <Sun size={14} className="text-amber-500" />
                        </div>
                    </div>
                    <div className="pt-2">
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                            <input type="checkbox" checked={showShading}
                                onChange={e => setPvConfig({ showShading: e.target.checked })}
                                className="rounded border-slate-300 text-amber-500 focus:ring-amber-500" />
                            Show Shading
                        </label>
                    </div>
                    <button onClick={onRecalculateShading} disabled={isRecalculatingShading}
                        className={`w-full py-2 rounded-lg font-medium text-sm transition-colors ${isRecalculatingShading ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-slate-700 text-white hover:bg-slate-800'
                            }`}>
                        {isRecalculatingShading ? 'Calculating...' : 'Recalculate Shading'}
                    </button>
                </div>
            </div>

            {/* Summary */}
            <div className="mt-auto bg-blue-50 p-4 rounded-xl border border-blue-100">
                <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <Zap size={18} className="text-blue-500" /> System Summary
                </h4>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-blue-700">Module Count</span>
                        <span className="font-bold text-slate-800">{designData.modules.length}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-blue-700">Total Capacity</span>
                        <span className="font-bold text-slate-800">{(totalPower / 1000).toFixed(2)} kWp</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
