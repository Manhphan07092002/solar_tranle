import React from 'react';
import { Box, Pentagon, TreeDeciduous, X, Grip, AlertTriangle, Trash2, SplitSquareHorizontal } from 'lucide-react';
import { DesignState, LatLngPoint } from '../../../types';
import { calculateRoofStructureLines } from '../../../utils/geometry/roofGeometry';
import { ActiveTool } from './types';

interface ModelingPropertiesPanelProps {
    selectedId: string | null;
    setSelectedId: (id: string | null) => void;
    selectedIds: Set<string>;
    setSelectedIds: (ids: Set<string>) => void;
    editRoofShapeMode: boolean;
    setEditRoofShapeMode: (mode: boolean) => void;
    activeTool: ActiveTool;
    setActiveTool: (tool: ActiveTool) => void;
    setIsDrawing: (drawing: boolean) => void;
    setPoints: (points: { x: number, y: number }[]) => void;
    designData: DesignState;
    setDesignData: React.Dispatch<React.SetStateAction<DesignState>>;
    commitDesign: (design: DesignState) => void;
    latLngToScreenPixel: (ll: LatLngPoint) => { x: number, y: number };
    localGetPolygonArea: (screenPts: { x: number, y: number }[]) => number;
    validationErrors: Map<string, string[]>;
    validationWarnings: Map<string, string[]>;
    setDismissedWarnings: React.Dispatch<React.SetStateAction<Set<string>>>;
    handleBulkDelete: () => void;
}

export default function ModelingPropertiesPanel({
    selectedId, setSelectedId,
    selectedIds, setSelectedIds,
    editRoofShapeMode, setEditRoofShapeMode,
    activeTool, setActiveTool,
    setIsDrawing, setPoints,
    designData, setDesignData, commitDesign,
    latLngToScreenPixel, localGetPolygonArea,
    validationErrors, validationWarnings, setDismissedWarnings,
    handleBulkDelete
}: ModelingPropertiesPanelProps) {
    if (!selectedId) return null;
    const roof = designData.roofs.find(r => r.id === selectedId);
    const obs = designData.obstructions.find(o => o.id === selectedId);
    const tree = (designData.trees || []).find(t => t.id === selectedId);
    if (!roof && !obs && !tree) return null;

    const deleteSelected = () => {
        const idsToDelete = selectedIds.size > 0 ? selectedIds : new Set([selectedId]);
        const newRoofs = designData.roofs.filter(r => !idsToDelete.has(r.id));
        const newObs = designData.obstructions.filter(o => !idsToDelete.has(o.id));
        const newTrees = (designData.trees || []).filter(t => !idsToDelete.has(t.id));
        commitDesign({ ...designData, roofs: newRoofs, obstructions: newObs, trees: newTrees });
        setSelectedId(null);
        setSelectedIds(new Set());
    };

    return (
        <div className="absolute top-16 right-4 bg-white rounded-lg shadow-xl border border-slate-200 p-4 w-64 z-50 animate-in slide-in-from-right-4 text-slate-700">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    {roof ? <Box size={16} /> : obs ? <Pentagon size={16} /> : <TreeDeciduous size={16} />}
                    Properties
                </h3>
                <button onClick={() => setSelectedId(null)} className="hover:bg-slate-100 p-1 rounded-full"><X size={16} /></button>
            </div>

            {roof && (
                <>
                    <div className="mb-2">
                        <label className="text-xs uppercase text-slate-500 mb-1 block">Roof Shape</label>
                        <select
                            value={roof.shape || 'gable'}
                            onChange={(e) => {
                                const newShape = e.target.value as any;
                                const r2 = designData.roofs.map(r => {
                                    if (r.id === selectedId) {
                                        let newRidgeDirection = r.ridgeDirection;
                                        if (newShape === 'gable' || newShape === 'hip') {
                                            const screenPts = r.points.map(latLngToScreenPixel);
                                            let maxDist = 0, bestAngle = 0;
                                            for (let i = 0; i < screenPts.length; i++) {
                                                const next = (i + 1) % screenPts.length;
                                                const dist = Math.hypot(screenPts[next].x - screenPts[i].x, screenPts[next].y - screenPts[i].y);
                                                if (dist > maxDist) {
                                                    maxDist = dist;
                                                    const angle = Math.atan2(screenPts[next].y - screenPts[i].y, screenPts[next].x - screenPts[i].x);
                                                    bestAngle = angle * 180 / Math.PI;
                                                }
                                            }
                                            newRidgeDirection = (bestAngle + 360) % 360;
                                        }
                                        return {
                                            ...r,
                                            shape: newShape,
                                            ridgeDirection: newRidgeDirection,
                                            ridgeAngle: newShape === 'gable' || newShape === 'hip' ? (r.ridgeAngle || 0) : undefined
                                        };
                                    }
                                    return r;
                                });
                                setDesignData({ ...designData, roofs: r2 });
                                commitDesign({ ...designData, roofs: r2 });
                            }}
                            className="w-full text-sm p-2 border border-slate-300 rounded bg-white text-slate-700"
                        >
                            <option value="flat">Flat</option>
                            <option value="gable">Gable</option>
                            <option value="hip">Hip</option>
                            <option value="shed">Shed</option>
                            <option value="gambrel">Gambrel</option>
                            <option value="mansard">Mansard</option>
                        </select>
                        <p className="text-[10px] text-slate-500 mt-1">
                            {roof.shape === 'gable' && 'Mái đầu hồi: Ridge line + Valley lines'}
                            {roof.shape === 'hip' && 'Mái hông: Ridge line + Hip lines từ center'}
                            {roof.shape === 'shed' && 'Mái dốc: High edge + Valley lines'}
                            {roof.shape === 'gambrel' && 'Mái gãy: Ridge + Valley lines từ center'}
                            {roof.shape === 'mansard' && 'Mái Mansard: Ridge + Valley lines từ center'}
                            {roof.shape === 'flat' && 'Mái phẳng: Không có cấu trúc'}
                        </p>
                    </div>

                    <div className="mb-2">
                        <button
                            onClick={() => {
                                setEditRoofShapeMode(!editRoofShapeMode);
                                if (!editRoofShapeMode) {
                                    setActiveTool('select');
                                    setIsDrawing(false);
                                    setPoints([]);
                                }
                            }}
                            className={`w-full py-2 rounded text-sm flex items-center justify-center gap-2 ${editRoofShapeMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                            title="Chỉnh sửa hình dạng mái thủ công"
                        >
                            <Grip size={16} />
                            {editRoofShapeMode ? 'Thoát chế độ chỉnh sửa' : 'Chỉnh sửa hình dạng mái'}
                        </button>
                    </div>

                    <div className="mb-2">
                        <label className="text-xs uppercase text-slate-500">Building Height: {roof.baseHeight ?? 3}m</label>
                        <input type="range" min="0" max="50" step="0.5" value={roof.baseHeight ?? 3} className="w-full" onChange={(e) => {
                            const val = Number(e.target.value);
                            setDesignData(prev => ({ ...prev, roofs: prev.roofs.map(r => r.id === selectedId ? { ...r, baseHeight: val } : r) }));
                        }} onMouseUp={() => commitDesign(designData)} />
                    </div>
                    <div className="mb-2">
                        <label className="text-xs uppercase text-slate-500">Roof Tilt: {roof.tilt}°</label>
                        <input type="range" min="0" max="60" value={roof.tilt} className="w-full" onChange={(e) => {
                            const val = Number(e.target.value);
                            setDesignData(prev => ({ ...prev, roofs: prev.roofs.map(r => r.id === selectedId ? { ...r, tilt: val } : r) }));
                        }} onMouseUp={() => commitDesign(designData)} />
                    </div>
                    <div className="mb-2">
                        <label className="text-xs uppercase text-slate-500">Azimuth: {roof.azimuth}°</label>
                        <input type="range" min="0" max="359" value={roof.azimuth} className="w-full" onChange={(e) => {
                            const val = Number(e.target.value);
                            setDesignData(prev => ({ ...prev, roofs: prev.roofs.map(r => r.id === selectedId ? { ...r, azimuth: val } : r) }));
                        }} onMouseUp={() => commitDesign(designData)} />
                    </div>
                    {(roof.shape === 'gable' || roof.shape === 'hip') && (
                        <div className="mb-2">
                            <label className="text-xs uppercase text-slate-500">Ridge Angle: {roof.ridgeAngle || 0}°</label>
                            <input type="range" min="-90" max="90" value={roof.ridgeAngle || 0} className="w-full" onChange={(e) => {
                                const val = Number(e.target.value);
                                setDesignData(prev => ({ ...prev, roofs: prev.roofs.map(r => r.id === selectedId ? { ...r, ridgeAngle: val } : r) }));
                            }} onMouseUp={() => commitDesign(designData)} />
                        </div>
                    )}

                    {roof.isAnalyzed && (() => {
                        const mappedOverrides: Record<number, { x: number, y: number }> = {};
                        if (roof.skeletonNodeOverrides) {
                            for (const [key, ll] of Object.entries(roof.skeletonNodeOverrides)) {
                                mappedOverrides[Number(key)] = latLngToScreenPixel(ll as LatLngPoint);
                            }
                        }
                        const linesData = calculateRoofStructureLines(roof.points.map(latLngToScreenPixel), roof.shape, roof.ridgeAngle, roof.ridgeDirection, true, mappedOverrides, roof.deletedSkeletonNodes);
                        const faces = Array.isArray(linesData) ? [] : (linesData?.faces || []);
                        if (faces.length === 0) return null;

                        return (
                            <div className="mt-4 mb-2 p-2 bg-slate-50 border border-slate-200 rounded">
                                <div className="text-xs font-bold text-slate-700 mb-2 pb-1 border-b border-slate-200">
                                    Detect Roof Planes ({faces.length} Faces)
                                </div>
                                <div className="max-h-48 overflow-y-auto pr-1">
                                    {faces.map((face, idx) => {
                                        const faceAzimuth = roof.faceAzimuths?.[idx] !== undefined ? roof.faceAzimuths[idx] : face.azimuth;
                                        const faceTilt = roof.faceTilts?.[idx] !== undefined ? roof.faceTilts[idx] : (roof.tilt || 20);
                                        const updateFaceProp = (key: 'azimuth' | 'tilt', value: number) => {
                                            const recordKey = key === 'azimuth' ? 'faceAzimuths' : 'faceTilts';
                                            setDesignData(prev => {
                                                const newRoofs = prev.roofs.map(r => {
                                                    if (r.id === selectedId) {
                                                        const newRecord = { ...(r[recordKey] || {}) } as Record<number, number>;
                                                        newRecord[idx] = value;
                                                        return { ...r, [recordKey]: newRecord };
                                                    }
                                                    return r;
                                                });
                                                return { ...prev, roofs: newRoofs };
                                            });
                                        };
                                        return (
                                            <div key={idx} className="mb-3 bg-white p-2 text-xs border border-slate-100 rounded">
                                                <div className="font-semibold text-slate-600 mb-1 flex justify-between">
                                                    <span>Face {idx + 1}</span>
                                                    <span className="text-[9px] font-normal text-slate-400">Azi: {faceAzimuth}° | Tilt: {faceTilt}°</span>
                                                </div>
                                                <div className="flex flex-col gap-1 mb-1">
                                                    <span className="text-[10px] text-slate-500">Azimuth</span>
                                                    <input type="range" min="0" max="359" value={faceAzimuth} className="w-full" onChange={(e) => updateFaceProp('azimuth', Number(e.target.value))} onMouseUp={() => commitDesign(designData)} />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] text-slate-500">Tilt</span>
                                                    <input type="range" min="0" max="60" value={faceTilt} className="w-full" onChange={(e) => updateFaceProp('tilt', Number(e.target.value))} onMouseUp={() => commitDesign(designData)} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <button
                                    className="w-full mt-2 text-xs bg-red-50 text-red-600 border border-red-200 py-1 rounded hover:bg-red-100"
                                    onClick={() => {
                                        setDesignData(prev => {
                                            const newRoofs = prev.roofs.map(r => r.id === selectedId ? { ...r, faceAzimuths: {}, faceTilts: {} } : r);
                                            commitDesign({ ...prev, roofs: newRoofs });
                                            return { ...prev, roofs: newRoofs };
                                        });
                                    }}
                                >Reset Extracted Defaults</button>
                            </div>
                        );
                    })()}

                    <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded mb-2 mt-2">
                        Area: {(() => {
                            const area = localGetPolygonArea(roof.points.map(latLngToScreenPixel));
                            if (area === 0) return '0.00';
                            if (area < 0.01) return area.toExponential(2);
                            if (area < 1) return area.toFixed(3);
                            return area.toFixed(2);
                        })()} m²
                    </div>
                    {validationErrors.has(roof.id) && (
                        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded">
                            <div className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1"><AlertTriangle size={12} /> Validation Errors</div>
                            {validationErrors.get(roof.id)?.map((err, i) => <div key={i} className="text-xs text-red-600">• {err}</div>)}
                        </div>
                    )}
                    {validationWarnings.has(roof.id) && (
                        <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                            <div className="text-xs font-semibold text-yellow-700 mb-1 flex justify-between">
                                <span className="flex items-center gap-1"><AlertTriangle size={12} /> Warnings</span>
                                <button onClick={() => setDismissedWarnings(prev => new Set([...prev, roof.id]))} className="text-[10px] text-yellow-600 hover:text-yellow-800">Dismiss</button>
                            </div>
                            {validationWarnings.get(roof.id)?.map((warn, i) => <div key={i} className="text-xs text-yellow-600">• {warn}</div>)}
                        </div>
                    )}
                </>
            )}

            {obs && (
                <>
                    <div className="mb-2 flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                            <label className="text-xs uppercase text-slate-500">Elevation (Base)</label>
                            <div className="flex items-center gap-1">
                                <input type="number" min="0" max="50" step="0.1" value={obs.elevation ?? 0} className="w-16 px-1 py-0.5 text-xs border rounded text-right" onChange={(e) => {
                                    const val = Number(e.target.value);
                                    commitDesign({ ...designData, obstructions: designData.obstructions.map(o => selectedIds.has(o.id) ? { ...o, elevation: val } : o) });
                                }} />
                                <span className="text-xs text-slate-500">m</span>
                            </div>
                        </div>
                        <input type="range" min="0" max="50" step="0.5" value={obs.elevation ?? 0} className="w-full" onChange={(e) => {
                            const val = Number(e.target.value);
                            setDesignData(prev => ({ ...prev, obstructions: prev.obstructions.map(o => selectedIds.has(o.id) ? { ...o, elevation: val } : o) }));
                        }} onMouseUp={() => commitDesign(designData)} />
                    </div>
                    <div className="mb-2 flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                            <label className="text-xs uppercase text-slate-500">Height (Thickness)</label>
                            <div className="flex items-center gap-1">
                                <input type="number" min="0" max="50" step="0.1" value={obs.height ?? 1} className="w-16 px-1 py-0.5 text-xs border rounded text-right" onChange={(e) => {
                                    const val = Number(e.target.value);
                                    commitDesign({ ...designData, obstructions: designData.obstructions.map(o => selectedIds.has(o.id) ? { ...o, height: val } : o) });
                                }} />
                                <span className="text-xs text-slate-500">m</span>
                            </div>
                        </div>
                        <input type="range" min="0" max="50" step="0.5" value={obs.height ?? 1} className="w-full" onChange={(e) => {
                            const val = Number(e.target.value);
                            setDesignData(prev => ({ ...prev, obstructions: prev.obstructions.map(o => selectedIds.has(o.id) ? { ...o, height: val } : o) }));
                        }} onMouseUp={() => commitDesign(designData)} />
                    </div>
                    <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded mb-2">
                        Area: {(() => {
                            const area = localGetPolygonArea(obs.points.map(latLngToScreenPixel));
                            if (area === 0) return '0.00';
                            if (area < 0.01) return area.toExponential(2);
                            if (area < 1) return area.toFixed(3);
                            return area.toFixed(2);
                        })()} m²
                    </div>
                    {validationErrors.has(obs.id) && (
                        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded">
                            <div className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1"><AlertTriangle size={12} /> Validation Errors</div>
                            {validationErrors.get(obs.id)?.map((err, i) => <div key={i} className="text-xs text-red-600">• {err}</div>)}
                        </div>
                    )}
                    {validationWarnings.has(obs.id) && (
                        <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                            <div className="text-xs font-semibold text-yellow-700 mb-1 flex justify-between">
                                <span className="flex items-center gap-1"><AlertTriangle size={12} /> Warnings</span>
                                <button onClick={() => setDismissedWarnings(prev => new Set([...prev, obs.id]))} className="text-[10px] text-yellow-600 hover:text-yellow-800">Dismiss</button>
                            </div>
                            {validationWarnings.get(obs.id)?.map((warn, i) => <div key={i} className="text-xs text-yellow-600">• {warn}</div>)}
                        </div>
                    )}
                </>
            )}

            {tree && (
                <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded mb-2">
                    Radius: {tree.radius}m | Height: {tree.height}m
                </div>
            )}

            <div className="flex gap-2 mt-4">
                <button onClick={deleteSelected} className="flex-1 py-2 bg-red-50 text-red-600 rounded text-sm flex items-center justify-center gap-2 hover:bg-red-100"><Trash2 size={16} /> Delete</button>
                {selectedIds.size > 1 && (
                    <button onClick={handleBulkDelete} className="flex-1 py-2 bg-red-100 text-red-700 rounded text-sm flex items-center justify-center gap-2 hover:bg-red-200" title="Delete all selected">
                        <Trash2 size={16} /> Delete All ({selectedIds.size})
                    </button>
                )}
            </div>
        </div>
    );
}
