import React, { useMemo, forwardRef } from 'react';
import { DesignState, LatLngPoint, RoofSurface } from '../../../types';
import { Grid, Box, Pentagon, TreeDeciduous, Ruler } from 'lucide-react';
import SatelliteMap, { googleSatelliteProvider, esriSatelliteProvider, osmProvider } from '../../SatelliteMap';
import { latLngToPixel, pixelToLatLng } from '../../../utils/mapUtils';
import { metersToPixels, getPolygonArea, getEdgeLengthText, calculateAngle, calculateRidgeLine } from '../../../utils/geometry/polygonUtils';
import { calculateRoofStructureLines } from '../../../utils/geometry/roofGeometry';
import Roof3D from './Roof3D';
import Obstruction3D from './Obstruction3D';
import Tree3D from './Tree3D';
const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 900;

interface WorldViewportProps {
    is3D: boolean;
    tiltAngle: number;
    rotationAngle: number;
    isRotatingView: boolean;
    viewState: { center: { lat: number, lng: number }, zoom: number };
    designData: DesignState;
    snapToGrid: boolean;
    smartSnap?: boolean;
    showDimensions: boolean;
    layerVisibility?: { roofs: boolean; obstructions: boolean; trees: boolean };
    measurementMode: boolean;
    isDrawing: boolean;
    measurementPoints: Array<{ x: number, y: number }>;
    points: Array<{ x: number, y: number }>;
    previewPoint: { x: number, y: number } | null;
    snapCursor: { x: number, y: number } | null;
    snapTarget?: { x: number, y: number, type: 'grid' | 'point' | 'ortho' | null } | null;
    selectedId: string | null;
    selectedIds?: Set<string>;
    roofHeight3D: number;
    currentLayer: 'google' | 'esri' | 'osm';
    activeTool: string;
    editRoofShapeMode?: boolean; // Manual roof shape editing mode
    // Handlers
    onCanvasClick: (e: React.MouseEvent) => void;
    onCanvasMouseDown: (e: React.MouseEvent) => void;
    onCanvasMouseMove: (e: React.MouseEvent) => void;
    onCanvasMouseUp: () => void;
    onObjectClick: (id: string, e: React.MouseEvent) => void;
    onPointMouseDown: (id: string, index: number, e: React.MouseEvent) => void;
    onEdgeMouseDown: (id: string, index: number, p1: { x: number, y: number }, p2: { x: number, y: number }, e: React.MouseEvent) => void;
    onEdgeDoubleClick: (id: string, index: number, p1: { x: number, y: number }, p2: { x: number, y: number }, e: React.MouseEvent) => void;
    onPointDoubleClick: (id: string, index: number, e: React.MouseEvent) => void;
    onSkeletonNodeMouseDown?: (id: string, index: number, e: React.MouseEvent) => void;
    onSkeletonNodeDoubleClick?: (id: string, index: number, e: React.MouseEvent) => void;
    onSkeletonEdgeDoubleClick?: (id: string, index: number, p1: { x: number, y: number }, p2: { x: number, y: number }, e: React.MouseEvent) => void;
    onContextMenu?: (type: 'roof' | 'canvas' | 'obstruction', id: string | null, e: React.MouseEvent) => void;
}

const WorldViewport = forwardRef<HTMLDivElement, WorldViewportProps>(({
    is3D, tiltAngle, rotationAngle, isRotatingView, viewState, designData,
    snapToGrid, smartSnap, showDimensions, layerVisibility = { roofs: true, obstructions: true, trees: true },
    measurementMode, isDrawing, measurementPoints, points, previewPoint, snapCursor, snapTarget,
    selectedId, selectedIds = new Set(), roofHeight3D, currentLayer, activeTool, editRoofShapeMode = false,
    onCanvasClick, onCanvasMouseDown, onCanvasMouseMove, onCanvasMouseUp, onObjectClick, onPointMouseDown,
    onEdgeMouseDown, onEdgeDoubleClick, onPointDoubleClick, onSkeletonNodeMouseDown, onSkeletonNodeDoubleClick, onSkeletonEdgeDoubleClick, onContextMenu
}, ref) => {

    // Helper functions moved inside to access viewState props
    const getMetersToPixels = (meters: number) => metersToPixels(meters, viewState.center.lat, viewState.zoom);

    const storedToScreen = (p: LatLngPoint) => {
        if (!p || typeof p.lat !== 'number' || typeof p.lng !== 'number') return { x: 0, y: 0 };
        return latLngToPixel(viewState.center, viewState.zoom, CANVAS_WIDTH, CANVAS_HEIGHT, p);
    };

    const renderRidgeLine = (screenPts: { x: number, y: number }[], shape?: string, ridgeAngle?: number, ridgeDirection?: number, isSelected?: boolean) => {
        const ridge = calculateRidgeLine(screenPts, shape, ridgeAngle, ridgeDirection);
        if (!ridge) return null;

        return (
            <g className="pointer-events-none">
                <line
                    x1={ridge.start.x}
                    y1={ridge.start.y}
                    x2={ridge.end.x}
                    y2={ridge.end.y}
                    stroke={isSelected ? "#fbbf24" : "#f59e0b"}
                    strokeWidth={isSelected ? 4 : 3}
                    strokeDasharray="10,5"
                    opacity={0.9}
                    markerEnd="url(#arrowhead)"
                />
                {/* Ridge label */}
                <text
                    x={(ridge.start.x + ridge.end.x) / 2}
                    y={(ridge.start.y + ridge.end.y) / 2 - 8}
                    fill="#fbbf24"
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="pointer-events-none select-none font-sans"
                    style={{ textShadow: '0px 1px 3px rgba(0,0,0,0.9)' }}
                >
                    RIDGE
                </text>
            </g>
        );
    };

    // Render roof structure lines (ridge, valley, hip) for 2D view
    const renderRoofStructureLines = (roof: RoofSurface, screenPts: { x: number, y: number }[], isSelected?: boolean) => {
        const mappedOverrides: Record<number, { x: number, y: number }> = {};
        if (roof.skeletonNodeOverrides) {
            for (const [key, ll] of Object.entries(roof.skeletonNodeOverrides)) {
                mappedOverrides[Number(key)] = storedToScreen(ll as LatLngPoint);
            }
        }
        const linesData = calculateRoofStructureLines(screenPts, roof.shape, roof.ridgeAngle, roof.ridgeDirection, roof.isAnalyzed, mappedOverrides, roof.deletedSkeletonNodes, roof.addedSkeletonNodes?.map(storedToScreen));
        let linesArray: any[] = [];
        if (Array.isArray(linesData)) {
            linesArray = linesData;
        } else if (linesData && Array.isArray(linesData.lines)) {
            linesArray = linesData.lines;
        }

        if (linesArray.length === 0) return null;

        return (
            <g className="pointer-events-none">
                {linesArray.map((line: any, idx: number) => {
                    const strokeColor = line.type === 'ridge'
                        ? (isSelected ? "#fbbf24" : "#f59e0b")
                        : line.type === 'valley'
                            ? (isSelected ? "#60a5fa" : "#3b82f6")
                            : (isSelected ? "#a78bfa" : "#8b5cf6");

                    const strokeWidth = line.type === 'ridge' ? (isSelected ? 3 : 2.5) : (isSelected ? 2 : 1.5);
                    const dashArray = line.type === 'ridge' ? "8,4" : line.type === 'valley' ? "6,3" : "4,2";

                    return (
                        <g key={`structure-${idx}`}>
                            <line
                                x1={line.start.x}
                                y1={line.start.y}
                                x2={line.end.x}
                                y2={line.end.y}
                                stroke={strokeColor}
                                strokeWidth={strokeWidth}
                                strokeDasharray={dashArray}
                                opacity={0.85}
                            />
                            {/* Show length label for structure lines */}
                            {isSelected && (
                                <text
                                    x={(line.start.x + line.end.x) / 2}
                                    y={(line.start.y + line.end.y) / 2 - 5}
                                    fill={strokeColor}
                                    fontSize="10"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                    className="pointer-events-none select-none font-sans"
                                    style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.8)' }}
                                >
                                    {getEdgeLengthText(line.start, line.end, viewState.center, viewState.zoom, CANVAS_WIDTH, CANVAS_HEIGHT)}
                                </text>
                            )}

                            {/* Hit Target for double-clicking skeleton lines */}
                            {isSelected && onSkeletonEdgeDoubleClick && (
                                <line
                                    x1={line.start.x}
                                    y1={line.start.y}
                                    x2={line.end.x}
                                    y2={line.end.y}
                                    stroke="transparent"
                                    strokeWidth="10"
                                    className="cursor-crosshair pointer-events-auto"
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        onSkeletonEdgeDoubleClick(roof.id, idx, line.start, line.end, e);
                                    }}
                                />
                            )}
                        </g>
                    );
                })}
            </g>
        );
    };

    const renderFaceIndicators = (roof: RoofSurface, screenPts: { x: number, y: number }[], isSelected?: boolean) => {
        if (!roof.isAnalyzed) return null;

        const mappedOverrides: Record<number, { x: number, y: number }> = {};
        if (roof.skeletonNodeOverrides) {
            for (const [key, ll] of Object.entries(roof.skeletonNodeOverrides)) {
                mappedOverrides[Number(key)] = storedToScreen(ll as LatLngPoint);
            }
        }
        const linesData = calculateRoofStructureLines(screenPts, roof.shape, roof.ridgeAngle, roof.ridgeDirection, roof.isAnalyzed, mappedOverrides, roof.deletedSkeletonNodes, roof.addedSkeletonNodes?.map(storedToScreen));
        const faces = Array.isArray(linesData) ? [] : (linesData?.faces || []);

        return faces.map((face, faceIdx) => {
            // Calculate center of face polygon securely
            let cx = 0, cy = 0;
            if (face.vertices.length > 0) {
                face.vertices.forEach(v => { cx += v.x; cy += v.y; });
                cx /= face.vertices.length;
                cy /= face.vertices.length;
            }

            const faceAzimuth = roof.faceAzimuths?.[faceIdx] !== undefined ? roof.faceAzimuths[faceIdx] : face.azimuth;
            const faceTilt = roof.faceTilts?.[faceIdx] !== undefined ? roof.faceTilts[faceIdx] : (roof.tilt || 20);

            // Convert map azimuth to canvas rotation to render an indicator line
            // Azimuth 0 (North) -> Canvas Y-Up -> Canvas rotation -90deg or directly point up (-y)
            const compassAngle = (faceAzimuth - 90) * (Math.PI / 180);
            const dx = Math.cos(compassAngle) * 12;
            const dy = Math.sin(compassAngle) * 12;

            return (
                <g key={`face-ind-${roof.id}-${faceIdx}`} className="pointer-events-auto cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation();
                        // This will be hooked up to selection later if users want to edit specific face
                        onObjectClick(roof.id, e);
                    }}>
                    <circle cx={cx} cy={cy} r="16" fill="rgba(34, 197, 94, 0.85)" stroke="#ffffff" strokeWidth="2" />
                    {/* Direction tick mark */}
                    <line x1={cx} y1={cy} x2={cx + dx} y2={cy + dy} stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />

                    <text x={cx} y={cy + 4} fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle" style={{ pointerEvents: 'none' }}>
                        {faceTilt}°
                    </text>
                    <title>Face {faceIdx + 1} - Azimuth: {faceAzimuth}°, Tilt: {faceTilt}°</title>
                </g>
            );
        });
    };

    const renderPolygonPoints = (id: string, screenPts: { x: number, y: number }[], color: string) => {
        const shouldShow = (id === selectedId && activeTool === 'select') ||
            (editRoofShapeMode && id === selectedId) ||
            (selectedIds && selectedIds.has(id)) ||
            (id === selectedId);
        if (!shouldShow) return null;
        return screenPts.map((p, idx) => (
            <circle
                key={`point-${id}-${idx}`}
                cx={p.x}
                cy={p.y}
                r="6"
                fill="white"
                stroke={color}
                strokeWidth="2"
                className="cursor-move pointer-events-auto"
                style={{
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                    // Use inline style transform-origin so the scale is centred on the point,
                    // not the SVG origin (which caused the visual jitter/jump on hover)
                    transformOrigin: `${p.x}px ${p.y}px`,
                    transition: 'transform 0.1s ease',
                }}
                onMouseEnter={(e) => { (e.currentTarget as SVGCircleElement).style.transform = 'scale(1.4)'; }}
                onMouseLeave={(e) => { (e.currentTarget as SVGCircleElement).style.transform = 'scale(1)'; }}
                onMouseDown={(e) => {
                    e.stopPropagation();
                    onPointMouseDown(id, idx, e);
                }}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onPointDoubleClick(id, idx, e);
                }}
            />
        ));
    };

    const renderSkeletonNodes = (roof: RoofSurface) => {
        if (!roof.isAnalyzed || !onSkeletonNodeMouseDown) return null;
        const shouldShow = (roof.id === selectedId && activeTool === 'select') ||
            (editRoofShapeMode && roof.id === selectedId);
        if (!shouldShow) return null;

        const mappedOverrides: Record<number, { x: number, y: number }> = {};
        if (roof.skeletonNodeOverrides) {
            for (const [key, ll] of Object.entries(roof.skeletonNodeOverrides)) {
                mappedOverrides[Number(key)] = storedToScreen(ll as LatLngPoint);
            }
        }
        const linesData = calculateRoofStructureLines(roof.points.map(storedToScreen), roof.shape, roof.ridgeAngle, roof.ridgeDirection, true, mappedOverrides, roof.deletedSkeletonNodes, roof.addedSkeletonNodes?.map(storedToScreen));
        const nodes = Array.isArray(linesData) ? [] : (linesData?.nodes || []);

        return nodes.map((p, idx) => {
            if (roof.deletedSkeletonNodes?.includes(idx)) return null;

            return (
                <circle
                    key={`skel-node-${roof.id}-${idx}`}
                    cx={p.x}
                    cy={p.y}
                    r="7"
                    fill="#ffffff"
                    stroke="#3b82f6"
                    strokeWidth="3"
                    className="cursor-move pointer-events-auto"
                    style={{
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                        transformOrigin: `${p.x}px ${p.y}px`,
                        transition: 'transform 0.1s ease',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as SVGCircleElement).style.transform = 'scale(1.4)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as SVGCircleElement).style.transform = 'scale(1)'; }}
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        onSkeletonNodeMouseDown(roof.id, idx, e);
                    }}
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (onSkeletonNodeDoubleClick) onSkeletonNodeDoubleClick(roof.id, idx, e);
                    }}
                />
            );
        });
    };

    const renderEdgeLabels = (screenPts: { x: number, y: number }[], isActive: boolean) => {
        if (!isActive && !showDimensions) return null;
        return screenPts.map((p, i) => {
            const nextP = screenPts[(i + 1) % screenPts.length];
            if (i === screenPts.length - 1 && screenPts.length < 3) return null; // Don't close loop if simple line
            return (
                <text key={`edge-${i}`} x={(p.x + nextP.x) / 2} y={(p.y + nextP.y) / 2}
                    fill={isActive ? "#fbbf24" : "white"} fontSize={isActive ? "13" : "11"} fontWeight={isActive ? "bold" : "normal"}
                    textAnchor="middle" alignmentBaseline="middle"
                    className="pointer-events-none select-none font-sans drop-shadow-md"
                    style={{ textShadow: '0px 1px 3px rgba(0,0,0,0.9)' }}>
                    {getEdgeLengthText(p, nextP, viewState.center, viewState.zoom, CANVAS_WIDTH, CANVAS_HEIGHT)}
                </text>
            );
        });
    };

    const renderEdgeHitTargets = (id: string, screenPts: { x: number, y: number }[]) => {
        // Show edge hit targets if selected
        const shouldShow = (id === selectedId && activeTool === 'select') ||
            (editRoofShapeMode && id === selectedId) ||
            (selectedIds && selectedIds.has(id)) ||
            (id === selectedId);
        if (!shouldShow) return null;
        return screenPts.map((p, i) => {
            const nextP = screenPts[(i + 1) % screenPts.length];
            // Skip closing edge if not a closed poly yet (though designData should be closed polies mostly)
            if (i === screenPts.length - 1 && screenPts.length < 3) return null;

            return (
                <line
                    key={`edge-hit-${i}`}
                    x1={p.x} y1={p.y} x2={nextP.x} y2={nextP.y}
                    stroke="transparent"
                    strokeWidth="10"
                    className="cursor-move"
                    onMouseDown={(e) => onEdgeMouseDown(id, i, p, nextP, e)}
                    onDoubleClick={(e) => { e.stopPropagation(); onEdgeDoubleClick(id, i, p, nextP, e); }}
                />
            );
        });
    }

    const renderAreaLabel = (screenPts: { x: number, y: number }[], isActive: boolean) => {
        if (!isActive || screenPts.length < 3) return null;
        const area = getPolygonArea(screenPts, viewState.center, viewState.zoom, CANVAS_WIDTH, CANVAS_HEIGHT);
        const cx = screenPts.reduce((s, p) => s + p.x, 0) / screenPts.length;
        const cy = screenPts.reduce((s, p) => s + p.y, 0) / screenPts.length;
        return (
            <text x={cx} y={cy} fill="#fbbf24" fontSize="14" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle"
                className="pointer-events-none select-none font-sans drop-shadow-md"
                style={{ textShadow: '0px 1px 3px rgba(0,0,0,0.9)' }}>
                {area >= 10000 ? `${(area / 10000).toFixed(2)}ha` : `${area.toFixed(1)}m²`}
            </text>
        );
    };


    const renderAngleLabels = (screenPts: { x: number, y: number }[], isActive: boolean) => {
        if (!isActive || screenPts.length < 3) return null;

        return screenPts.map((vertex, i) => {
            const prev = screenPts[(i - 1 + screenPts.length) % screenPts.length];
            const next = screenPts[(i + 1) % screenPts.length];

            const angle = calculateAngle(prev, vertex, next);
            if (angle === null) return null;

            // Position label slightly offset from vertex
            const toPrev = { x: prev.x - vertex.x, y: prev.y - vertex.y };
            const toNext = { x: next.x - vertex.x, y: next.y - vertex.y };
            const bisectorX = toPrev.x + toNext.x;
            const bisectorY = toPrev.y + toNext.y;
            const bisectorLen = Math.hypot(bisectorX, bisectorY);

            if (bisectorLen < 1e-3) return null;

            const offsetDist = 25;
            const labelX = vertex.x + (bisectorX / bisectorLen) * offsetDist;
            const labelY = vertex.y + (bisectorY / bisectorLen) * offsetDist;

            // Highlight right angles (90° ± 3°)
            const isRightAngle = Math.abs(angle - 90) < 3;

            return (
                <g key={`angle-${i}`}>
                    {isRightAngle && (
                        <circle cx={vertex.x} cy={vertex.y} r={6} stroke="#a3e635" fill="none" strokeWidth={2} className="pointer-events-none" />
                    )}
                    <text
                        x={labelX}
                        y={labelY}
                        fill={isRightAngle ? "#a3e635" : "#fbbf24"}
                        fontSize="12"
                        fontWeight="bold"
                        textAnchor="middle"
                        alignmentBaseline="middle"
                        className="pointer-events-none select-none font-sans drop-shadow-md"
                        style={{ textShadow: '0px 1px 3px rgba(0,0,0,0.9)' }}
                    >
                        {angle.toFixed(0)}°
                    </text>
                </g>
            );
        });
    };

    const renderRightAngleHint = () => {
        if (!previewPoint || points.length < 2) return null;
        const prev = points[points.length - 2];
        const last = points[points.length - 1];
        const next = previewPoint;

        const angle = calculateAngle(prev, last, next);
        if (angle === null) return null;

        const isRightAngle = Math.abs(angle - 90) < 3;

        return (
            <g>
                {isRightAngle && (
                    <circle cx={last.x} cy={last.y} r={6} stroke="#a3e635" fill="none" strokeWidth={2} className="pointer-events-none" />
                )}
                <text
                    x={last.x + 15}
                    y={last.y - 15}
                    fill={isRightAngle ? "#a3e635" : "#fbbf24"}
                    fontSize="13"
                    fontWeight="bold"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    className="pointer-events-none select-none font-sans drop-shadow-md"
                    style={{ textShadow: '0px 1px 3px rgba(0,0,0,0.9)' }}
                >
                    {angle.toFixed(0)}°
                </text>
            </g>
        );
    };


    return (
        <div
            className="w-full h-full relative"
            style={{
                perspective: is3D ? '800px' : 'none',
                transformStyle: 'preserve-3d',
                overflow: is3D ? 'visible' : 'hidden'
            }}
        >
            {/* World Group - Rotates & Tilts */}
            <div
                ref={ref}
                className={`w-[900px] h-[900px] absolute top-1/2 left-1/2 outline-none select-none`}
                style={{
                    transformStyle: 'preserve-3d',
                    transform: is3D ? `translate(-50%, -50%) rotateX(${tiltAngle}deg) rotateZ(${rotationAngle}deg)` : 'translate(-50%, -50%)',
                    transition: isRotatingView ? 'none' : 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
                    willChange: isRotatingView ? 'transform' : 'auto'
                }}
                onClick={onCanvasClick}
                onMouseDown={onCanvasMouseDown}
                onMouseMove={onCanvasMouseMove}
                onMouseUp={onCanvasMouseUp}
                onContextMenu={(e) => {
                    e.preventDefault();
                    if (onContextMenu) {
                        onContextMenu('canvas', null, e);
                    }
                }}
            >
                {/* Map Background */}
                <div className="absolute inset-0 z-0" style={{ transformStyle: 'preserve-3d', pointerEvents: is3D ? 'none' : 'auto' }}>
                    <SatelliteMap center={viewState.center} zoom={viewState.zoom} interactive={false} />
                </div>

                {/* Grid Overlay - hidden in 3D mode as it stretches to infinity with perspective */}
                {snapToGrid && !is3D && (
                    <div className="absolute inset-0 pointer-events-none z-10"
                        style={{
                            backgroundImage: 'linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)',
                            backgroundSize: '20px 20px',
                        }}>
                    </div>
                )}

                {/* 3D Roofs Rendering */}
                {is3D && layerVisibility.roofs && designData.roofs.map(roof => {
                    const screenPoints = roof.points.map(storedToScreen);
                    const isSelected = selectedId === roof.id;
                    const baseHeightPx = getMetersToPixels(roof.baseHeight ?? 3);
                    const roofHeightPx = getMetersToPixels(2); // Example default thickness for the slope

                    // Dynamically reduce layer count when zoomed out
                    const detailLevel = viewState.zoom < 19 ? 0.3 : 1; // More aggressive scaling for performance
                    const maxLayers = Math.max(3, Math.floor(15 * detailLevel));
                    const layers = Math.min(maxLayers, Math.ceil(roofHeightPx / 2));
                    const layerStep = roofHeightPx / layers;
                    const shape = roof.shape || 'gable';
                    const tilt = roof.tilt || 20;

                    // Calculate roof height based on tilt and shape
                    const roofHeight = shape === 'flat' ? 0 : (roofHeightPx * 0.3 * (tilt / 60)); // Scale by tilt

                    return (
                        <Roof3D
                            key={`roof-3d-${roof.id}`}
                            roof={roof}
                            screenPoints={screenPoints}
                            isSelected={isSelected}
                            baseHeightPx={baseHeightPx}
                            heightPx={roofHeightPx}
                            layers={layers}
                            layerStep={layerStep}
                            roofHeight={roofHeight}
                            activeTool={activeTool}
                            editRoofShapeMode={editRoofShapeMode || false}
                            onObjectClick={onObjectClick}
                            renderRidgeLine={renderRidgeLine}
                            renderEdgeLabels={renderEdgeLabels}
                            renderAngleLabels={renderAngleLabels}
                            renderAreaLabel={renderAreaLabel}
                            renderPolygonPoints={renderPolygonPoints}
                            showDimensions={showDimensions}
                        />
                    );
                })}

                {/* 3D Obstructions Rendering */}
                {is3D && layerVisibility.obstructions && designData.obstructions.map(obs => {
                    const screenPoints = obs.points.map(storedToScreen);
                    const isSelected = selectedId === obs.id || selectedIds.has(obs.id);
                    const obsHeight = obs.height ?? 1;
                    const heightPx = getMetersToPixels(obsHeight);
                    const baseElevationPx = getMetersToPixels(obs.elevation ?? 0);
                    const detailLevel = viewState.zoom < 20 ? 0.5 : 1;
                    const maxLayers = Math.max(3, Math.floor(10 * detailLevel));
                    const layers = Math.min(maxLayers, Math.ceil(heightPx / 2));
                    const layerStep = heightPx / Math.max(1, layers);

                    return (
                        <Obstruction3D
                            key={`obs-3d-${obs.id}`}
                            obs={obs}
                            screenPoints={screenPoints}
                            isSelected={isSelected}
                            heightPx={heightPx}
                            baseElevationPx={baseElevationPx}
                            layers={layers}
                            layerStep={layerStep}
                            onObjectClick={onObjectClick}
                        />
                    );
                })}

                {/* 3D Trees Rendering */}
                {is3D && layerVisibility.trees && (designData.trees || []).map(tree => {
                    const center = storedToScreen(tree.position);
                    const isSelected = selectedId === tree.id || selectedIds.has(tree.id);
                    const treeHeight = tree.height || 3;
                    const heightPx = getMetersToPixels(treeHeight);
                    const radiusPx = getMetersToPixels(tree.radius);
                    const detailLevel = viewState.zoom < 20 ? 0.3 : 1;
                    const maxLayers = Math.max(3, Math.floor(15 * detailLevel));
                    const crownLayers = Math.min(maxLayers, Math.ceil(heightPx / 2));
                    const trunkHeightPx = heightPx * 0.3;

                    return (
                        <Tree3D
                            key={`tree-3d-${tree.id}`}
                            tree={tree}
                            center={center}
                            isSelected={isSelected}
                            heightPx={heightPx}
                            radiusPx={radiusPx}
                            crownLayers={crownLayers}
                            trunkHeightPx={trunkHeightPx}
                            onObjectClick={onObjectClick}
                        />
                    );
                })}

                {/* 2D Drawing Layer */}
                <svg className="absolute inset-0 w-full h-full z-20 overflow-visible pointer-events-none" style={{ transform: 'translateZ(2px)' }}>
                    <defs>
                        {/* Gradient for different roof shapes */}
                        <linearGradient id="roofTopGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#93c5fd" />
                            <stop offset="50%" stopColor="#60a5fa" />
                            <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                        <linearGradient id="gableGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#fbbf24" />
                            <stop offset="50%" stopColor="#f59e0b" />
                            <stop offset="100%" stopColor="#d97706" />
                        </linearGradient>
                        <linearGradient id="hipGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#a78bfa" />
                            <stop offset="50%" stopColor="#8b5cf6" />
                            <stop offset="100%" stopColor="#7c3aed" />
                        </linearGradient>
                        <linearGradient id="shedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#34d399" />
                            <stop offset="50%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                        <linearGradient id="gambrelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#fb7185" />
                            <stop offset="50%" stopColor="#f43f5e" />
                            <stop offset="100%" stopColor="#e11d48" />
                        </linearGradient>
                        <linearGradient id="mansardGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#f472b6" />
                            <stop offset="50%" stopColor="#ec4899" />
                            <stop offset="100%" stopColor="#db2777" />
                        </linearGradient>
                        <linearGradient id="flatGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#d1d5db" />
                            <stop offset="50%" stopColor="#9ca3af" />
                            <stop offset="100%" stopColor="#6b7280" />
                        </linearGradient>
                        <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                            <polygon points="0 0, 10 3, 0 6" fill="#f59e0b" />
                        </marker>
                    </defs>

                    {!is3D && layerVisibility.roofs && designData.roofs.map(roof => {
                        const screenPoints = roof.points.map(storedToScreen);
                        const isSelected = selectedId === roof.id || selectedIds.has(roof.id);
                        return (
                            <React.Fragment key={roof.id}>
                                <g
                                    className={isDrawing ? "pointer-events-none" : "pointer-events-auto"}
                                    onClick={(e) => {
                                        if (isDrawing) return;
                                        onObjectClick(roof.id, e);
                                    }}
                                    onContextMenu={(e) => {
                                        if (isDrawing) return;
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (onContextMenu) onContextMenu('roof', roof.id, e);
                                    }}
                                >
                                    <polygon points={screenPoints.map(p => `${p.x},${p.y}`).join(' ')} fill={isSelected ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.1)"} stroke="white" strokeWidth={isSelected ? "2.5" : "1.5"} className={isDrawing ? "" : "cursor-pointer hover:fill-white/20 transition-all"} />
                                    {/* Roof structure lines (ridge, valley, hip) - like SolarEdge Designer */}
                                    {renderRoofStructureLines(roof, screenPoints, isSelected)}
                                    {!roof.isAnalyzed && renderRidgeLine(screenPoints, roof.shape, roof.ridgeAngle, roof.ridgeDirection, isSelected)}
                                    {renderEdgeHitTargets(roof.id, screenPoints)}

                                    {!is3D && renderEdgeLabels(screenPoints, isSelected || showDimensions)}
                                    {!is3D && renderAngleLabels(screenPoints, isSelected)}

                                    {renderAreaLabel(screenPoints, isSelected)}
                                    {/* Render per-face indicators when analyzed */}
                                    {renderFaceIndicators(roof, screenPoints, isSelected)}
                                </g>
                                {/* Points layer - rendered separately to ensure they're always on top and clickable */}
                                {(isSelected && (activeTool === 'select' || editRoofShapeMode)) && (
                                    <g key={`points-${roof.id}`} className="pointer-events-auto">
                                        {renderPolygonPoints(roof.id, screenPoints, "white")}
                                        {renderSkeletonNodes(roof)}
                                    </g>
                                )}
                            </React.Fragment>
                        );
                    })}

                    {layerVisibility.obstructions && designData.obstructions.map(obs => {
                        const screenPoints = obs.points.map(storedToScreen);
                        const isSelected = selectedId === obs.id || selectedIds.has(obs.id);
                        const baseElevationPx = getMetersToPixels(obs.elevation || 0);
                        const heightPx = getMetersToPixels(obs.height || 1);

                        return (
                            <React.Fragment key={`obs-frag-${obs.id}`}>
                                {/* 2D Rendering and Interactions */}
                                {!is3D && (
                                    <>
                                        <g
                                            key={obs.id}
                                            className={isDrawing ? "pointer-events-none" : "pointer-events-auto"}
                                            onClick={(e) => {
                                                if (isDrawing) return;
                                                onObjectClick(obs.id, e);
                                            }}
                                            onContextMenu={(e) => {
                                                if (isDrawing) return;
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (onContextMenu) onContextMenu('obstruction', obs.id, e);
                                            }}
                                        >
                                            <polygon
                                                points={screenPoints.map(p => `${p.x},${p.y}`).join(' ')}
                                                fill={isSelected ? "rgba(239, 68, 68, 0.4)" : "rgba(239, 68, 68, 0.15)"}
                                                stroke="#ef4444"
                                                strokeWidth={isSelected ? "2" : "1.5"}
                                                strokeDasharray="4,2"
                                                className={isDrawing ? "" : "cursor-pointer hover:fill-red-500/30 transition-all"}
                                            />
                                            {/* Obstruction Labels */}
                                            {renderEdgeLabels(screenPoints, isSelected || showDimensions)}
                                            {renderAngleLabels(screenPoints, isSelected)}
                                            {renderAreaLabel(screenPoints, isSelected)}
                                        </g>

                                        {/* Points layer - rendered separately to ensure they're always on top and click works (React event propagation issue) */}
                                        {(isSelected && (activeTool === 'select' || editRoofShapeMode)) && (
                                            <g key={`obs-points-${obs.id}`} className="pointer-events-auto">
                                                {renderEdgeHitTargets(obs.id, screenPoints)}
                                                {renderPolygonPoints(obs.id, screenPoints, "#ef4444")}
                                            </g>
                                        )}
                                    </>
                                )}
                            </React.Fragment>
                        );
                    })}

                    {(designData.trees || []).map(tree => {
                        const center = storedToScreen(tree.position);
                        const isSelected = selectedId === tree.id || selectedIds.has(tree.id);
                        const r = getMetersToPixels(tree.radius);
                        const shadowOffset = (is3D && isSelected) ? Math.max(2, getMetersToPixels(3) * 0.35) : 0;
                        return (
                            <g key={tree.id} className="pointer-events-auto" onClick={(e) => onObjectClick(tree.id, e)}>
                                {is3D && isSelected && (
                                    <ellipse cx={center.x + shadowOffset} cy={center.y + shadowOffset} rx={Math.max(2, r * 1.1)} ry={Math.max(2, r * 0.75)} fill="rgba(0,0,0,0.25)" className="pointer-events-none" />
                                )}
                                <circle cx={center.x} cy={center.y} r={Math.max(3, r)} fill={isSelected ? "rgba(34,197,94,0.6)" : "rgba(34,197,94,0.35)"} stroke={isSelected ? "#22c55e" : "rgba(34,197,94,0.8)"} strokeWidth={isSelected ? 2 : 1.5} className="cursor-pointer" />
                            </g>
                        );
                    })}

                    {!is3D && measurementMode && (
                        <g className="pointer-events-none">
                            {measurementPoints.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={5} fill="#22c55e" stroke="#16a34a" strokeWidth="2" />)}
                            {measurementPoints.length === 1 && previewPoint && (
                                <line x1={measurementPoints[0].x} y1={measurementPoints[0].y} x2={previewPoint.x} y2={previewPoint.y} stroke="#22c55e" strokeWidth="2" strokeDasharray="4,2" opacity="0.6" />
                            )}
                            {measurementPoints.length === 2 && (
                                <>
                                    <line x1={measurementPoints[0].x} y1={measurementPoints[0].y} x2={measurementPoints[1].x} y2={measurementPoints[1].y} stroke="#22c55e" strokeWidth="2" strokeDasharray="4,2" />
                                    <text x={(measurementPoints[0].x + measurementPoints[1].x) / 2} y={(measurementPoints[0].y + measurementPoints[1].y) / 2 - 10} fill="#22c55e" fontSize="14" fontWeight="bold" textAnchor="middle" className="pointer-events-none select-none font-sans drop-shadow-md" style={{ textShadow: '0px 1px 3px rgba(0,0,0,0.9)' }}>
                                        {getEdgeLengthText(measurementPoints[0], measurementPoints[1], viewState.center, viewState.zoom, CANVAS_WIDTH, CANVAS_HEIGHT)}
                                    </text>
                                </>
                            )}
                        </g>
                    )}

                    {!is3D && points.length > 0 && (
                        <g className="pointer-events-none">
                            <polyline points={points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="white" strokeWidth="2" />
                            {points.map((p, i) => (
                                <circle key={i} cx={p.x} cy={p.y} r={i === 0 ? 5 : 4} fill={i === 0 ? '#22c55e' : 'white'} stroke={i === 0 ? '#16a34a' : 'white'} />
                            ))}
                            {previewPoint && (
                                <>
                                    <line x1={points[points.length - 1].x} y1={points[points.length - 1].y} x2={previewPoint.x} y2={previewPoint.y} stroke="#f59e0b" strokeWidth="2" strokeDasharray="6,4" />
                                    {renderRightAngleHint()}
                                </>
                            )}

                            {/* Render provisional ridge line while drawing if there are enough points */}
                            {(points.length >= 3 || (points.length === 2 && previewPoint)) && activeTool === 'roof' && (
                                (() => {
                                    const currentPts = [...points];
                                    if (previewPoint) currentPts.push(previewPoint);
                                    if (currentPts.length >= 3) {
                                        return renderRidgeLine(currentPts, 'gable');
                                    }
                                    return null;
                                })()
                            )}

                            {renderEdgeLabels(points, true)}
                        </g>
                    )}



                    {snapTarget?.type === 'ortho' && points.length > 0 && (
                        <line
                            x1={points[points.length - 1].x}
                            y1={points[points.length - 1].y}
                            x2={snapTarget.x}
                            y2={snapTarget.y}
                            stroke="#f97316"
                            strokeWidth="1.5"
                            strokeDasharray="4,4"
                            className="pointer-events-none"
                        />
                    )}
                    {/* snapCursor: only show while actively drawing or when points exist (split/draw mode).
                         Hidden in plain select/hover mode to avoid phantom point outside polygon. */}
                    {snapCursor && (snapToGrid || smartSnap) && points.length > 0 && (
                        <circle cx={snapCursor.x} cy={snapCursor.y} r={4} fill="transparent" stroke={snapTarget?.type === 'ortho' ? '#f97316' : '#007fd4'} strokeWidth={2} className="pointer-events-none" />
                    )}
                </svg>
            </div>
        </div>
    );
});

export default React.memo(WorldViewport);
