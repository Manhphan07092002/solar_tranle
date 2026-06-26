import React from 'react';
import { ZoomIn, ZoomOut, X } from 'lucide-react';
import { DesignState, LatLngPoint } from '../../../types';
import SatelliteMap from '../../SatelliteMap';
import { isPointInPolygon } from '../../../utils/helpers';
import { calculateSunPosition, isModuleShaded, calculateShadowPolygons, SceneObject, calculateRidgeLine } from '../../../utils/geometry/polygonUtils';
import { calculateRoofStructureLines } from '../../../utils/geometry/roofGeometry';
import { ActiveTool, PreviewPlacement, ClipboardEntry, SelectionBox, ViewState } from './types';
import ProjectStatsFooter from '../../ProjectStatsFooter';

interface Props {
    designData: DesignState;
    viewState: ViewState;
    activeTool: ActiveTool;
    previewPlacement: PreviewPlacement | null;
    clipboard: ClipboardEntry[] | null;
    selectionBox: SelectionBox | null;
    selectedModuleIndices: Set<number>;
    orientation: 'portrait' | 'landscape';
    simMonth: number;
    simHour: number;
    showShading: boolean;
    // Coord helpers
    latLngToScreenPixel: (ll: LatLngPoint) => { x: number; y: number };
    meterToScreen: (x: number, y: number) => { x: number; y: number };
    getRenderPPM: () => number;
    // Handlers
    onWheel: (e: React.WheelEvent) => void;
    onClick: (e: React.MouseEvent) => void;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseUp: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseLeave: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onDeleteModule: (i: number) => void;
    onRotateModule: (i: number) => void;
}

export default function PVLayoutCanvas({
    designData, viewState, activeTool,
    previewPlacement, clipboard, selectionBox, selectedModuleIndices,
    orientation, simMonth, simHour, showShading,
    latLngToScreenPixel, meterToScreen, getRenderPPM,
    onWheel, onClick, onMouseDown, onMouseUp, onMouseMove, onMouseLeave,
    onZoomIn, onZoomOut, onDeleteModule, onRotateModule,
}: Props) {
    const ppm = getRenderPPM();
    const baseW = (designData.selectedModule?.width || 1000) / 1000;
    const baseH = (designData.selectedModule?.height || 1700) / 1000;

    // Shadow env for ghost previews (computed once)
    const sunPos = calculateSunPosition(simMonth, simHour, designData.mapConfig?.lat ?? 21);
    const sceneObjects: SceneObject[] = [
        ...designData.roofs.map(r => ({
            id: r.id, type: 'polygon' as const, baseZ: 0, topZ: r.baseHeight || 3, points: r.points.map(latLngToScreenPixel)
        })),
        ...designData.obstructions.map(o => ({
            id: o.id, type: 'polygon' as const, baseZ: o.elevation || 0, topZ: (o.elevation || 0) + (o.height || 1), points: o.points.map(latLngToScreenPixel)
        })),
        ...(designData.trees || []).map(t => {
            const tc = latLngToScreenPixel(t.position);
            return { id: t.id, type: 'cylinder' as const, baseZ: 0, topZ: t.height || 3, x: tc.x, y: tc.y, radius: t.radius || 1 };
        })
    ];

    const ghostColors = (isValid: boolean, isShaded: boolean) => ({
        bg: !isValid ? 'rgba(239,68,68,0.5)' : isShaded && showShading ? 'rgba(30,58,138,0.7)' : 'rgba(59,130,246,0.5)',
        border: !isValid ? 'rgba(248,113,113,0.8)' : 'rgba(96,165,250,0.8)',
    });

    return (
        <div className="flex-1 bg-slate-800 relative overflow-hidden flex items-center justify-center">
            <div
                className="relative shadow-2xl bg-black"
                style={{ width: '900px', height: '900px', cursor: activeTool === 'edit' ? 'crosshair' : 'default' }}
                onWheel={onWheel}
                onClick={onClick}
                onMouseDown={onMouseDown}
                onMouseUp={onMouseUp}
                onMouseMove={onMouseMove}
                onMouseLeave={onMouseLeave}
            >
                {/* Satellite base map */}
                <div className="absolute inset-0 pointer-events-none z-0 opacity-80">
                    <SatelliteMap center={viewState.center} zoom={viewState.zoom} interactive={false} width={900} height={900} />
                </div>

                {/* SVG Layer: Roofs + Structure Lines + Shadows */}
                <svg className="absolute inset-0 w-full h-full z-30 pointer-events-none" style={{ overflow: 'visible' }}>
                    {designData.roofs.map(roof => {
                        const screenPoints = roof.points.map(latLngToScreenPixel);
                        const mappedOverrides: Record<number, { x: number; y: number }> = {};
                        if (roof.skeletonNodeOverrides) {
                            for (const [key, ll] of Object.entries(roof.skeletonNodeOverrides))
                                mappedOverrides[Number(key)] = latLngToScreenPixel(ll as LatLngPoint);
                        }
                        const linesData = calculateRoofStructureLines(
                            screenPoints, roof.shape, roof.ridgeAngle, roof.ridgeDirection,
                            roof.isAnalyzed, mappedOverrides, roof.deletedSkeletonNodes,
                            roof.addedSkeletonNodes?.map(latLngToScreenPixel)
                        );
                        let lines: any[] = [];
                        if (Array.isArray(linesData)) {
                            lines = linesData;
                        } else if (linesData && Array.isArray((linesData as any).lines)) {
                            lines = (linesData as any).lines;
                        }

                        const fallbackRidge = !roof.isAnalyzed
                            ? calculateRidgeLine(screenPoints, roof.shape, roof.ridgeAngle, roof.ridgeDirection)
                            : null;
                        return (
                            <g key={roof.id}>
                                <defs>
                                    <clipPath id={`clip-roof-${roof.id}`}>
                                        <polygon points={screenPoints.map(p => `${p.x},${p.y}`).join(' ')} />
                                    </clipPath>
                                </defs>
                                <polygon points={screenPoints.map(p => `${p.x},${p.y}`).join(' ')}
                                    fill="rgba(59,130,246,0.2)" stroke="#2563eb" strokeWidth="2" />
                                <g clipPath={`url(#clip-roof-${roof.id})`}>
                                    {lines.map((line, idx) => {
                                        const color = line.type === 'ridge' ? '#f59e0b' : line.type === 'valley' ? '#3b82f6' : '#8b5cf6';
                                        const w = line.type === 'ridge' ? 3 : 2;
                                        const dash = line.type === 'ridge' ? '8,4' : line.type === 'valley' ? '6,3' : '4,2';
                                        return (
                                            <line key={`s-${roof.id}-${idx}`}
                                                x1={line.start.x} y1={line.start.y} x2={line.end.x} y2={line.end.y}
                                                stroke={color} strokeWidth={w} strokeDasharray={dash} opacity={0.9} />
                                        );
                                    })}
                                    {fallbackRidge && (
                                        <line
                                            x1={fallbackRidge.start.x} y1={fallbackRidge.start.y}
                                            x2={fallbackRidge.end.x} y2={fallbackRidge.end.y}
                                            stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" opacity={0.9}
                                        />
                                    )}
                                </g>
                            </g>
                        );
                    })}

                    {/* Obstructions */}
                    {designData.obstructions.map(obs => (
                        <polygon key={obs.id}
                            points={obs.points.map(latLngToScreenPixel).map(p => `${p.x},${p.y}`).join(' ')}
                            fill="rgba(239,68,68,0.15)" stroke="#dc2626" strokeWidth="1" strokeDasharray="4,2" />
                    ))}

                    {/* Trees */}
                    {(designData.trees || []).map(tree => {
                        const sp = latLngToScreenPixel(tree.position);
                        const rPx = tree.radius * ppm;
                        // Give the tree a nice radial gradient to look like a tree top
                        return (
                            <g key={tree.id}>
                                <defs>
                                    <radialGradient id={`tree-grad-${tree.id}`}>
                                        <stop offset="50%" stopColor="rgba(34,197,94,0.6)" />
                                        <stop offset="100%" stopColor="rgba(21,128,61,0.3)" />
                                    </radialGradient>
                                </defs>
                                <circle 
                                    cx={sp.x} cy={sp.y} r={rPx}
                                    fill={`url(#tree-grad-${tree.id})`} 
                                    stroke="#16a34a" 
                                    strokeWidth="2" 
                                    strokeDasharray="4,2" 
                                />
                            </g>
                        );
                    })}

                    {/* SVG Definitions for Shadow Masks */}
                    <defs>
                        {(() => {
                            const shadows = calculateShadowPolygons(sceneObjects, sunPos.azimuth, sunPos.elevation, ppm);
                            return shadows.map((shadow, i) => (
                                <mask id={`shadow-mask-${i}`} key={`mask-${i}`}>
                                    {/* White background: allow shadow everywhere by default */}
                                    <rect x="-10000" y="-10000" width="20000" height="20000" fill="white" />

                                    {/* Black polygons: hide shadow on objects that are equal or taller than the shadow source */}
                                    {sceneObjects.map((obj, objIdx) => {
                                        if (obj.topZ < shadow.sourceTopZ) return null;

                                        // Self masking - but NOT for trees (we want to see shadow under transparent trees)
                                        if (obj.id === shadow.sourceId && shadow.sourcePoints && shadow.sourcePoints.length > 0 && obj.type !== 'cylinder') {
                                            return <polygon key={`mask-obj-${objIdx}`} points={shadow.sourcePoints.map(p => `${p.x},${p.y}`).join(' ')} fill="black" />;
                                        }

                                        // Don't mask shadows with trees either, because trees are semi-transparent and shadows should be seen under them
                                        if (obj.type === 'cylinder') return null;

                                        if (obj.type === 'polygon' && obj.points) {
                                            return <polygon key={`mask-obj-${objIdx}`} points={obj.points.map(p => `${p.x},${p.y}`).join(' ')} fill="black" />;
                                        }
                                        return null;
                                    })}
                                </mask>
                            ));
                        })()}
                    </defs>

                    {/* Shadow polygons */}
                    {(() => {
                        const shadows = calculateShadowPolygons(sceneObjects, sunPos.azimuth, sunPos.elevation, ppm);
                        return shadows.map((shadow, i) => (
                            <polygon key={`shadow-${i}`}
                                points={shadow.points.map(p => `${p.x},${p.y}`).join(' ')}
                                fill="rgba(0,0,0,0.5)"
                                mask={`url(#shadow-mask-${i})`}
                                style={{ pointerEvents: 'none', mixBlendMode: 'multiply' }} />
                        ));
                    })()}
                </svg>

                {/* HTML Overlay: Modules + Ghosts + Selection Box */}
                <div className="absolute inset-0 z-20 pointer-events-none">
                    {/* Placed Modules */}
                    {designData.modules.map((mod, i) => {
                        const isPortrait = mod.orientation === 'portrait';
                        const wPx = (isPortrait ? baseW : baseH) * ppm;
                        const hPx = (isPortrait ? baseH : baseW) * ppm;
                        const sp = meterToScreen(mod.xMeter, mod.yMeter);
                        const loss = mod.shadingLoss || 0;
                        let bgColor = '#1e3a8a';
                        if (showShading) {
                            if (loss > 0.05) bgColor = `hsl(${Math.max(0, 60 - loss * 60)}, 90%, 45%)`;
                            else if (loss > 0.01) bgColor = '#2563eb';
                        }
                        return (
                            <div key={i}
                                style={{
                                    left: sp.x - wPx / 2, top: sp.y - hPx / 2,
                                    width: wPx, height: hPx, position: 'absolute',
                                    transform: `rotate(${mod.azimuth || 0}rad)`,
                                    backgroundColor: bgColor,
                                }}
                                className={`border border-white/30 shadow-sm transition-all relative flex items-center justify-center overflow-hidden flex-col
                                    ${mod.isShaded && showShading ? 'opacity-80' : 'opacity-95'}
                                    ${activeTool === 'edit' ? 'hover:ring-2 hover:ring-blue-400 pointer-events-auto group' : ''}
                                    ${selectedModuleIndices.has(i) ? 'ring-2 ring-yellow-400 border-yellow-300 z-10' : ''}`}
                                title={activeTool === 'edit' ? 'Click to rotate, X to remove' : `Shading Loss: ${(loss * 100).toFixed(1)}%`}
                            >
                                {activeTool === 'edit' && (
                                    <>
                                        <div className="absolute top-0 right-0 w-6 h-6 bg-red-500 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 z-10 cursor-pointer"
                                            onClick={e => { e.stopPropagation(); onDeleteModule(i); }}>
                                            <X size={12} strokeWidth={3} />
                                        </div>
                                        <div className="absolute inset-0 z-0 cursor-pointer"
                                            onClick={e => { e.stopPropagation(); onRotateModule(i); }} />
                                    </>
                                )}
                                {showShading && (
                                    <div className="text-[7px] text-white/90 font-bold text-center leading-tight whitespace-nowrap rotate-90 sm:rotate-0 truncate w-full px-0.5 pointer-events-none"
                                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                                        {loss > 0.05 ? (
                                            <><div className="text-[6px] opacity-80">SHADED</div><div>≈ {Math.round(loss * 100)}%</div></>
                                        ) : (
                                            <div className="text-white/60 text-[6px]">{designData.selectedModule?.power}W</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Single Ghost Module Preview */}
                    {activeTool === 'edit' && previewPlacement && designData.selectedModule && (!clipboard || clipboard.length === 0) && (() => {
                        const isPortrait = orientation === 'portrait';
                        const wPx = (isPortrait ? baseW : baseH) * ppm;
                        const hPx = (isPortrait ? baseH : baseW) * ppm;
                        const r = Math.hypot(wPx, hPx) / 2;
                        const activeRoof = designData.roofs.find(rf => rf.id === previewPlacement.roofId);
                        const moduleZ = activeRoof?.baseHeight || 3;
                        const shaded = isModuleShaded({ x: previewPlacement.screenX, y: previewPlacement.screenY }, r, moduleZ, sceneObjects, sunPos.azimuth, sunPos.elevation, ppm);
                        const { bg, border } = ghostColors(previewPlacement.isValid, shaded);
                        return (
                            <div style={{ left: previewPlacement.screenX - wPx / 2, top: previewPlacement.screenY - hPx / 2, width: wPx, height: hPx, position: 'absolute', transform: `rotate(${previewPlacement.azimuth}rad)`, backgroundColor: bg, borderColor: border }}
                                className="border border-dashed z-50 pointer-events-none transition-all duration-75 shadow-lg shadow-black/40">
                                {shaded && showShading && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-[8px] font-bold text-white/90 drop-shadow-md">SHADED</span>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Clipboard Ghost Block */}
                    {activeTool === 'edit' && previewPlacement && clipboard && clipboard.length > 0 && (() => {
                        return clipboard.map((clip, idx) => {
                            const isPortrait = clip.orientation === 'portrait';
                            const wPx = (isPortrait ? baseW : baseH) * ppm;
                            const hPx = (isPortrait ? baseH : baseW) * ppm;
                            const cosA = Math.cos(previewPlacement.azimuth), sinA = Math.sin(previewPlacement.azimuth);
                            const sp = meterToScreen(
                                previewPlacement.xMeter + clip.dxMeter * cosA - clip.dyMeter * sinA,
                                previewPlacement.yMeter + clip.dxMeter * sinA + clip.dyMeter * cosA
                            );
                            const r = Math.hypot(wPx, hPx) / 2;
                            const activeRoof = designData.roofs.find(rf => rf.id === previewPlacement.roofId);
                            const moduleZ = activeRoof?.baseHeight || 3;
                            const shaded = isModuleShaded({ x: sp.x, y: sp.y }, r, moduleZ, sceneObjects, sunPos.azimuth, sunPos.elevation, ppm);
                            const { bg, border } = ghostColors(previewPlacement.isValid, shaded);
                            return (
                                <div key={`cg-${idx}`}
                                    style={{ left: sp.x - wPx / 2, top: sp.y - hPx / 2, width: wPx, height: hPx, position: 'absolute', transform: `rotate(${previewPlacement.azimuth + clip.azimuthOffset}rad)`, backgroundColor: bg, borderColor: border }}
                                    className="border border-dashed z-50 pointer-events-none transition-all duration-75 shadow-lg shadow-black/40">
                                    {shaded && showShading && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-[8px] font-bold text-white/90 drop-shadow-md">SHADED</span>
                                        </div>
                                    )}
                                </div>
                            );
                        });
                    })()}

                    {/* Selection Box */}
                    {activeTool === 'select' && selectionBox && (() => {
                        const minX = Math.min(selectionBox.startX, selectionBox.currentX);
                        const maxX = Math.max(selectionBox.startX, selectionBox.currentX);
                        const minY = Math.min(selectionBox.startY, selectionBox.currentY);
                        const maxY = Math.max(selectionBox.startY, selectionBox.currentY);
                        return (
                            <div style={{ left: minX, top: minY, width: Math.max(0, maxX - minX), height: Math.max(0, maxY - minY), position: 'absolute', backgroundColor: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.8)' }}
                                className="z-50 pointer-events-none" />
                        );
                    })()}
                </div>

                {/* Zoom Controls */}
                <div className="absolute bottom-4 right-4 flex bg-white rounded shadow-md flex-col overflow-hidden z-50">
                    <button onClick={onZoomIn} className="w-9 h-9 flex items-center justify-center text-slate-600 hover:bg-slate-100 border-b border-slate-100" title="Zoom In">
                        <ZoomIn size={18} />
                    </button>
                    <button onClick={onZoomOut} className="w-9 h-9 flex items-center justify-center text-slate-600 hover:bg-slate-100" title="Zoom Out">
                        <ZoomOut size={18} />
                    </button>
                </div>
                
                <ProjectStatsFooter designData={designData} />
            </div>
        </div>
    );
}
