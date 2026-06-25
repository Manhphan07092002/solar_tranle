import React, { useState, useCallback, useRef, useEffect } from 'react';
import { DesignState } from '../../../types';
import { latLngToPixel } from '../../../utils/mapUtils';
import WorldViewport from '../modeling/WorldViewport';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface Props {
    designData: DesignState;
}

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 900;

export default function Full3DViewer({ designData }: Props) {
    const origin = designData.mapConfig
        ? { lat: designData.mapConfig.lat, lng: designData.mapConfig.lng }
        : { lat: 0, lng: 0 };

    const [viewState, setViewState] = useState({
        center: origin,
        zoom: designData.mapConfig?.zoom || 18,
    });
    
    // Interactive 3D controls using refs for 60fps performance without re-rendering
    const tiltRef = useRef(60);
    const rotRef = useRef(45);
    const scaleRef = useRef(1);
    const transformWrapperRef = useRef<HTMLDivElement>(null);
    
    const setScale = (updater: number | ((prev: number) => number)) => {
        scaleRef.current = typeof updater === 'function' ? updater(scaleRef.current) : updater;
        if (transformWrapperRef.current) {
            transformWrapperRef.current.style.transform = `scale(${scaleRef.current}) rotateX(${tiltRef.current}deg) rotateZ(${rotRef.current}deg)`;
        }
    };

    const setTilt = (updater: number | ((prev: number) => number)) => {
        tiltRef.current = typeof updater === 'function' ? updater(tiltRef.current) : updater;
        if (transformWrapperRef.current) {
            transformWrapperRef.current.style.transform = `scale(${scaleRef.current}) rotateX(${tiltRef.current}deg) rotateZ(${rotRef.current}deg)`;
        }
    };

    const setRot = (updater: number | ((prev: number) => number)) => {
        rotRef.current = typeof updater === 'function' ? updater(rotRef.current) : updater;
        if (transformWrapperRef.current) {
            transformWrapperRef.current.style.transform = `scale(${scaleRef.current}) rotateX(${tiltRef.current}deg) rotateZ(${rotRef.current}deg)`;
        }
    };
    
    const isDragging = useRef(false);
    const lastMousePos = useRef({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Use native wheel event to prevent default page scrolling properly
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleNativeWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            scaleRef.current = Math.max(0.5, Math.min(3, scaleRef.current * delta));
            if (transformWrapperRef.current) {
                transformWrapperRef.current.style.transform = `scale(${scaleRef.current}) rotateX(${tiltRef.current}deg) rotateZ(${rotRef.current}deg)`;
            }
        };

        container.addEventListener('wheel', handleNativeWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleNativeWheel);
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging.current) return;
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        
        rotRef.current += dx * 0.5;
        tiltRef.current = Math.max(0, Math.min(85, tiltRef.current - dy * 0.5));
        
        if (transformWrapperRef.current) {
            transformWrapperRef.current.style.transform = `scale(${scaleRef.current}) rotateX(${tiltRef.current}deg) rotateZ(${rotRef.current}deg)`;
        }

        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
        isDragging.current = false;
    };

    const meterToScreen = useCallback((xMeter: number, yMeter: number) => {
        const EARTH_RADIUS = 6378137;
        const lat = origin.lat + (yMeter / EARTH_RADIUS) * (180 / Math.PI);
        const lng = origin.lng + (xMeter / (EARTH_RADIUS * Math.cos(origin.lat * Math.PI / 180))) * (180 / Math.PI);
        return latLngToPixel(viewState.center, viewState.zoom, CANVAS_WIDTH, CANVAS_HEIGHT, { lat, lng });
    }, [origin.lat, origin.lng, viewState.center, viewState.zoom]);

    const getRenderPPM = useCallback(() => {
        const p0 = meterToScreen(0, 0);
        const p1 = meterToScreen(1, 0);
        return Math.abs(p1.x - p0.x) || 20;
    }, [meterToScreen]);

    const ppm = getRenderPPM();
    const baseW = (designData.selectedModule?.width || 1000) / 1000;
    const baseH = (designData.selectedModule?.height || 1700) / 1000;

    const getMetersToPixels = (meters: number) => {
        return meters * ppm;
    };

    const getModuleZ = (roofId: string) => {
        const roof = designData.roofs.find(r => r.id === roofId);
        const baseHeightPx = getMetersToPixels(roof?.baseHeight || 3);
        
        // Put modules a little bit above baseHeight so they sit on top of the 3D roof visually
        // We use a safe margin that covers most typical roof slopes to ensure visibility
        let maxH = 0;
        if (roof?.tilt) {
           maxH = getMetersToPixels(2); // Rough average roof height offset
        }
        return baseHeightPx + maxH + 5; 
    };

    const pvModules = designData.modules.map(mod => {
        const isPortrait = mod.orientation === 'portrait';
        const wPx = (isPortrait ? baseW : baseH) * ppm;
        const hPx = (isPortrait ? baseH : baseW) * ppm;
        const sp = meterToScreen(mod.xMeter, mod.yMeter);
        
        let color = '#1e3a8a';
        if (mod.stringId && designData.strings) {
             const str = designData.strings.find(s => s.id === mod.stringId);
             if (str?.color) color = str.color;
        }

        return {
            roofId: mod.surfaceId || '',
            px: sp.x,
            py: sp.y,
            azimuth: mod.azimuth || 0,
            widthPx: wPx,
            heightPx: hPx,
            color,
            stringId: mod.stringId
        };
    });

    return (
        <div 
            ref={containerRef}
            className="w-full h-[500px] relative overflow-hidden bg-slate-900 rounded-lg cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* The WorldViewport Container is scaled and rotated for ultra-smooth 60fps performance */}
            <div 
                ref={transformWrapperRef}
                style={{ 
                    width: '100%', 
                    height: '100%', 
                    transform: `scale(${scaleRef.current}) rotateX(${tiltRef.current}deg) rotateZ(${rotRef.current}deg)`, 
                    transformStyle: 'preserve-3d',
                    transformOrigin: 'center center'
                }}
            >
                <WorldViewport
                    is3D={true}
                    tiltAngle={0}
                    rotationAngle={0}
                    isRotatingView={false} // Disable auto rotate so user can drag
                    viewState={viewState}
                    designData={designData}
                    snapToGrid={false}
                    showDimensions={false}
                    measurementMode={false}
                    isDrawing={false}
                    measurementPoints={[]}
                    points={[]}
                    previewPoint={null}
                    snapCursor={null}
                    selectedId={null}
                    roofHeight3D={0}
                    currentLayer="google"
                    activeTool="select"
                    pvModules={pvModules}
                    onCanvasClick={() => {}}
                    onCanvasMouseDown={() => {}}
                    onCanvasMouseMove={() => {}}
                    onCanvasMouseUp={() => {}}
                    onObjectClick={() => {}}
                    onPointMouseDown={() => {}}
                    onEdgeMouseDown={() => {}}
                    onEdgeDoubleClick={() => {}}
                    onPointDoubleClick={() => {}}
                >
                    {/* 3D DC Strings Overlay */}
                    {designData.strings && designData.strings.map((str, strIdx) => {
                        const color = str.color || '#ef4444';
                        // Determine which modules belong to this string
                        const moduleIndices: number[] = [];
                        designData.modules.forEach((m, idx) => {
                            if (m.stringId === str.id) moduleIndices.push(idx);
                        });

                        return (
                            <svg key={`str-${strIdx}`} className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" style={{ transform: `translateZ(30px)` }}>
                                {moduleIndices.map((modIdx, i) => {
                                    if (i === 0) return null;
                                    const prevMod = designData.modules[moduleIndices[i - 1]];
                                    const currMod = designData.modules[modIdx];
                                    if (!prevMod || !currMod) return null;
                                    
                                    const p1 = meterToScreen(prevMod.xMeter, prevMod.yMeter);
                                    const p2 = meterToScreen(currMod.xMeter, currMod.yMeter);
                                    
                                    return (
                                        <line
                                            key={`line-${i}`}
                                            x1={p1.x} y1={p1.y}
                                            x2={p2.x} y2={p2.y}
                                            stroke={color}
                                            strokeWidth={4}
                                            strokeLinecap="round"
                                            strokeDasharray="4,4"
                                            opacity={0.8}
                                        />
                                    );
                                })}
                            </svg>
                        );
                    })}
                </WorldViewport>
            </div>
            
            {/* Controls Overlay */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 bg-slate-800/90 p-2 rounded-lg shadow-md z-50 border border-slate-700">
                <button onClick={() => setScale(s => Math.min(3, s * 1.2))} className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors" title="Zoom In">
                    <ZoomIn size={20} />
                </button>
                <button onClick={() => setScale(s => Math.max(0.5, s / 1.2))} className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors" title="Zoom Out">
                    <ZoomOut size={20} />
                </button>
                <button onClick={() => { setTilt(60); setRot(45); setScale(1); }} className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors" title="Reset View">
                    <RotateCcw size={20} />
                </button>
            </div>
            
            <div className="absolute bottom-4 left-4 bg-slate-800/80 px-3 py-1.5 rounded-md text-xs font-medium text-slate-300 shadow-sm pointer-events-none border border-slate-700">
                Drag to rotate • Scroll to zoom
            </div>
        </div>
    );
}
