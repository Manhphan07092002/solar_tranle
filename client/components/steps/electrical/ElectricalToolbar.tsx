import React from 'react';
import { MousePointer2, Pen, Wand2, Grid, HelpCircle, Undo, Redo, RotateCw, AlignLeft, AlignRight, AlignCenter, AlignVerticalJustifyCenter, AlignHorizontalJustifyCenter } from 'lucide-react';
import { DesignState } from '../../../types';
import { ActiveTool } from './types';

interface ElectricalToolbarProps {
    designData: DesignState;
    activeTool: ActiveTool;
    setActiveTool: (t: ActiveTool) => void;
    selectedModuleIndex: number | null;
    setSelectedModuleIndex: (v: number | null) => void;
    selectedModuleIndices: Set<number>;
    setSelectedModuleIndices: (v: Set<number>) => void;
    snapToGrid: boolean;
    setSnapToGrid: (v: boolean) => void;
    showHelp: boolean;
    setShowHelp: (v: boolean) => void;
    canUndo: boolean;
    canRedo: boolean;
    handleUndo: () => void;
    handleRedo: () => void;
    handleAutoStringing: () => void;
    alignModules: (alignment: 'left' | 'right' | 'center' | 'top' | 'bottom' | 'middle') => void;
    commitDesign: (next: DesignState) => void;
}

export default function ElectricalToolbar({
    designData,
    activeTool, setActiveTool,
    selectedModuleIndex, setSelectedModuleIndex,
    selectedModuleIndices, setSelectedModuleIndices,
    snapToGrid, setSnapToGrid,
    showHelp, setShowHelp,
    canUndo, canRedo,
    handleUndo, handleRedo,
    handleAutoStringing,
    alignModules,
    commitDesign,
}: ElectricalToolbarProps) {

    return (
        <div className="h-14 bg-white border-b border-slate-200 flex items-center px-4 justify-between shrink-0 shadow-sm z-20">
            <div className="flex items-center gap-2">
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button
                        onClick={() => {
                            setActiveTool('select');
                            setSelectedModuleIndex(null);
                            setSelectedModuleIndices(new Set());
                        }}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${activeTool === 'select'
                            ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                            }`}
                        title="Select Mode (V)"
                    >
                        <MousePointer2 size={16} />
                        Select
                    </button>
                    <button
                        onClick={() => setActiveTool('edit')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${activeTool === 'edit'
                            ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                            }`}
                        title="Edit Mode (E)"
                    >
                        <Pen size={16} />
                        Edit
                    </button>
                </div>

                <div className="w-[1px] h-6 bg-slate-200 mx-2" />

                <button
                    onClick={handleAutoStringing}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 rounded-lg text-sm font-medium flex items-center gap-2 border border-indigo-200 transition-colors"
                    title="Auto-generate strings for unassigned modules"
                >
                    <Wand2 size={16} />
                    Auto String
                </button>

                <div className="w-[1px] h-6 bg-slate-200 mx-2" />

                <button
                    onClick={() => setSnapToGrid(!snapToGrid)}
                    className={`p-2 rounded-lg transition-colors ${snapToGrid ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-slate-500 hover:bg-slate-100'}`}
                    title="Toggle Snap to Grid"
                >
                    <Grid size={18} />
                </button>

                <button
                    onClick={() => setShowHelp(!showHelp)}
                    className={`p-2 rounded-lg transition-colors ${showHelp ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-slate-500 hover:bg-slate-100'}`}
                    title="Help / Guide"
                >
                    <HelpCircle size={18} />
                </button>
            </div>

            <div className="flex items-center gap-2">
                {/* Selected count indicator */}
                {activeTool === 'edit' && (selectedModuleIndex !== null || selectedModuleIndices.size > 0) && (
                    <div className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-sm font-semibold shadow-md">
                        {selectedModuleIndices.size > 1 ? `${selectedModuleIndices.size} selected` : '1 selected'}
                    </div>
                )}

                {/* Edit Tools */}
                {activeTool === 'edit' && (selectedModuleIndex !== null || selectedModuleIndices.size > 0) && (
                    <div className="flex items-center gap-2 ml-2">
                        {selectedModuleIndices.size >= 2 && (
                            <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm border border-slate-200">
                                <button onClick={() => alignModules('left')} className="p-2 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Align Left"><AlignLeft size={18} /></button>
                                <button onClick={() => alignModules('center')} className="p-2 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Align Center Horizontal"><AlignCenter size={18} /></button>
                                <button onClick={() => alignModules('right')} className="p-2 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Align Right"><AlignRight size={18} /></button>
                                <div className="w-[1px] h-5 bg-slate-200 mx-1" />
                                <button onClick={() => alignModules('top')} className="p-2 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Align Top"><AlignVerticalJustifyCenter size={18} className="rotate-180" /></button>
                                <button onClick={() => alignModules('middle')} className="p-2 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Align Middle Vertical"><AlignHorizontalJustifyCenter size={18} /></button>
                                <button onClick={() => alignModules('bottom')} className="p-2 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Align Bottom"><AlignVerticalJustifyCenter size={18} /></button>
                            </div>
                        )}

                        <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm border border-slate-200">
                            <button
                                onClick={() => {
                                    const indicesToRotate = selectedModuleIndex !== null
                                        ? [selectedModuleIndex]
                                        : Array.from(selectedModuleIndices);
                                    commitDesign({
                                        ...designData,
                                        modules: designData.modules.map((mod, i) => {
                                            if (indicesToRotate.includes(i)) {
                                                const currentRotation = (mod as any).rotation || 0;
                                                const newRotation = (currentRotation + 90) % 360;
                                                return { ...mod, rotation: newRotation } as any;
                                            }
                                            return mod;
                                        })
                                    });
                                }}
                                className="p-2 rounded hover:bg-slate-100 text-slate-600 transition-colors"
                                title="Rotate 90° (R)"
                            >
                                <RotateCw size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Undo/Redo */}
                <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm border border-slate-200 ml-2">
                    <button
                        onClick={handleUndo}
                        disabled={!canUndo}
                        className={`p-2 rounded transition-colors ${canUndo ? 'hover:bg-slate-100 text-slate-600' : 'text-slate-300'}`}
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo size={18} />
                    </button>
                    <button
                        onClick={handleRedo}
                        disabled={!canRedo}
                        className={`p-2 rounded transition-colors ${canRedo ? 'hover:bg-slate-100 text-slate-600' : 'text-slate-300'}`}
                        title="Redo (Ctrl+Y)"
                    >
                        <Redo size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
