import React, { useState } from 'react';
import { Zap, Plus, Trash2, AlertCircle, CheckCircle2, X, Info } from 'lucide-react';
import { DesignState, PVString, Inverter } from '../../../types';

interface ElectricalSidebarProps {
    designData: DesignState;
    setDesignData: React.Dispatch<React.SetStateAction<DesignState>>;
    strings: PVString[];
    activeStringId: string | null;
    setActiveStringId: (id: string | null) => void;
    dcAcRatio: number;
    minStringLen: number;
    maxStringLen: number;
    showModuleInfo: boolean;
    setShowModuleInfo: (v: boolean) => void;
    selectedModuleInfo: any;
    handleAddString: () => string;
    handleDeleteString: (id: string, e: React.MouseEvent) => void;
}

export default function ElectricalSidebar({
    designData, setDesignData,
    strings, activeStringId, setActiveStringId,
    dcAcRatio, minStringLen, maxStringLen,
    showModuleInfo, setShowModuleInfo,
    selectedModuleInfo,
    handleAddString, handleDeleteString,
}: ElectricalSidebarProps) {

    // Inverters State
    const [invertersDb, setInvertersDb] = useState<Inverter[]>([]);

    React.useEffect(() => {
        fetch('/api/public/inverters')
            .then(res => res.json())
            .then(data => {
                // Map the DB _id to id to match Inverter interface
                const mappedData = data.map((d: any) => ({ ...d, id: d._id }));
                setInvertersDb(mappedData);
                
                // Set initial selection if none exists
                if (mappedData.length > 0 && !designData.selectedInverter) {
                    setDesignData(prev => ({ ...prev, selectedInverter: mappedData[0] }));
                }
            })
            .catch(console.error);
    }, []);

    return (
        <div className="w-96 bg-gradient-to-b from-slate-50 to-white border-r border-slate-200 flex flex-col z-10 shadow-2xl">
            <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg shadow-md">
                        <Zap className="text-white" size={20} />
                    </div>
                    <span className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                        Electrical Design
                    </span>
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Inverter Config */}
                <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Inverter Selection</label>
                    <select
                        className="w-full border-2 border-slate-200 rounded-lg p-2.5 bg-white text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-sm"
                        value={designData.selectedInverter?.id || ''}
                        onChange={(e) => {
                            const inv = invertersDb.find(i => i.id === e.target.value) || invertersDb[0];
                            setDesignData(prev => ({ ...prev, selectedInverter: inv }));
                        }}
                    >
                        {invertersDb.length === 0 && <option value="">Loading...</option>}
                        {invertersDb.map(inv => (
                            <option key={inv.id} value={inv.id}>{inv.manufacturer} {inv.model} ({(inv.maxPowerAC / 1000).toFixed(1)}kW)</option>
                        ))}
                    </select>
                    <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border-2 border-slate-200 shadow-sm space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-600">DC/AC Ratio</span>
                            <span className={`font-bold text-lg px-3 py-1 rounded-lg ${dcAcRatio > 1.3 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {dcAcRatio.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                            <span className="text-sm font-medium text-slate-600">MPPT Range</span>
                            <span className="font-mono font-bold text-slate-800 bg-white px-3 py-1 rounded-lg border border-slate-200">
                                {minStringLen}-{maxStringLen} mods
                            </span>
                        </div>
                    </div>
                </div>

                {/* Module Info Panel */}
                {showModuleInfo && selectedModuleInfo && (
                    <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                                <Info size={16} />
                                Module Info
                            </h3>
                            <button
                                onClick={() => setShowModuleInfo(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        {selectedModuleInfo.count ? (
                            <div className="space-y-2 text-xs">
                                <div className="font-semibold text-slate-700">
                                    {selectedModuleInfo.count} modules selected
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Position:</span>
                                    <span className="font-mono font-bold text-slate-800">
                                        ({selectedModuleInfo.x}, {selectedModuleInfo.y})
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Rotation:</span>
                                    <span className="font-mono font-bold text-slate-800">
                                        {selectedModuleInfo.rotation}°
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-600">String:</span>
                                    <span className="font-semibold text-slate-800">
                                        {selectedModuleInfo.stringName}
                                    </span>
                                </div>
                                {selectedModuleInfo.nearestDistance !== null && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Nearest Module:</span>
                                        <span className="font-mono font-bold text-slate-800">
                                            {selectedModuleInfo.nearestDistance}px
                                        </span>
                                    </div>
                                )}
                                {selectedModuleInfo.violations.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-red-200">
                                        <div className="text-red-600 font-semibold mb-1">⚠️ Violations:</div>
                                        <ul className="list-disc list-inside text-red-500">
                                            {selectedModuleInfo.violations.map((v: string, i: number) => (
                                                <li key={i} className="text-[10px]">{v}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Strings List */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">PV Strings</label>
                        <button
                            onClick={handleAddString}
                            className="text-xs flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-1.5 rounded-lg hover:from-blue-600 hover:to-indigo-700 font-semibold transition-all shadow-md hover:shadow-lg transform hover:scale-105"
                        >
                            <Plus size={14} /> Add String
                        </button>
                    </div>

                    <div className="space-y-3">
                        {strings.length === 0 && (
                            <div className="text-center p-6 border-2 border-dashed border-slate-300 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 text-slate-500">
                                <Zap className="mx-auto mb-2 opacity-50" size={24} />
                                <p className="text-sm font-medium">No strings created yet.</p>
                                <p className="text-xs mt-1">Click "Add String" to get started</p>
                            </div>
                        )}

                        {strings.map(str => {
                            const count = designData.modules.filter(m => m.stringId === str.id).length;
                            const isActive = activeStringId === str.id;
                            const isValid = count >= minStringLen && count <= maxStringLen;

                            return (
                                <div
                                    key={str.id}
                                    onClick={() => setActiveStringId(str.id)}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative group shadow-sm hover:shadow-md
                                    ${isActive
                                            ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-400 ring-2 ring-blue-300 ring-offset-2'
                                            : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                                        }
                                `}
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-4 h-4 rounded-full shadow-md ring-2 ring-white"
                                                style={{ backgroundColor: str.color }}
                                            />
                                            <span className={`font-bold text-sm ${isActive ? 'text-blue-700' : 'text-slate-800'}`}>
                                                {str.name}
                                            </span>
                                        </div>
                                        <button
                                            onClick={(e) => handleDeleteString(str.id, e)}
                                            className="text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-lg"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                        <span className="text-xs font-semibold text-slate-600">
                                            {count} <span className="text-slate-400">Modules</span>
                                        </span>
                                        {!isValid ? (
                                            <span className="flex items-center gap-1.5 text-red-600 font-bold text-xs bg-red-50 px-2 py-1 rounded-lg" title={`Must be between ${minStringLen} and ${maxStringLen} modules`}>
                                                <AlertCircle size={14} />
                                                {count < minStringLen ? 'Too Short' : 'Too Long'}
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5 text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded-lg">
                                                <CheckCircle2 size={14} />
                                                Valid
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
