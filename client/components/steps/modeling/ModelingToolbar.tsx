import React from 'react';
import {
    MousePointer2, Ruler, HelpCircle, Layers, Box, Pentagon, TreeDeciduous,
    SplitSquareHorizontal, Copy, Clipboard, Undo, Redo, CheckCircle2, X, AlertTriangle
} from 'lucide-react';
import { DesignState } from '../../../types';
import { ActiveTool, CopiedObjects, MeasurementResult } from './types';

interface ModelingToolbarProps {
    activeTool: ActiveTool;
    setActiveTool: (tool: ActiveTool) => void;
    setIsDrawing: (drawing: boolean) => void;
    setPoints: (points: { x: number, y: number }[]) => void;
    selectedId: string | null;
    setSelectedId: (id: string | null) => void;
    selectedIds: Set<string>;
    setSelectedIds: (ids: Set<string>) => void;
    measurementMode: boolean;
    setMeasurementMode: (mode: boolean) => void;
    showHelp: boolean;
    setShowHelp: (show: boolean) => void;
    showLayerPanel: boolean;
    setShowLayerPanel: (show: boolean) => void;
    designData: DesignState;
    commitDesign: (design: DesignState) => void;
    handleCopy: () => void;
    handlePaste: () => void;
    copiedObjects: CopiedObjects | null;
    handleUndo: () => void;
    handleRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    validationErrors: Map<string, string[]>;
    validationWarnings: Map<string, string[]>;
    validationStrict: boolean;
    setValidationStrict: (strict: boolean) => void;
    setValidationErrors: (errors: Map<string, string[]>) => void;
    setValidationWarnings: (warnings: Map<string, string[]>) => void;
    setDismissedWarnings: (warnings: Set<string>) => void;
    handleAutoFixInvalidPoints: () => void;
    measurementResults: MeasurementResult[];
    setMeasurementResults: (results: MeasurementResult[]) => void;
}

export default function ModelingToolbar({
    activeTool, setActiveTool, setIsDrawing, setPoints,
    selectedId, setSelectedId, selectedIds, setSelectedIds,
    measurementMode, setMeasurementMode, showHelp, setShowHelp, showLayerPanel, setShowLayerPanel,
    designData, commitDesign, handleCopy, handlePaste, copiedObjects, handleUndo, handleRedo, canUndo, canRedo,
    validationErrors, validationWarnings, validationStrict, setValidationStrict, setValidationErrors, setValidationWarnings, setDismissedWarnings, handleAutoFixInvalidPoints,
    measurementResults, setMeasurementResults
}: ModelingToolbarProps) {
    return (
        <>
            {/* Top Toolbar */}
            <div className="h-12 bg-white border-b border-slate-200 flex items-center px-4 justify-between shrink-0 select-none z-30 shadow-sm text-slate-600">
                <div className="flex items-center gap-1">
                    <button onClick={() => { setActiveTool('select'); setIsDrawing(false); setPoints([]); }} className={`p-2 rounded hover:bg-slate-100 ${activeTool === 'select' ? 'text-blue-600 bg-blue-50' : ''}`} title="Select (V)"><MousePointer2 size={20} /></button>
                    <div className="w-[1px] h-6 bg-slate-200 mx-1" />
                    <button onClick={() => setMeasurementMode(!measurementMode)} className={`p-2 rounded hover:bg-slate-100 ${measurementMode ? 'text-green-600 bg-green-50' : ''}`} title="Measurement (M)"><Ruler size={20} /></button>
                    <div className="w-[1px] h-6 bg-slate-200 mx-1" />
                    <button onClick={() => setShowHelp(!showHelp)} className={`p-2 rounded hover:bg-slate-100 ${showHelp ? 'text-blue-600 bg-blue-50' : ''}`}><HelpCircle size={20} /></button>
                    <button onClick={() => setShowLayerPanel(!showLayerPanel)} className={`p-2 rounded hover:bg-slate-100 ${showLayerPanel ? 'text-blue-600 bg-blue-50' : ''}`} title="Layers"><Layers size={20} /></button>
                    <div className="w-[1px] h-6 bg-slate-200 mx-1" />
                    <button onClick={() => { setActiveTool('roof'); setIsDrawing(false); setSelectedId(null); setSelectedIds(new Set()); }} className={`p-2 rounded hover:bg-slate-100 ${activeTool === 'roof' ? 'text-blue-600 bg-blue-50' : ''}`} title="Roof (P)"><Box size={20} /></button>
                    <button onClick={() => { setActiveTool('obstruction'); setIsDrawing(false); setSelectedId(null); setSelectedIds(new Set()); }} className={`p-2 rounded hover:bg-slate-100 ${activeTool === 'obstruction' ? 'text-blue-600 bg-blue-50' : ''}`} title="Obs (O)"><Pentagon size={20} /></button>
                    <button onClick={() => { setActiveTool('tree'); setIsDrawing(false); setSelectedId(null); setSelectedIds(new Set()); }} className={`p-2 rounded hover:bg-slate-100 ${activeTool === 'tree' ? 'text-blue-600 bg-blue-50' : ''}`} title="Tree (T)"><TreeDeciduous size={20} /></button>
                    <div className="w-[1px] h-6 bg-slate-200 mx-1" />
                    <button
                        onClick={() => {
                            if (!selectedId) return;
                            const roof = designData.roofs.find(r => r.id === selectedId);
                            if (roof) {
                                commitDesign({
                                    ...designData,
                                    roofs: designData.roofs.map(r => r.id === selectedId ? {
                                        ...r,
                                        isAnalyzed: !r.isAnalyzed,
                                        skeletonNodeOverrides: r.isAnalyzed ? undefined : {},
                                        deletedSkeletonNodes: r.isAnalyzed ? undefined : []
                                    } : r)
                                });
                            }
                        }}
                        disabled={!selectedId || !designData.roofs.some(r => r.id === selectedId)}
                        className={`p-2 rounded hover:bg-slate-100 disabled:opacity-30 ${selectedId && designData.roofs.find(r => r.id === selectedId)?.isAnalyzed ? 'text-blue-600 bg-blue-50' : ''}`}
                        title="Detect Roof Planes"
                    >
                        <SplitSquareHorizontal size={20} />
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    {(selectedIds.size > 0 || selectedId) && (
                        <>
                            <button onClick={handleCopy} className="p-2 hover:bg-slate-100 rounded" title="Copy (Ctrl+C)"><Copy size={18} /></button>
                            {copiedObjects && (
                                <button onClick={handlePaste} className="p-2 hover:bg-slate-100 rounded" title="Paste (Ctrl+V)"><Clipboard size={18} /></button>
                            )}
                            <div className="w-[1px] h-6 bg-slate-200 mx-1" />
                        </>
                    )}
                    <button disabled={!canUndo} onClick={handleUndo} className="p-2 hover:bg-slate-100 rounded disabled:opacity-30" title="Undo"><Undo size={18} /></button>
                    <button disabled={!canRedo} onClick={handleRedo} className="p-2 hover:bg-slate-100 rounded disabled:opacity-30" title="Redo"><Redo size={18} /></button>
                </div>
            </div>

            {/* Multi-select indicator */}
            {selectedIds.size > 1 && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    <span className="font-semibold">{selectedIds.size} objects selected</span>
                    <button onClick={() => { setSelectedIds(new Set()); setSelectedId(null); }} className="ml-2 hover:bg-blue-700 rounded p-1">
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Validation summary */}
            {(validationErrors.size > 0 || validationWarnings.size > 0) && (
                <div className="absolute top-16 right-4 z-40 bg-white border border-slate-200 rounded-lg shadow-lg p-3 max-w-sm">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            {validationErrors.size > 0 && <AlertTriangle size={16} className="text-red-600" />}
                            {validationWarnings.size > 0 && validationErrors.size === 0 && <AlertTriangle size={16} className="text-yellow-600" />}
                            <span className="font-semibold text-slate-700 text-sm">
                                {validationErrors.size > 0 && `Errors (${validationErrors.size})`}
                                {validationErrors.size > 0 && validationWarnings.size > 0 && ' / '}
                                {validationWarnings.size > 0 && `Warnings (${validationWarnings.size})`}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-slate-600 flex items-center gap-1">
                                <input
                                    type="checkbox"
                                    checked={validationStrict}
                                    onChange={(e) => setValidationStrict(e.target.checked)}
                                    className="w-3 h-3"
                                />
                                Strict
                            </label>
                            <button onClick={() => { setValidationErrors(new Map()); setValidationWarnings(new Map()); }} className="text-slate-400 hover:text-slate-600">
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                    <div className="text-xs space-y-2 max-h-48 overflow-y-auto">
                        {validationErrors.size > 0 && (
                            <div className="space-y-1">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="font-semibold text-red-700">Errors:</div>
                                    {Array.from(validationErrors.entries()).some(([_, errors]) =>
                                        errors.some(e => e.includes('invalid point'))
                                    ) && (
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleAutoFixInvalidPoints();
                                                }}
                                                className="text-[10px] px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors font-semibold"
                                                title="Tự động sửa các điểm không hợp lệ"
                                            >
                                                🔧 Auto-fix
                                            </button>
                                        )}
                                </div>
                                {Array.from(validationErrors.entries()).slice(0, 5).map(([id, errors]) => (
                                    <div key={id} className="text-red-600">
                                        <strong>{id.substring(0, 8)}...</strong>: {errors[0]}
                                    </div>
                                ))}
                                {validationErrors.size > 5 && (
                                    <div className="text-red-500 italic">...and {validationErrors.size - 5} more</div>
                                )}
                            </div>
                        )}
                        {validationWarnings.size > 0 && (
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <div className="font-semibold text-yellow-700">Warnings:</div>
                                    <button
                                        onClick={() => {
                                            const allIds = new Set([
                                                ...designData.roofs.map(r => r.id),
                                                ...designData.obstructions.map(o => o.id)
                                            ]);
                                            setDismissedWarnings(allIds);
                                        }}
                                        className="text-[10px] text-yellow-600 hover:text-yellow-800"
                                    >
                                        Dismiss All
                                    </button>
                                </div>
                                {Array.from(validationWarnings.entries()).slice(0, 3).map(([id, warnings]) => (
                                    <div key={id} className="text-yellow-600">
                                        <strong>{id.substring(0, 8)}...</strong>: {warnings[0]}
                                    </div>
                                ))}
                                {validationWarnings.size > 3 && (
                                    <div className="text-yellow-500 italic">...and {validationWarnings.size - 3} more</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Measurement results */}
            {measurementResults.length > 0 && (
                <div className="absolute top-16 left-4 z-40 bg-white border border-slate-200 rounded-lg shadow-lg p-3 max-w-xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-slate-700 text-sm">Measurements</span>
                        <button onClick={() => setMeasurementResults([])} className="text-slate-400 hover:text-slate-600">
                            <X size={14} />
                        </button>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1 max-h-32 overflow-y-auto">
                        {measurementResults.map((result, i) => (
                            <div key={i} className="flex justify-between gap-4">
                                <span>Measurement {i + 1}:</span>
                                <span className="font-semibold">{result.distance.toFixed(2)}m</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
