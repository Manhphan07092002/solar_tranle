import React from 'react';
import { Grid, Ruler, Focus, RotateCcw, Move3d, Plus, Minus, Hand, Navigation } from 'lucide-react';
import { DesignState } from '../../../types';
import WorldViewport from './WorldViewport';
import { ActiveTool, MapLayer } from './types';


interface ModelingCanvasProps {
    canvasRef: React.RefObject<HTMLDivElement>;
    worldTransformRef: React.RefObject<HTMLDivElement>;
    is3D: boolean;
    setIs3D: (is3D: boolean) => void;
    tiltAngle: number;
    setTiltAngle: (tilt: number) => void;
    rotationAngle: number;
    setRotationAngle: (rot: number) => void;
    rotationRef: React.MutableRefObject<number>;
    tiltRef: React.MutableRefObject<number>;
    isRotatingView: boolean;
    setIsRotatingView: (rotating: boolean) => void;
    viewState: { center: { lat: number, lng: number }, zoom: number };
    setViewState: React.Dispatch<React.SetStateAction<{ center: { lat: number, lng: number }, zoom: number }>>;
    designData: DesignState;
    snapToGrid: boolean;
    setSnapToGrid: (snap: boolean) => void;
    smartSnap: boolean;
    setSmartSnap: (snap: boolean) => void;
    showDimensions: boolean;
    setShowDimensions: (show: boolean) => void;
    measurementMode: boolean;
    isDrawing: boolean;
    setIsDrawing: (drawing: boolean) => void;
    measurementPoints: { x: number, y: number }[];
    points: { x: number, y: number }[];
    setPoints: (points: { x: number, y: number }[]) => void;
    previewPoint: { x: number, y: number } | null;
    snapCursor: { x: number, y: number } | null;
    snapTarget: { x: number, y: number, type: 'grid' | 'point' | 'ortho' | null } | null;
    selectedId: string | null;
    selectedIds: Set<string>;
    roofHeight3D: number;
    currentLayer: MapLayer;
    activeTool: ActiveTool;
    setActiveTool: (tool: ActiveTool) => void;
    editRoofShapeMode: boolean;
    setEditRoofShapeMode: (mode: boolean) => void;
    onCanvasClick: (e: React.MouseEvent) => void;
    onCanvasMouseDown: (e: React.MouseEvent) => void;
    onCanvasMouseMove: (e: React.MouseEvent) => void;
    onCanvasMouseUp: (e: React.MouseEvent) => void;
    onObjectClick: (e: React.MouseEvent, type: 'roof' | 'obstruction' | 'tree', id: string) => void;
    onPointMouseDown: (e: React.MouseEvent, type: 'roof' | 'obstruction', id: string, index: number) => void;
    onSkeletonNodeMouseDown: (e: React.MouseEvent, id: string, nodeIndex: number) => void;
    onSkeletonNodeDoubleClick: (e: React.MouseEvent, id: string, nodeIndex: number) => void;
    onSkeletonEdgeDoubleClick: (e: React.MouseEvent, id: string, edgeIndex: number) => void;
    onEdgeMouseDown: (e: React.MouseEvent, type: 'roof' | 'obstruction', id: string, index: number) => void;
    onEdgeDoubleClick: (e: React.MouseEvent, type: 'roof' | 'obstruction', id: string, index: number) => void;
    onPointDoubleClick: (e: React.MouseEvent, type: 'roof' | 'obstruction', id: string, index: number) => void;
    onContextMenu: (e: React.MouseEvent) => void;
    handleFinishPoly: () => void;
    handleZoomIn: () => void;
    handleZoomOut: () => void;
    lastMousePosRef?: React.MutableRefObject<{ x: number, y: number } | null>;
}

export default function ModelingCanvas({
    canvasRef, worldTransformRef, is3D, setIs3D, tiltAngle, setTiltAngle, rotationAngle, setRotationAngle,
    rotationRef, tiltRef, isRotatingView, setIsRotatingView, viewState, setViewState, designData,
    snapToGrid, setSnapToGrid, smartSnap, setSmartSnap, showDimensions, setShowDimensions, measurementMode,
    isDrawing, setIsDrawing, measurementPoints, points, setPoints, previewPoint, snapCursor, snapTarget,
    selectedId, selectedIds, roofHeight3D, currentLayer, activeTool, setActiveTool, editRoofShapeMode,
    setEditRoofShapeMode, onCanvasClick, onCanvasMouseDown, onCanvasMouseMove, onCanvasMouseUp,
    onObjectClick, onPointMouseDown, onSkeletonNodeMouseDown, onSkeletonNodeDoubleClick,
    onSkeletonEdgeDoubleClick, onEdgeMouseDown, onEdgeDoubleClick, onPointDoubleClick, onContextMenu,
    handleFinishPoly, handleZoomIn, handleZoomOut, lastMousePosRef
}: ModelingCanvasProps) {
    return (
        <div className={`flex-1 relative bg-[#E5E5E5] overflow-hidden flex items-center justify-center ${activeTool === 'rotate' && is3D ? (isRotatingView ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-crosshair'}`}>
            <div ref={canvasRef} className="relative shadow-2xl select-none border border-slate-300 bg-black overflow-hidden" style={{ width: '900px', height: '900px' }}>
                <WorldViewport
                    ref={worldTransformRef}
                    is3D={is3D}
                    tiltAngle={tiltAngle}
                    rotationAngle={rotationAngle}
                    isRotatingView={isRotatingView}
                    viewState={viewState}
                    designData={designData}
                    snapToGrid={snapToGrid}
                    showDimensions={showDimensions}
                    measurementMode={measurementMode}
                    isDrawing={isDrawing}
                    measurementPoints={measurementPoints}
                    points={points}
                    previewPoint={previewPoint}
                    snapCursor={snapCursor}
                    snapTarget={snapTarget}
                    selectedId={selectedId}
                    selectedIds={selectedIds}
                    roofHeight3D={roofHeight3D}
                    currentLayer={currentLayer}
                    activeTool={activeTool}
                    editRoofShapeMode={editRoofShapeMode}
                    onCanvasClick={onCanvasClick}
                    onCanvasMouseDown={onCanvasMouseDown}
                    onCanvasMouseMove={onCanvasMouseMove}
                    onCanvasMouseUp={onCanvasMouseUp}
                    onObjectClick={onObjectClick}
                    onPointMouseDown={onPointMouseDown}
                    onSkeletonNodeMouseDown={onSkeletonNodeMouseDown}
                    onSkeletonNodeDoubleClick={onSkeletonNodeDoubleClick}
                    onSkeletonEdgeDoubleClick={onSkeletonEdgeDoubleClick}
                    onEdgeMouseDown={onEdgeMouseDown}
                    onEdgeDoubleClick={onEdgeDoubleClick}
                    onPointDoubleClick={onPointDoubleClick}
                    onContextMenu={onContextMenu}
                />
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-4 left-4 flex gap-2 z-30">
                <button onClick={() => setSnapToGrid(!snapToGrid)} className={`w-12 h-12 border rounded-md flex flex-col items-center justify-center gap-1 bg-white hover:bg-slate-50 ${snapToGrid ? 'border-blue-500 text-blue-600' : 'text-slate-500'}`} title="Snap to Grid"><Grid size={18} /><span className="text-[9px] font-bold">Grid</span></button>
                <button onClick={() => setSmartSnap(!smartSnap)} className={`w-12 h-12 border rounded-md flex flex-col items-center justify-center gap-1 bg-white hover:bg-slate-50 ${smartSnap ? 'border-green-500 text-green-600' : 'text-slate-500'}`} title="Smart Snap to Points"><Focus size={18} /><span className="text-[9px] font-bold">Snap</span></button>
                <button onClick={() => setShowDimensions(!showDimensions)} className={`w-12 h-12 border rounded-md flex flex-col items-center justify-center gap-1 bg-white hover:bg-slate-50 ${showDimensions ? 'border-blue-500 text-blue-600' : 'text-slate-500'}`} title="Show Dimensions"><Ruler size={18} /><span className="text-[9px] font-bold">Sizes</span></button>
            </div>

            <div className="absolute bottom-4 right-4 flex items-end gap-3 z-30">
                {is3D && (
                    <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-2 flex flex-col gap-2">
                        <div className="text-[10px] font-bold text-slate-500 uppercase text-center border-b pb-1">3D Controls</div>
                        <button onClick={() => { if (designData.mapConfig) setViewState({ center: designData.mapConfig, zoom: designData.mapConfig.zoom }) }} className="text-xs p-1 bg-slate-100 hover:bg-slate-200 rounded flex items-center justify-center gap-1"><RotateCcw size={12} /> Reset View</button>
                    </div>
                )}

                <div className="flex bg-white rounded-md shadow-md overflow-hidden h-9 items-center border border-slate-200 text-slate-700">
                    <button onClick={() => { setIs3D(false); setActiveTool('select'); setIsRotatingView(false); }} className={`w-10 h-full border-r border-slate-100 text-xs font-bold ${!is3D ? 'bg-blue-50 text-blue-600' : ''}`}>2D</button>
                    <button onClick={() => {
                        setIs3D(true); setRotationAngle(0); setTiltAngle(60);
                        rotationRef.current = 0; tiltRef.current = 60;
                        if (activeTool === 'rotate') setIsRotatingView(false);
                    }} className={`w-10 h-full border-r border-slate-100 text-xs font-bold ${is3D ? 'bg-blue-50 text-blue-600' : ''}`}>3D</button>
                    {is3D && <button onClick={() => {
                        setActiveTool('rotate'); setIsRotatingView(false);
                        if (lastMousePosRef) lastMousePosRef.current = null;
                    }} className={`w-9 h-full border-r border-slate-100 ${activeTool === 'rotate' ? 'bg-blue-50 text-blue-600' : ''}`} title="Rotate 3D View"><Move3d size={16} /></button>}
                    <button onClick={handleZoomIn} className="w-9 h-full border-r border-slate-100" title="Zoom In"><Plus size={18} /></button>
                    <button onClick={handleZoomOut} className="w-9 h-full border-r border-slate-100" title="Zoom Out"><Minus size={18} /></button>
                    <button onClick={() => { setActiveTool('pan'); setIsDrawing(false); setPoints([]); setEditRoofShapeMode(false); }} className={`w-9 h-full border-r border-slate-100 ${activeTool === 'pan' ? 'bg-blue-50 text-blue-600' : ''}`} title="Pan Tool (Di chuyển bản đồ)"><Hand size={16} /></button>
                    <button onClick={() => { setActiveTool('select'); setIsDrawing(false); setPoints([]); setEditRoofShapeMode(false); }} className={`w-9 h-full border-r border-slate-100 ${activeTool === 'select' && !isDrawing && !editRoofShapeMode ? 'bg-blue-50 text-blue-600' : ''}`} title="Select Tool (Chọn đối tượng)"><Navigation size={16} /></button>
                    <button onClick={() => {
                        let allPoints: { lat: number, lng: number }[] = [];
                        designData.roofs.forEach(r => { if (r.points) allPoints.push(...r.points); });
                        designData.obstructions.forEach(o => { if (o.points) allPoints.push(...o.points); });
                        (designData.trees || []).forEach(t => { if (t.position) allPoints.push(t.position); });

                        if (allPoints.length > 0) {
                            let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
                            allPoints.forEach(p => {
                                if (p.lat < minLat) minLat = p.lat;
                                if (p.lat > maxLat) maxLat = p.lat;
                                if (p.lng < minLng) minLng = p.lng;
                                if (p.lng > maxLng) maxLng = p.lng;
                            });
                            const centerLat = (minLat + maxLat) / 2;
                            const centerLng = (minLng + maxLng) / 2;
                            setViewState(prev => ({ ...prev, center: { lat: centerLat, lng: centerLng } }));
                        } else if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition(
                                (position) => setViewState({ center: { lat: position.coords.latitude, lng: position.coords.longitude }, zoom: 19 }),
                                () => { if (designData.mapConfig) setViewState({ center: { lat: designData.mapConfig.lat, lng: designData.mapConfig.lng }, zoom: designData.mapConfig.zoom }); }
                            );
                        } else if (designData.mapConfig) {
                            setViewState({ center: { lat: designData.mapConfig.lat, lng: designData.mapConfig.lng }, zoom: designData.mapConfig.zoom });
                        }
                    }} className="w-9 h-full" title="Reset View"><Focus size={16} /></button>
                </div>
            </div>

            {isDrawing && points.length >= 3 && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-in slide-in-from-bottom-4 z-40">
                    <button onClick={handleFinishPoly} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold shadow-lg">Finish Shape</button>
                </div>
            )}
        </div>
    );
}
