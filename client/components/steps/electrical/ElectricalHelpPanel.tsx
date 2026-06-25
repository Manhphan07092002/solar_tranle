import React from 'react';
import { HelpCircle, X, MousePointer2, Zap } from 'lucide-react';

interface ElectricalHelpPanelProps {
    showHelp: boolean;
    setShowHelp: (v: boolean) => void;
}

export default function ElectricalHelpPanel({ showHelp, setShowHelp }: ElectricalHelpPanelProps) {
    if (!showHelp) return null;
    return (
        <div className="absolute top-16 right-4 w-80 bg-white rounded-lg shadow-xl border border-slate-200 p-4 z-50 animate-fade-in-down">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <HelpCircle size={20} className="text-blue-500" /> Help & Shortcuts
                </h3>
                <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={18} />
                </button>
            </div>
            <div className="space-y-4">
                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                    <div className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
                        <MousePointer2 size={14} /> Tools
                    </div>
                    <ul className="text-xs space-y-1">
                        <li><span className="font-semibold">Select Mode (V):</span> Add modules to strings or move individually.</li>
                        <li><span className="font-semibold">Edit Mode (E):</span> Drag, rotate, or delete modules.</li>
                    </ul>
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                    <div className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
                        <Zap size={14} /> Functions
                    </div>
                    <p className="text-xs">Use <strong>Add String</strong> or <strong>Auto String</strong> to organize modules. Check violations in real-time.</p>
                </div>
            </div>
        </div>
    );
}
