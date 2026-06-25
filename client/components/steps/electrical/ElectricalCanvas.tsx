import React from 'react';
import { AlertCircle, Clipboard } from 'lucide-react';
import { DesignState, PVString, LatLngPoint } from '../../../types';
import { ActiveTool, DraggingIcon, ModuleRenderContext } from './types';
import ProjectStatsFooter from '../../ProjectStatsFooter';

interface ElectricalCanvasProps {
    designData: DesignState;
    strings: PVString[];
    activeStringId: string | null;
    setActiveStringId: (id: string | null) => void;
    activeTool: ActiveTool;
    selectedModuleIndex: number | null;
    selectedModuleIndices: Set<number>;
    isDragging: boolean;
    snapToGrid: boolean;
    hoveredModuleIndex: number | null;
    setHoveredModuleIndex: (v: number | null) => void;
    copiedModules: Array<{ x: number; y: number; stringId?: string }>;
    constraintViolations: string[];
    highlightedStringId: string | null;
    setHighlightedStringId: (v: string | null) => void;
    showDistance: boolean;
    stringIconOffsets: Record<string, { x: number; y: number }>;
    setStringIconOffsets: React.Dispatch<React.SetStateAction<Record<string, { x: number; y: number }>>>;
    draggingIconRef: React.MutableRefObject<DraggingIcon | null>;

    CANVAS_SIZE: number;
    GRID_SIZE: number;
    minStringLen: number;
    maxStringLen: number;

    latLngToScreenPixel: (ll: LatLngPoint) => { x: number; y: number };
    meterToScreen: (x: number, y: number) => { x: number; y: number };
    getModuleRenderContext: (mod: any) => ModuleRenderContext;
    getDistanceToNearestModule: (xMeter: number, yMeter: number, excludeIndex?: number) => number | null;

    handleModuleClick: (index: number, e: React.MouseEvent) => void;
    handleModuleMouseDown: (index: number, e: React.MouseEvent) => void;
    handleMouseMove: (e: React.MouseEvent) => void;
    handleMouseUp: () => void;
    handleCanvasClick: (e: React.MouseEvent) => void;
}

export default function ElectricalCanvas({
    designData, strings,
    activeStringId, setActiveStringId,
    activeTool,
    selectedModuleIndex, selectedModuleIndices,
    isDragging, snapToGrid,
    hoveredModuleIndex, setHoveredModuleIndex,
    copiedModules, constraintViolations,
    highlightedStringId, setHighlightedStringId,
    showDistance,
    stringIconOffsets, setStringIconOffsets,
    draggingIconRef,
    CANVAS_SIZE, GRID_SIZE,
    minStringLen, maxStringLen,
    latLngToScreenPixel, meterToScreen, getModuleRenderContext,
    getDistanceToNearestModule,
    handleModuleClick, handleModuleMouseDown,
    handleMouseMove, handleMouseUp, handleCanvasClick,
}: ElectricalCanvasProps) {

    // ─── renderStringLines ──────────────────────────────────────────────────
    const renderStringLines = () => {
        const elements: React.ReactNode[] = [];

        strings.forEach(str => {
            const stringModules = designData.modules
                .map((m, i) => ({ ...m, index: i }))
                .filter(m => m.stringId === str.id)
                .sort((a, b) => {
                    const sa = meterToScreen(a.xMeter, a.yMeter);
                    const sb = meterToScreen(b.xMeter, b.yMeter);
                    return (sa.y - sb.y) || (sa.x - sb.x);
                });

            if (stringModules.length === 0) return;

            const isActive = activeStringId === str.id;

            if (stringModules.length >= 2) {
                const p0Screen = meterToScreen(stringModules[0].xMeter, stringModules[0].yMeter);
                let pathD = `M ${p0Screen.x} ${p0Screen.y}`;
                for (let i = 1; i < stringModules.length; i++) {
                    const p2Screen = meterToScreen(stringModules[i].xMeter, stringModules[i].yMeter);
                    pathD += ` L ${p2Screen.x} ${p2Screen.y}`;
                }

                const isValidLen = stringModules.length >= minStringLen && stringModules.length <= maxStringLen;
                const strokeColor = isValidLen ? str.color : '#ef4444';
                const dashArray = isValidLen ? "none" : "5,5";

                elements.push(
                    <g key={`group-${str.id}`}>
                        <defs>
                            <marker
                                id={`arrowhead-${str.id}`}
                                markerWidth="6"
                                markerHeight="6"
                                refX="3"
                                refY="3"
                                orient="auto-start-reverse"
                            >
                                <polygon points="0,0 6,3 0,6" fill={strokeColor} />
                            </marker>
                        </defs>
                        <path
                            key={`line-${str.id}`}
                            d={pathD}
                            stroke={strokeColor}
                            strokeWidth={isActive ? "4" : "3"}
                            strokeDasharray={dashArray}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            markerMid={`url(#arrowhead-${str.id})`}
                            markerEnd={`url(#arrowhead-${str.id})`}
                            opacity={isActive ? 1 : 0.8}
                            style={{
                                filter: isActive
                                    ? `drop-shadow(0 0 6px ${str.color}) drop-shadow(0 0 3px ${str.color})`
                                    : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                                transition: 'all 0.3s ease'
                            }}
                            className="pointer-events-none"
                        />
                    </g>
                );
            }

            // Position icon outside the roof
            const moduleScreenPositions = stringModules.map(m => meterToScreen(m.xMeter, m.yMeter));
            const minScreenY = Math.min(...moduleScreenPositions.map(p => p.y));
            const minScreenX = Math.min(...moduleScreenPositions.map(p => p.x));
            const maxScreenX = Math.max(...moduleScreenPositions.map(p => p.x));
            const centerScreenX = (minScreenX + maxScreenX) / 2;

            const ICON_OFFSET = 55;
            const autoIconX = centerScreenX;
            const autoIconY = minScreenY - ICON_OFFSET;

            const customOffset = stringIconOffsets[str.id];
            const iconX = autoIconX + (customOffset?.x || 0);
            const iconY = autoIconY + (customOffset?.y || 0);

            const topmostModule = stringModules.reduce((best, m) => {
                const sy = meterToScreen(m.xMeter, m.yMeter).y;
                const bsy = meterToScreen(best.xMeter, best.yMeter).y;
                return sy < bsy ? m : best;
            }, stringModules[0]);
            const topmostScreen = meterToScreen(topmostModule.xMeter, topmostModule.yMeter);

            elements.push(
                <line
                    key={`connector-${str.id}`}
                    x1={iconX}
                    y1={iconY}
                    x2={topmostScreen.x}
                    y2={topmostScreen.y}
                    stroke={str.color}
                    strokeWidth="1.5"
                    strokeDasharray="4,3"
                    opacity="0.7"
                    className="pointer-events-none"
                    style={{ filter: `drop-shadow(0 0 3px ${str.color})` }}
                />
            );
        });

        return elements;
    };

    // ─── renderStringIcons ──────────────────────────────────────────────────
    const renderStringIcons = () => {
        return strings.map(str => {
            const stringModules = designData.modules.filter(m => m.stringId === str.id);
            if (stringModules.length === 0) return null;

            const isActive = activeStringId === str.id;

            const moduleScreenPositions = stringModules.map(m => meterToScreen(m.xMeter, m.yMeter));
            const minScreenY = Math.min(...moduleScreenPositions.map(p => p.y));
            const minScreenX = Math.min(...moduleScreenPositions.map(p => p.x));
            const maxScreenX = Math.max(...moduleScreenPositions.map(p => p.x));
            const centerScreenX = (minScreenX + maxScreenX) / 2;

            const ICON_OFFSET = 55;
            const autoIconX = centerScreenX;
            const autoIconY = minScreenY - ICON_OFFSET;

            const customOffset = stringIconOffsets[str.id];
            const iconX = autoIconX + (customOffset?.x || 0);
            const iconY = autoIconY + (customOffset?.y || 0);

            return (
                <div
                    key={`icon-div-${str.id}`}
                    style={{
                        position: 'absolute',
                        left: iconX,
                        top: iconY,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 50,
                        cursor: draggingIconRef.current?.id === str.id ? 'grabbing' : 'grab',
                        userSelect: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                    }}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        setActiveStringId(str.id);
                        const container = e.currentTarget.parentElement!;
                        const rect = container.getBoundingClientRect();
                        draggingIconRef.current = {
                            id: str.id,
                            startMouseX: e.clientX - rect.left,
                            startMouseY: e.clientY - rect.top,
                            startOffsetX: customOffset?.x || 0,
                            startOffsetY: customOffset?.y || 0
                        };
                        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
                    }}
                    onPointerMove={(e) => {
                        if (!draggingIconRef.current || draggingIconRef.current.id !== str.id) return;
                        const container = e.currentTarget.parentElement!;
                        const rect = container.getBoundingClientRect();
                        const dx = (e.clientX - rect.left) - draggingIconRef.current.startMouseX;
                        const dy = (e.clientY - rect.top) - draggingIconRef.current.startMouseY;
                        setStringIconOffsets(prev => ({
                            ...prev,
                            [str.id]: {
                                x: draggingIconRef.current!.startOffsetX + dx,
                                y: draggingIconRef.current!.startOffsetY + dy
                            }
                        }));
                    }}
                    onPointerUp={(e) => {
                        draggingIconRef.current = null;
                        (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
                    }}
                >
                    {/* Circle icon */}
                    <div
                        style={{
                            width: isActive ? 42 : 38,
                            height: isActive ? 42 : 38,
                            borderRadius: '50%',
                            backgroundColor: str.color,
                            border: isActive ? '3.5px solid #fbbf24' : '3px solid white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: isActive
                                ? `0 4px 16px rgba(251,191,36,0.5), 0 0 0 4px rgba(251,191,36,0.2)`
                                : '0 3px 10px rgba(0,0,0,0.6)',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <svg width="16" height="16" viewBox="-8 -8 16 16">
                            <path
                                d="M -4 -7 L 2 -2 L -1.5 0.5 L 4 7 L -2 2 L 1.5 -0.5 Z"
                                fill="white"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                    {/* Label */}
                    <div style={{
                        fontSize: 10,
                        fontWeight: 'bold',
                        color: 'white',
                        textShadow: '0 1px 4px rgba(0,0,0,0.9)',
                        whiteSpace: 'nowrap',
                        letterSpacing: '0.5px',
                    }}>
                        {str.name}
                    </div>
                </div>
            );
        });
    };

    return (
        <div className="flex-1 bg-gradient-to-br from-slate-900 via-slate-800 to-black relative overflow-hidden flex items-center justify-center">
            <div className="absolute top-4 left-4 z-30 bg-white/95 backdrop-blur-md px-4 py-2 rounded-xl shadow-xl border-2 border-slate-200 text-sm font-semibold text-slate-700">
                {activeTool === 'edit'
                    ? `✏️ Edit mode: ${selectedModuleIndices.size > 1 ? `${selectedModuleIndices.size} modules selected` : selectedModuleIndex !== null ? 'Module selected - drag to move' : 'Select a module to edit'}${snapToGrid ? ' | Grid: ON' : ''}${showDistance && selectedModuleIndex !== null ? ` | Distance: ${Math.round(getDistanceToNearestModule(designData.modules[selectedModuleIndex].xMeter, designData.modules[selectedModuleIndex].yMeter, selectedModuleIndex) || 0)}m` : ''}`
                    : activeStringId
                        ? "🎯 Select mode: Click modules to add/remove from active string"
                        : "👆 Select mode: Select a string to assign modules"}
            </div>

            {/* Constraint violations warning */}
            {constraintViolations.length > 0 && (
                <div className="absolute top-16 left-4 z-30 bg-red-500/95 backdrop-blur-md px-4 py-2 rounded-xl shadow-xl border-2 border-red-600 text-sm font-semibold text-white max-w-md">
                    <div className="flex items-center gap-2">
                        <AlertCircle size={18} />
                        <div>
                            <div className="font-bold">Constraint Violations:</div>
                            <ul className="text-xs mt-1 list-disc list-inside">
                                {Array.from(new Set(constraintViolations)).map((v, i) => (
                                    <li key={i}>{v}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Copy indicator */}
            {copiedModules.length > 0 && (
                <div className="absolute top-4 right-4 z-30 bg-green-500/95 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-lg text-xs font-semibold text-white flex items-center gap-2">
                    <Clipboard size={14} />
                    {copiedModules.length} module(s) copied (Ctrl+V to paste)
                </div>
            )}

            {/* Grid overlay */}
            {snapToGrid && (
                <div
                    className="absolute inset-0 pointer-events-none z-5"
                    style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                    }}
                />
            )}

            <div
                className="relative shadow-2xl bg-gradient-to-br from-slate-900 to-black border-4 border-slate-700 rounded-lg overflow-hidden"
                style={{ width: `${CANVAS_SIZE}px`, height: `${CANVAS_SIZE}px` }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onClick={handleCanvasClick}
            >
                {/* SVG Layer for Roof Outlines and String Connections */}
                <svg className="absolute inset-0 w-full h-full z-10 overflow-visible">
                    {/* Roof Outlines */}
                    {designData.roofs.map(roof => {
                        const pts = roof.points.map(latLngToScreenPixel);
                        return (
                            <polygon
                                key={roof.id}
                                points={pts.map((p: { x: number; y: number }) => `${p.x},${p.y}`).join(' ')}
                                fill="none"
                                stroke="rgba(255,255,255,0.4)"
                                strokeWidth="2.5"
                                strokeDasharray="6,4"
                                className="pointer-events-none"
                                style={{ filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.3))' }}
                            />
                        );
                    })}

                    {/* String Lines and Icons */}
                    {renderStringLines()}
                </svg>

                {/* String Icons Layer */}
                {renderStringIcons()}

                {/* Interactive Modules Layer */}
                <div className="absolute inset-0 z-20">
                    {designData.modules.map((mod, i) => {
                        const ctx = getModuleRenderContext(mod);
                        const assignedString = strings.find(s => s.id === mod.stringId);
                        const isAssigned = !!assignedString;
                        const isSelected = selectedModuleIndex === i || selectedModuleIndices.has(i);
                        const isMultiSelected = selectedModuleIndices.has(i) && selectedModuleIndices.size > 1;
                        const isHighlighted = highlightedStringId && mod.stringId === highlightedStringId && !isSelected;

                        return (
                            <div
                                key={i}
                                onClick={(e) => handleModuleClick(i, e)}
                                onMouseDown={(e) => handleModuleMouseDown(i, e)}
                                onMouseEnter={() => {
                                    setHoveredModuleIndex(i);
                                    if (mod.stringId) {
                                        setHighlightedStringId(mod.stringId);
                                    }
                                }}
                                onMouseLeave={() => {
                                    setHoveredModuleIndex(null);
                                    if (!isSelected) {
                                        setHighlightedStringId(null);
                                    }
                                }}
                                style={{
                                    left: ctx.x,
                                    top: ctx.y,
                                    width: ctx.width,
                                    height: ctx.height,
                                    position: 'absolute',
                                    backgroundColor: isAssigned ? assignedString.color : 'rgba(30, 41, 59, 0.8)',
                                    transform: `rotate(${ctx.rotationDeg}deg)`,
                                    transformOrigin: 'center center',
                                    zIndex: isSelected ? 30 : hoveredModuleIndex === i ? 25 : isHighlighted ? 22 : 20,
                                    transition: isDragging && isSelected ? 'none' : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                                className={`
                                border-2 hover:brightness-125 hover:scale-105
                                ${isSelected
                                        ? 'ring-4 ring-yellow-400 ring-offset-2 border-yellow-400 cursor-move shadow-2xl'
                                        : 'cursor-pointer shadow-lg hover:shadow-xl'
                                    }
                                ${isAssigned ? 'border-white/60 shadow-lg' : 'border-white/30'}
                                ${activeStringId && !isAssigned && !isSelected ? 'hover:border-white hover:ring-2 hover:ring-white/50' : ''}
                                ${isDragging && isSelected ? 'opacity-90 scale-110' : ''}
                                ${isHighlighted ? 'ring-2 ring-blue-400 ring-offset-1 border-blue-300' : ''}
                            `}
                            >
                                {isAssigned && (
                                    <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-white/90">
                                    </div>
                                )}
                                {isSelected && activeTool === 'edit' && isDragging && (
                                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap z-50">
                                        Dragging{isMultiSelected ? ` ${selectedModuleIndices.size} modules` : ''}...
                                    </div>
                                )}
                                {/* Show coordinates on hover in edit mode */}
                                {activeTool === 'edit' && hoveredModuleIndex === i && !isDragging && (
                                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-800/90 text-white text-[9px] font-mono px-2 py-1 rounded whitespace-nowrap z-50">
                                        ({mod.xMeter.toFixed(2)}m, {mod.yMeter.toFixed(2)}m){ctx.rotationDeg !== 0 ? ` • ${Math.round(ctx.rotationDeg)}°` : ''}
                                    </div>
                                )}
                                {/* Show distance to nearest module when dragging */}
                                {isDragging && isSelected && showDistance && selectedModuleIndex === i && (
                                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-blue-500/90 text-white text-[9px] font-mono px-2 py-1 rounded whitespace-nowrap z-50">
                                        Distance: {(getDistanceToNearestModule(mod.xMeter, mod.yMeter, i) || 0).toFixed(2)}m
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
            
            <ProjectStatsFooter designData={designData} />
        </div>
    );
}
