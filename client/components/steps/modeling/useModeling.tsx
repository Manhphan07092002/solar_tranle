import React, { useState, useRef, useEffect, useMemo, useCallback, useReducer } from 'react';
import { DesignState, RoofSurface, Obstruction, LatLngPoint, TreeObject } from '../../../types';
import { Grid, Home, TreeDeciduous, Sun, Trash2, CloudSun, MousePointer2, Box, Pentagon, Ruler, Grip, Undo, Redo, MoreVertical, ZoomIn, ZoomOut, Layers, RotateCcw, Move3d, Eye, Compass, Focus, Minus, Plus, Hand, Navigation, HelpCircle, X, ChevronRight, ChevronsRight, Copy, Clipboard, AlertTriangle, CheckCircle2, Scissors, Download, Upload, Play, SplitSquareHorizontal, Wand2 } from 'lucide-react';
import { latLngToPixel, pixelToLatLng, getMetersPerPixel, getAutoAzimuth } from '../../../utils/mapUtils';
import { splitPolygon, getPolygonArea, getEdgeLengthText, calculateAngle, calculateInheritedBaseHeight, getDistanceToSegment } from '../../../utils/geometry/polygonUtils';
import { calculateRoofStructureLines } from '../../../utils/geometry/roofGeometry';
import { getDistanceKm, isPointInPolygon } from '../../../utils/helpers';
import WorldViewport from './WorldViewport';
import { ActiveTool, MapLayer, HistoryAction, HistoryState, historyReducer, DragState, SelectedPoint, SelectedEdge, ContextMenuState, SnapTarget, MeasurementResult, CopiedObjects, extractScene } from './types';

export function useModeling(designData: any, setDesignData: any) {
    const canvasRef = useRef<HTMLDivElement>(null);
    const worldTransformRef = useRef<HTMLDivElement>(null); // Ref for 3D container

    // Debounced design data for heavy validation computations
    const [debouncedDesignData, setDebouncedDesignData] = useState<DesignState>(designData);
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedDesignData(designData);
        }, 800); // Tăng thời gian chờ cho máy yếu
        return () => clearTimeout(timer);
    }, [designData]);

    // View state
    const [activeTool, setActiveTool] = useState<'select' | 'pan' | 'roof' | 'obstruction' | 'tree' | 'rotate'>('select');
    const [currentLayer, setCurrentLayer] = useState<'google' | 'esri' | 'osm'>('google');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set()); // Multi-select
    const [snapToGrid, setSnapToGrid] = useState(false);
    const [smartSnap, setSmartSnap] = useState(true); // Enable smart snap to nearby points
    const [snapTarget, setSnapTarget] = useState<{ x: number, y: number, type: 'grid' | 'point' | 'ortho' | null } | null>(null);
    const [showDimensions, setShowDimensions] = useState(true);
    const [layerVisibility, setLayerVisibility] = useState({
        roofs: true,
        obstructions: true,
        trees: true
    });
    const [showLayerPanel, setShowLayerPanel] = useState(false);

    const [is3D, setIs3D] = useState(false);
    const [tiltAngle, setTiltAngle] = useState(60);
    const [rotationAngle, setRotationAngle] = useState(0);

    // Refs for synced 3D state during high-frequency updates
    const rotationRef = useRef(0);
    const tiltRef = useRef(60);
    const scaleRef = useRef(1);
    const isRotatingViewRef = useRef(false);
    const pan3DRef = useRef({ x: 0, y: 0 });
    const isPanning3DRef = useRef(false);

    const [isRotatingView, setIsRotatingView] = useState(false);
    const isMapPanningRef = useRef(false);
    const [roofHeight3D, setRoofHeight3D] = useState(3);
    const [editRoofShapeMode, setEditRoofShapeMode] = useState(false);

    // Drag and drawing state
    const [dragState, setDragState] = useState<{
        type: 'point' | 'edge' | 'skeletonNode';
        activeId: string;
        activeIndex: number;
        movingPoints: { id: string, type: 'roof' | 'obstruction', index: number }[];
    } | null>(null);
    // Added specific state for multi-selected point
    const [selectedPoint, setSelectedPoint] = useState<{ id: string, index: number, type: 'roof' | 'obstruction' | 'skeletonNode' } | null>(null);
    const [selectedEdge, setSelectedEdge] = useState<{ id: string, index: number, type: 'roof' | 'obstruction' } | null>(null);

    const lastMousePosRef = useRef<{ x: number, y: number } | null>(null);
    const dragStartSnapshotRef = useRef<DesignState | null>(null);
    const lastDragPointRef = useRef<{ x: number, y: number } | null>(null);
    const isUpdatingFromMapConfigRef = useRef(false);
    // Tracks last rendered snap position so we skip setState when nothing changed
    const lastSnapRef = useRef<{ x: number; y: number; snapType: string | null } | null>(null);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, type: 'roof' | 'canvas' | 'obstruction' | 'tree', id: string | null } | null>(null);

    const [isOrthogonalLocked, setIsOrthogonalLocked] = useState(false);

    const [isDrawing, setIsDrawing] = useState(false);
    const [points, setPoints] = useState<{ x: number, y: number }[]>([]);
    const [previewPoint, setPreviewPoint] = useState<{ x: number, y: number } | null>(null);
    const [measurementMode, setMeasurementMode] = useState(false);
    const [measurementPoints, setMeasurementPoints] = useState<{ x: number, y: number }[]>([]);
    const [measurementResults, setMeasurementResults] = useState<Array<{ distance: number; points: Array<{ x: number, y: number }> }>>([]);
    const [snapCursor, setSnapCursor] = useState<{ x: number, y: number } | null>(null);
    const [showHelp, setShowHelp] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Map<string, string[]>>(new Map());
    const [validationWarnings, setValidationWarnings] = useState<Map<string, string[]>>(new Map());
    const [validationStrict, setValidationStrict] = useState(false);
    const [dismissedWarnings, setDismissedWarnings] = useState<Set<string>>(new Set());
    const [copiedObjects, setCopiedObjects] = useState<{
        roofs: RoofSurface[];
        obstructions: Obstruction[];
        trees?: TreeObject[];
    } | null>(null);

    const [history, dispatchHistory] = useReducer(historyReducer, {
        past: [],
        present: extractScene(designData),
        future: [],
    });
    const canUndo = history.past.length > 0;
    const canRedo = history.future.length > 0;
    const isMountedRef = useRef(false);
    const rafIdRef = useRef<number | null>(null);

    // Undo/Redo specific to StepModeling interactions (if needed locally, else rely on Wizard's global undo/redo)
    // Here we use the global undo/redo passed from DesignWizard
    // We already have designData, setDesignData, undoStack, redoStack, pushUndoSnapshot, setRedoStack from props

    const initialConfig = useMemo(() => designData.mapConfig || { lat: 10.762622, lng: 106.660172, zoom: 19 }, [designData.mapConfig]);
    const safeInitial = {
        lat: Number.isFinite(initialConfig.lat) ? initialConfig.lat : 10.762622,
        lng: Number.isFinite(initialConfig.lng) ? initialConfig.lng : 106.660172,
        zoom: Math.min(Number.isFinite(initialConfig.zoom) ? initialConfig.zoom : 19, 22)
    };

    const [viewState, setViewState] = useState({
        center: { lat: safeInitial.lat, lng: safeInitial.lng },
        zoom: safeInitial.zoom
    });

    // Helper methods defined LOCALLY to capture correct viewState
    const currentStoredToScreen = useCallback((p: LatLngPoint) => {
        return latLngToPixel(viewState.center, viewState.zoom, CANVAS_WIDTH, CANVAS_HEIGHT, p);
    }, [viewState]);

    const currentGetPolygonArea = useCallback((pts: { x: number, y: number }[]) => {
        if (pts.length < 3) return 0;
        let areaPx = getPolygonArea(pts, viewState.center, viewState.zoom, CANVAS_WIDTH, CANVAS_HEIGHT);
        // Correct scaling for area based on zoom level
        const metersPerPixel = getMetersPerPixel(viewState.center.lat, viewState.zoom);
        return Math.abs(areaPx * metersPerPixel * metersPerPixel); // m^2
    }, [viewState]);

    // Mark component as mounted after first render
    useEffect(() => {
        isMountedRef.current = true;
    }, []);

    // 3D mode native wheel zoom
    useEffect(() => {
        const container = canvasRef.current;
        if (!container || !is3D) return;

        const handleNativeWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            scaleRef.current = Math.max(0.2, Math.min(5, scaleRef.current * delta));
            if (worldTransformRef.current) {
                worldTransformRef.current.style.transform = `translate(calc(-50% + ${pan3DRef.current.x}px), calc(-50% + ${pan3DRef.current.y}px)) scale(${scaleRef.current}) rotateX(${tiltRef.current}deg) rotateZ(${rotationRef.current}deg)`;
            }
        };

        container.addEventListener('wheel', handleNativeWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleNativeWheel);
    }, [is3D]);

    // SYNC STATE: transform manually to avoid React inline style lag
    useEffect(() => {
        if (worldTransformRef.current) {
            // Apply scale, tilt, rotation
            if (is3D) {
                worldTransformRef.current.style.transform = `translate(calc(-50% + ${pan3DRef.current.x}px), calc(-50% + ${pan3DRef.current.y}px)) scale(${scaleRef.current}) rotateX(${tiltAngle}deg) rotateZ(${rotationAngle}deg)`;
            } else {
                worldTransformRef.current.style.transform = `translate(-50%, -50%)`;
            }
        }
    }, [is3D, tiltAngle, rotationAngle]);

    // SYNC STATE: MapConfig -> ViewState
    const prevViewStateRef = useRef<{ lat: number, lng: number, zoom: number } | null>(null);
    useEffect(() => {
        if (!isMountedRef.current || !designData.mapConfig) return;

        const currentConfig = designData.mapConfig;
        const prevView = prevViewStateRef.current;

        // Chỉ cập nhật nếu tọa độ thực sự khác biệt đáng kể
        const hasChanged = !prevView ||
            Math.abs(currentConfig.lat - viewState.center.lat) > 0.000001 ||
            Math.abs(currentConfig.lng - viewState.center.lng) > 0.000001 ||
            currentConfig.zoom !== viewState.zoom;

        if (hasChanged) {
            isUpdatingFromMapConfigRef.current = true;
            setViewState({
                center: { lat: currentConfig.lat, lng: currentConfig.lng },
                zoom: currentConfig.zoom
            });
            // Dùng requestAnimationFrame để reset flag sau khi render kết thúc
            requestAnimationFrame(() => {
                isUpdatingFromMapConfigRef.current = false;
            });
        }
    }, [designData.mapConfig]); // Chỉ phụ thuộc vào mapConfig

    // SYNC STATE: ViewState -> MapConfig (DEBOUNCED)
    useEffect(() => {
        if (!isMountedRef.current || isUpdatingFromMapConfigRef.current) return;

        const timer = setTimeout(() => {
            // Kiểm tra lại lần nữa trước khi cập nhật
            const currentCenter = designData.mapConfig;
            if (!currentCenter) return;

            const centerChanged = Math.abs(currentCenter.lat - viewState.center.lat) > 0.000001 ||
                Math.abs(currentCenter.lng - viewState.center.lng) > 0.000001;
            const zoomChanged = currentCenter.zoom !== viewState.zoom;

            if (centerChanged || zoomChanged) {
                // CẬP NHẬT TRONG TIMEOUT LÀ AN TOÀN VÌ NÓ TÁCH RỜI CHU KỲ RENDER
                setDesignData(prev => ({
                    ...prev,
                    mapConfig: {
                        lat: viewState.center.lat,
                        lng: viewState.center.lng,
                        zoom: viewState.zoom
                    }
                }));
            }
        }, 1000); // Tăng thời gian debounce lên 1s để giảm tải cho máy yếu

        return () => clearTimeout(timer);
    }, [viewState.center.lat, viewState.center.lng, viewState.zoom, designData.mapConfig, setDesignData]);

    const handleZoomIn = () => setViewState(prev => ({ ...prev, zoom: Math.min(prev.zoom + 1, 22) }));
    const handleZoomOut = () => setViewState(prev => ({ ...prev, zoom: Math.max(prev.zoom - 1, 10) }));
    const handleWheelNative = useCallback((e: WheelEvent) => {
        // Prevent default scroll behavior when zooming
        e.preventDefault();
        e.stopPropagation();

        // Only zoom if not drawing or dragging
        if (isDrawing || dragState) return;

        const delta = e.deltaY > 0 ? -0.5 : 0.5;
        setViewState(prev => ({ ...prev, zoom: Math.max(10, Math.min(22, prev.zoom + delta)) }));
    }, [isDrawing, dragState]);

    useEffect(() => {
        const el = worldTransformRef.current;
        if (!el) return;
        el.addEventListener('wheel', handleWheelNative, { passive: false });
        return () => {
            el.removeEventListener('wheel', handleWheelNative);
        };
    }, [handleWheelNative]);

    const CANVAS_WIDTH = 900;
    const CANVAS_HEIGHT = 900;
    const GRID_SIZE = 20;
    const SNAP_DISTANCE = 15; // pixels - distance for snapping to other points
    const cloneDesign = useCallback((d: DesignState): DesignState => JSON.parse(JSON.stringify(d)), []);

    /**
     * commitDesign — the single write path for all scene mutations.
     * Pushes the new state into the history stack and syncs the parent.
     */
    const commitDesign = useCallback((next: DesignState) => {
        dispatchHistory({ type: 'APPLY_SCENE_CHANGE', payload: extractScene(next) });
        setDesignData(next);
    }, [setDesignData]);

    /**
     * handleUndo:
     *   • While drawing → pop only the last drawn point (granular)
     *   • Otherwise     → undo the last committed scene change
     */
    const handleUndo = useCallback(() => {
        if (isDrawing && points.length > 0) {
            // Granular: remove only the last drawn point
            const newPoints = points.slice(0, -1);
            setPoints(newPoints);
            if (newPoints.length === 0) setIsDrawing(false);
            return;
        }
        if (history.past.length === 0) return;
        const prevScene = history.past[history.past.length - 1];
        dispatchHistory({ type: 'UNDO' });
        setDesignData(prev => ({ ...prev, ...prevScene }));
        // ❌ activeTool intentionally NOT reset
    }, [isDrawing, points, history.past, setDesignData]);

    /**
     * handleRedo — restore the next future scene state.
     */
    const handleRedo = useCallback(() => {
        if (history.future.length === 0) return;
        const nextScene = history.future[0];
        dispatchHistory({ type: 'REDO' });
        setDesignData(prev => ({ ...prev, ...nextScene }));
        // ❌ activeTool intentionally NOT reset
    }, [history.future, setDesignData]);

    // Helpers (Still needed for interaction logic)
    const latLngToScreenPixel = (ll: LatLngPoint) => {
        if (!ll || typeof ll.lat !== 'number' || typeof ll.lng !== 'number') return { x: 0, y: 0 };
        return latLngToPixel(viewState.center, viewState.zoom, CANVAS_WIDTH, CANVAS_HEIGHT, ll);
    };
    const screenToStored = (p: { x: number, y: number }) => {
        const ll = pixelToLatLng(viewState.center, viewState.zoom, CANVAS_WIDTH, CANVAS_HEIGHT, p);
        return { lat: ll.lat, lng: ll.lng };
    };
    const storedToScreen = (p: LatLngPoint) => latLngToScreenPixel(p);
    // Get all existing points for smart snap
    const getAllExistingPoints = useMemo(() => {
        const allPoints: Array<{ x: number, y: number, id: string, index: number, rawLatLng: LatLngPoint }> = [];

        designData.roofs.forEach(roof => {
            if (roof.points && Array.isArray(roof.points)) {
                roof.points.forEach((p, i) => {
                    if (p && typeof p.lat === 'number' && typeof p.lng === 'number') {
                        const screenPt = storedToScreen(p);
                        allPoints.push({ x: screenPt.x, y: screenPt.y, id: roof.id, index: i, rawLatLng: p });
                    }
                });
            }
        });

        designData.obstructions.forEach(obs => {
            if (obs.points && Array.isArray(obs.points)) {
                obs.points.forEach((p, i) => {
                    if (p && typeof p.lat === 'number' && typeof p.lng === 'number') {
                        const screenPt = storedToScreen(p);
                        allPoints.push({ x: screenPt.x, y: screenPt.y, id: obs.id, index: i, rawLatLng: p });
                    }
                });
            }
        });

        return allPoints;
    }, [designData.roofs, designData.obstructions, storedToScreen]);

    const dist = (a: { x: number, y: number }, b: { x: number, y: number }) => {
        const dx = a.x - b.x; const dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy);
    };

    // Pure snap computation — no setState side-effects so it is safe to call from
    // anywhere (useMemo, drag logic, click handlers) without triggering re-renders.
    const computeSnap = useCallback((x: number, y: number, excludeId?: string, excludeIndex?: number)
        : { snapped: { x: number; y: number }; snapType: 'grid' | 'point' | 'ortho' | null, snappedLatLng?: LatLngPoint } => {
        let snapped = { x, y };
        let snapType: 'grid' | 'point' | 'ortho' | null = null;
        let snappedLatLng: LatLngPoint | undefined;

        if (smartSnap) {
            let minDist = SNAP_DISTANCE;
            for (const pt of getAllExistingPoints) {
                if (excludeId && pt.id === excludeId && pt.index === excludeIndex) continue;
                const d = dist({ x, y }, pt);
                if (d < minDist) {
                    minDist = d;
                    snapped = { x: pt.x, y: pt.y };
                    snapType = 'point';
                    snappedLatLng = pt.rawLatLng; // Keep exact lat/lng for lossless merging
                }
            }

            if (snapType !== 'point') {
                let minEdgeDist = SNAP_DISTANCE;
                for (const roof of designData.roofs) {
                    if (excludeId && roof.id === excludeId) continue;
                    const screenPts = roof.points.map(storedToScreen);
                    for (let i = 0; i < screenPts.length; i++) {
                        const p1 = screenPts[i];
                        const p2 = screenPts[(i + 1) % screenPts.length];
                        const l2 = dist(p1, p2) ** 2;
                        if (l2 === 0) continue;
                        let t = ((x - p1.x) * (p2.x - p1.x) + (y - p1.y) * (p2.y - p1.y)) / l2;
                        t = Math.max(0, Math.min(1, t));
                        const proj = { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
                        const d = dist({ x, y }, proj);
                        if (d < minEdgeDist) {
                            minEdgeDist = d;
                            snapped = proj;
                            snapType = 'point';
                        }
                    }
                }
            }
        }

        if (isDrawing && points.length > 0 && snapType !== 'point') {
            const lastPoint = points[points.length - 1];
            let baseAngle = 0;
            let hasBaseAngle = false;

            if (points.length >= 2) {
                const prevPoint = points[points.length - 2];
                baseAngle = Math.atan2(lastPoint.y - prevPoint.y, lastPoint.x - prevPoint.x);
                hasBaseAngle = true;
            }

            const currentAngle = Math.atan2(y - lastPoint.y, x - lastPoint.x);
            const distToCursor = Math.hypot(x - lastPoint.x, y - lastPoint.y);
            let shouldSnapOrtho = isOrthogonalLocked;
            let targetAngle = currentAngle;
            const degree90 = Math.PI / 2;

            if (isOrthogonalLocked) {
                if (hasBaseAngle) {
                    const relativeAngle = currentAngle - baseAngle;
                    targetAngle = baseAngle + Math.round(relativeAngle / degree90) * degree90;
                } else {
                    targetAngle = Math.round(currentAngle / degree90) * degree90;
                }
            } else {
                const tolerance = (5 * Math.PI) / 180;
                if (hasBaseAngle) {
                    const relativeAngle = currentAngle - baseAngle;
                    const roundedRelative = Math.round(relativeAngle / degree90) * degree90;
                    if (Math.abs(relativeAngle - roundedRelative) < tolerance) {
                        targetAngle = baseAngle + roundedRelative;
                        shouldSnapOrtho = true;
                    }
                } else {
                    const roundedGlobal = Math.round(currentAngle / degree90) * degree90;
                    if (Math.abs(currentAngle - roundedGlobal) < tolerance) {
                        targetAngle = roundedGlobal;
                        shouldSnapOrtho = true;
                    }
                }
            }

            if (shouldSnapOrtho) {
                snapped = {
                    x: lastPoint.x + Math.cos(targetAngle) * distToCursor,
                    y: lastPoint.y + Math.sin(targetAngle) * distToCursor,
                };
                snapType = 'ortho';
            }
        }

        if (snapToGrid && snapType !== 'point' && snapType !== 'ortho') {
            snapped = { x: Math.round(snapped.x / GRID_SIZE) * GRID_SIZE, y: Math.round(snapped.y / GRID_SIZE) * GRID_SIZE };
            snapType = 'grid';
        }

        return { snapped, snapType, snappedLatLng };
    }, [snapToGrid, smartSnap, getAllExistingPoints, dist, isDrawing, points, isOrthogonalLocked, designData.roofs, storedToScreen]);

    // getSnappedPoint is the public API — it computes snap and returns only the position.
    // ⚠️ Does NOT set any state — callers (click/drag) use it for coordinate snapping only.
    // The mousemove handler is the sole place that sets snapTarget + snapCursor.
    const getSnappedPoint = useCallback((x: number, y: number, excludeId?: string, excludeIndex?: number) => {
        const res = computeSnap(x, y, excludeId, excludeIndex);
        return { x: res.snapped.x, y: res.snapped.y, latLng: res.snappedLatLng };
    }, [computeSnap]);
    const localGetPolygonArea = (screenPts: { x: number, y: number }[]) => {
        if (screenPts.length < 3) return 0;
        const latLngPoints = screenPts.map(p => pixelToLatLng(viewState.center, viewState.zoom, CANVAS_WIDTH, CANVAS_HEIGHT, p));
        let area = 0;
        for (let i = 0; i < latLngPoints.length; i++) {
            const j = (i + 1) % latLngPoints.length;
            const p1 = latLngPoints[i];
            const p2 = latLngPoints[j];
            if (!p1 || !p2 || typeof p1.lat !== 'number' || typeof p1.lng !== 'number' || typeof p2.lat !== 'number' || typeof p2.lng !== 'number') {
                continue;
            }
            area += (p2.lng * Math.PI / 180 - p1.lng * Math.PI / 180) * (2 + Math.sin(p1.lat * Math.PI / 180) + Math.sin(p2.lat * Math.PI / 180));
        }
        return Math.abs(area * 6371e3 * 6371e3 / 2);
    };

    // Validation helpers
    const doLinesIntersect = (p1: { x: number, y: number }, p2: { x: number, y: number }, p3: { x: number, y: number }, p4: { x: number, y: number }): boolean => {
        const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
        if (denom === 0) return false;
        const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
        const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;
        // Use strict inequalities to ignore vertex sharing intersections
        return ua > 0.0001 && ua < 0.9999 && ub > 0.0001 && ub < 0.9999;
    };

    const hasSelfIntersection = (points: { x: number, y: number }[]): boolean => {
        if (points.length < 4) return false;
        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            for (let j = i + 2; j < points.length; j++) {
                const p3 = points[j];
                const p4 = points[(j + 1) % points.length];
                if (i === 0 && j === points.length - 1) continue; // Skip adjacent edges
                if (doLinesIntersect(p1, p2, p3, p4)) return true;
            }
        }
        return false;
    };

    const validatePolygon = (points: LatLngPoint[], id: string, strict: boolean = false): { errors: string[], warnings: string[] } => {
        const errors: string[] = [];
        const warnings: string[] = [];
        const screenPts = points.map(storedToScreen);
        const area = localGetPolygonArea(screenPts);

        // Check minimum area - more lenient threshold
        // For roofs: minimum 0.5m² (small roof sections are valid)
        // For obstructions: minimum 0.1m² (small obstructions are valid)
        const minArea = strict ? 1 : 0.1;
        if (area < minArea) {
            if (strict) {
                errors.push(`Polygon area too small (${area.toFixed(2)}m², minimum ${minArea}m²)`);
            } else {
                warnings.push(`Polygon area is very small (${area.toFixed(2)}m²). Consider enlarging for better accuracy.`);
            }
        } else if (area < 1 && area >= minArea) {
            warnings.push(`Polygon area is small (${area.toFixed(2)}m²). Ensure this is intentional.`);
        }

        // Check maximum area (100,000m² = 10ha)
        if (area > 100000) {
            errors.push(`Polygon area too large (${(area / 10000).toFixed(2)}ha, maximum 10ha)`);
        }

        // Check self-intersection
        if (hasSelfIntersection(screenPts)) {
            errors.push('Polygon has self-intersection - fix overlapping edges');
        }

        // Check minimum vertices
        if (points.length < 3) {
            errors.push('Polygon must have at least 3 vertices');
        }

        // Bỏ qua check Degenerate polygon theo yêu cầu để đỡ bị spam Warning

        return { errors, warnings };
    };

    // Validate all objects - Memoize validation to prevent infinite loops (depends on debounced data)
    const validationKey = useMemo(() => {
        // Create a stable key based on data that should trigger validation
        return JSON.stringify({
            roofs: debouncedDesignData.roofs.map(r => ({ id: r.id, points: r.points })),
            obstructions: debouncedDesignData.obstructions.map(o => ({ id: o.id, points: o.points })),
            zoom: viewState.zoom,
            center: viewState.center,
            strict: validationStrict
        });
    }, [debouncedDesignData.roofs, debouncedDesignData.obstructions, viewState.zoom, viewState.center.lat, viewState.center.lng, validationStrict]);

    useEffect(() => {
        const errors = new Map<string, string[]>();
        const warnings = new Map<string, string[]>();

        // Use current viewState and helper functions directly
        const currentStoredToScreen = (p: LatLngPoint) => {
            if (!p || typeof p.lat !== 'number' || typeof p.lng !== 'number') return { x: 0, y: 0 };
            return latLngToPixel(viewState.center, viewState.zoom, CANVAS_WIDTH, CANVAS_HEIGHT, p);
        };

        const currentGetPolygonArea = (screenPts: { x: number, y: number }[]) => {
            if (screenPts.length < 3) return 0;
            const latLngPoints = screenPts.map(p => pixelToLatLng(viewState.center, viewState.zoom, CANVAS_WIDTH, CANVAS_HEIGHT, p));
            let area = 0;
            for (let i = 0; i < latLngPoints.length; i++) {
                const j = (i + 1) % latLngPoints.length;
                const p1 = latLngPoints[i];
                const p2 = latLngPoints[j];
                if (!p1 || !p2 || typeof p1.lat !== 'number' || typeof p1.lng !== 'number' || typeof p2.lat !== 'number' || typeof p2.lng !== 'number') {
                    continue;
                }
                area += (p2.lng * Math.PI / 180 - p1.lng * Math.PI / 180) * (2 + Math.sin(p1.lat * Math.PI / 180) + Math.sin(p2.lat * Math.PI / 180));
            }
            return Math.abs(area * 6371e3 * 6371e3 / 2);
        };

        const currentHasSelfIntersection = (points: { x: number, y: number }[]) => {
            if (points.length < 4) return false;
            for (let i = 0; i < points.length; i++) {
                const p1 = points[i];
                const p2 = points[(i + 1) % points.length];
                for (let j = i + 2; j < points.length; j++) {
                    const p3 = points[j];
                    const p4 = points[(j + 1) % points.length];
                    if (i === 0 && j === points.length - 1) continue;

                    const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
                    if (denom === 0) continue;
                    const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
                    const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;
                    // Use strict inequalities to ignore vertex sharing intersections
                    if (ua > 0.0001 && ua < 0.9999 && ub > 0.0001 && ub < 0.9999) return true;
                }
            }
            return false;
        };

        const validatePolygonLocal = (points: LatLngPoint[], id: string, strict: boolean = false): { errors: string[], warnings: string[] } => {
            const errors: string[] = [];
            const warnings: string[] = [];

            // Check if points array is valid
            if (!points || !Array.isArray(points)) {
                errors.push('Polygon has invalid points array');
                return { errors, warnings };
            }

            // More robust validation: check for invalid points
            const validPoints = points.filter(p => {
                // Check if point exists and is an object (not array)
                if (!p || typeof p !== 'object' || Array.isArray(p)) return false;

                // Check if lat and lng are numbers
                if (typeof p.lat !== 'number' || typeof p.lng !== 'number') return false;

                // Check if values are finite (not NaN, Infinity, -Infinity)
                if (!isFinite(p.lat) || !isFinite(p.lng)) return false;

                // Check if coordinates are within valid range
                // Latitude: -90 to 90, Longitude: -180 to 180
                if (Math.abs(p.lat) > 90 || Math.abs(p.lng) > 180) return false;

                return true;
            });

            if (validPoints.length !== points.length) {
                const invalidCount = points.length - validPoints.length;
                errors.push(`Polygon has ${invalidCount} invalid point(s). Click "Auto-fix" to remove them automatically.`);
            }

            if (validPoints.length < 3) {
                errors.push('Polygon must have at least 3 valid vertices');
                return { errors, warnings };
            }

            const screenPts = validPoints.map(currentStoredToScreen);
            const area = currentGetPolygonArea(screenPts);

            // Check for duplicate/overlapping points
            const hasDuplicatePoints = validPoints.length >= 2 && validPoints.some((p, i) => {
                if (!p || typeof p.lat !== 'number' || typeof p.lng !== 'number') return false;
                return validPoints.slice(i + 1).some(p2 => {
                    if (!p2 || typeof p2.lat !== 'number' || typeof p2.lng !== 'number') return false;
                    return Math.abs(p.lat - p2.lat) < 1e-8 && Math.abs(p.lng - p2.lng) < 1e-8;
                });
            });

            if (hasDuplicatePoints) {
                warnings.push('Polygon has duplicate or overlapping vertices');
            }

            // Format area for display
            const formatArea = (a: number): string => {
                if (a === 0) return '0.00';
                if (a < 0.01) return a.toExponential(2);
                if (a < 1) return a.toFixed(3);
                return a.toFixed(2);
            };

            const areaStr = formatArea(area);

            // Check for zero or near-zero area
            if (area < 0.001) {
                if (strict) {
                    errors.push(`Polygon area is zero or invalid (${areaStr}m²). Check for duplicate points or invalid shape.`);
                } else {
                    warnings.push(`Polygon area is effectively zero (${areaStr}m²). This may indicate duplicate points or an invalid shape.`);
                }
            } else {
                const minArea = strict ? 1 : 0.1;
                if (area < minArea) {
                    if (strict) {
                        errors.push(`Polygon area too small (${areaStr}m², minimum ${minArea}m²)`);
                    } else {
                        warnings.push(`Polygon area is very small (${areaStr}m²). Consider enlarging for better accuracy.`);
                    }
                } else if (area < 1 && area >= minArea) {
                    warnings.push(`Polygon area is small (${areaStr}m²). Ensure this is intentional.`);
                }
            }

            if (area > 100000) {
                errors.push(`Polygon area too large (${(area / 10000).toFixed(2)}ha, maximum 10ha)`);
            }

            if (currentHasSelfIntersection(screenPts)) {
                errors.push('Polygon has self-intersection - fix overlapping edges');
            }

            if (validPoints.length >= 3) {
                const firstPoint = screenPts[0];
                let allOnLine = true;
                if (screenPts.length > 2) {
                    const dx = screenPts[1].x - firstPoint.x;
                    const dy = screenPts[1].y - firstPoint.y;
                    for (let i = 2; i < screenPts.length; i++) {
                        const dxi = screenPts[i].x - firstPoint.x;
                        const dyi = screenPts[i].y - firstPoint.y;
                        if (Math.abs(dx * dyi - dy * dxi) > 0.1) {
                            allOnLine = false;
                            break;
                        }
                    }
                    if (allOnLine) {
                        warnings.push('All polygon vertices appear to be on the same line');
                    }
                }
            }

            return { errors, warnings };
        };

        debouncedDesignData.roofs.forEach(roof => {
            if (!roof || !roof.points || !Array.isArray(roof.points)) {
                errors.set(roof.id, ['Roof has invalid points array']);
                return;
            }
            try {
                const result = validatePolygonLocal(roof.points, roof.id, validationStrict);
                if (result.errors.length > 0) {
                    errors.set(roof.id, result.errors);
                }
                if (result.warnings.length > 0 && !dismissedWarnings.has(roof.id)) {
                    warnings.set(roof.id, result.warnings);
                }
            } catch (err) {
                console.error('Validation error for roof', roof.id, err);
                errors.set(roof.id, ['Validation failed: ' + (err instanceof Error ? err.message : String(err))]);
            }
        });

        debouncedDesignData.obstructions.forEach(obs => {
            if (!obs || !obs.points || !Array.isArray(obs.points)) {
                errors.set(obs.id, ['Obstruction has invalid points array']);
                return;
            }
            try {
                const result = validatePolygonLocal(obs.points, obs.id, validationStrict);
                if (result.errors.length > 0) {
                    errors.set(obs.id, result.errors);
                }
                if (result.warnings.length > 0 && !dismissedWarnings.has(obs.id)) {
                    warnings.set(obs.id, result.warnings);
                }
            } catch (err) {
                console.error('Validation error for obstruction', obs.id, err);
                errors.set(obs.id, ['Validation failed: ' + (err instanceof Error ? err.message : String(err))]);
            }
        });
        if (errors.size > 0) {
            // Log commented out to reduce spam
        }
        setValidationErrors(errors);
        setValidationWarnings(warnings);
    }, [validationKey, debouncedDesignData.roofs, debouncedDesignData.obstructions, viewState, validationStrict, dismissedWarnings]);

    const handleBulkDelete = useCallback(() => {
        if (selectedPoint) {
            // Xóa chính xác 1 điểm đang chọn
            const { id, index, type } = selectedPoint;
            if (type === 'roof') {
                const roof = designData.roofs.find(r => r.id === id);
                if (roof && roof.points.length > 3) {
                    commitDesign({
                        ...designData,
                        roofs: designData.roofs.map(r => r.id === id ? {
                            ...r,
                            points: r.points.filter((_, i) => i !== index),
                            isAnalyzed: false,
                            skeletonOffsets: undefined,
                            deletedSkeletonNodes: undefined
                        } : r)
                    });
                } else if (roof && roof.points.length <= 3) {
                    alert('Mái nhà phải có tối thiểu 3 điểm. Bạn không thể xóa thêm đỉnh.');
                }
            } else if (type === 'obstruction') {
                const obs = designData.obstructions.find(o => o.id === id);
                if (obs && obs.points.length > 3) {
                    commitDesign({
                        ...designData,
                        obstructions: designData.obstructions.map(o => o.id === id ? {
                            ...o,
                            points: o.points.filter((_, i) => i !== index)
                        } : o)
                    });
                } else if (obs && obs.points.length <= 3) {
                    alert('Hình khối (Vật cản) phải có tối thiểu 3 điểm. Bạn không thể xóa thêm đỉnh.');
                }
            } else if (type === 'skeletonNode') {
                commitDesign({
                    ...designData,
                    roofs: designData.roofs.map(r => {
                        if (r.id === id) {
                            const deletedNames = r.deletedSkeletonNodes || [];
                            if (!deletedNames.includes(index)) {
                                return { ...r, deletedSkeletonNodes: [...deletedNames, index] };
                            }
                        }
                        return r;
                    })
                });
            }
            setSelectedPoint(null);
            return;
        }

        if (selectedEdge) {
            // Xóa cạnh (nghĩa là xóa 2 điểm tạo nên cạnh đó)
            const { id, index, type } = selectedEdge;
            const getNewPoints = (points: any[]) => {
                const nextIndex = (index + 1) % points.length;
                return points.filter((_, i) => i !== index && i !== nextIndex);
            };

            if (type === 'roof') {
                const roof = designData.roofs.find(r => r.id === id);
                if (roof && roof.points.length > 4) { // Needs to have at least 3 after removing 2
                    commitDesign({
                        ...designData,
                        roofs: designData.roofs.map(r => r.id === id ? {
                            ...r,
                            points: getNewPoints(r.points),
                            isAnalyzed: false,
                            skeletonOffsets: undefined,
                            deletedSkeletonNodes: undefined
                        } : r)
                    });
                } else if (roof) {
                    alert('Xóa cạnh này sẽ làm mái có ít hơn 3 điểm. Bạn không thể xóa cạnh này.');
                }
            } else if (type === 'obstruction') {
                const obs = designData.obstructions.find(o => o.id === id);
                if (obs && obs.points.length > 4) {
                    commitDesign({
                        ...designData,
                        obstructions: designData.obstructions.map(o => o.id === id ? {
                            ...o,
                            points: getNewPoints(o.points)
                        } : o)
                    });
                } else if (obs) {
                    alert('Xóa cạnh này sẽ làm hình khối có ít hơn 3 điểm. Bạn không thể xóa cạnh này.');
                }
            }
            setSelectedEdge(null);
            return;
        }

        if (selectedIds.size === 0 && !selectedId) return;

        const idsToDelete = selectedIds.size > 0 ? selectedIds : new Set([selectedId!]);

        const newRoofs = designData.roofs.filter(r => !idsToDelete.has(r.id));
        const newObs = designData.obstructions.filter(o => !idsToDelete.has(o.id));
        const newTrees = (designData.trees || []).filter(t => !idsToDelete.has(t.id));

        commitDesign({ ...designData, roofs: newRoofs, obstructions: newObs, trees: newTrees });
        setSelectedIds(new Set());
        setSelectedId(null);
        setSelectedPoint(null);
        setSelectedEdge(null);
    }, [selectedIds, selectedId, designData, commitDesign, selectedPoint, selectedEdge]);

    const handleCopy = useCallback(() => {
        const idsToCopy = selectedIds.size > 0 ? selectedIds : (selectedId ? new Set([selectedId]) : new Set());
        if (idsToCopy.size === 0) return;

        setCopiedObjects({
            roofs: designData.roofs.filter(r => idsToCopy.has(r.id)),
            obstructions: designData.obstructions.filter(o => idsToCopy.has(o.id)),
            trees: (designData.trees || []).filter(t => idsToCopy.has(t.id))
        });
    }, [selectedIds, selectedId, designData]);

    const handlePaste = useCallback(() => {
        if (!copiedObjects) return;

        const offset = { lat: 0.0001, lng: 0.0001 }; // ~11m offset

        const newRoofs = copiedObjects.roofs.map(r => ({
            ...r,
            id: `r${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            points: r.points.map(p => ({
                lat: p.lat + offset.lat,
                lng: p.lng + offset.lng
            }))
        }));

        const newObstructions = copiedObjects.obstructions.map(o => ({
            ...o,
            id: `o${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            points: o.points.map(p => ({
                lat: p.lat + offset.lat,
                lng: p.lng + offset.lng
            }))
        }));

        const newTrees = copiedObjects.trees.map(t => ({
            ...t,
            id: `t${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            position: {
                lat: t.position.lat + offset.lat,
                lng: t.position.lng + offset.lng
            }
        }));

        commitDesign({
            ...designData,
            roofs: [...designData.roofs, ...newRoofs],
            obstructions: [...designData.obstructions, ...newObstructions],
            trees: [...(designData.trees || []), ...newTrees]
        });

        // Select newly pasted objects
        const newIds = new Set([...newRoofs.map(r => r.id), ...newObstructions.map(o => o.id), ...newTrees.map(t => t.id)]);
        setSelectedIds(newIds);
        setSelectedId(newIds.size === 1 ? Array.from(newIds)[0] : null);
    }, [copiedObjects, designData, commitDesign]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if user is typing in an input/textarea
            if (
                document.activeElement &&
                (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || (document.activeElement as HTMLElement).isContentEditable)
            ) {
                return;
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                handleBulkDelete();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleBulkDelete]);

    // Auto-fix invalid points
    const handleAutoFixInvalidPoints = useCallback(() => {

        const cleanPoints = (points: LatLngPoint[], id: string): { cleaned: LatLngPoint[], removed: number, invalidIndices: number[] } => {
            // More robust cleaning: handle various invalid cases
            // Use the same logic as validation to ensure consistency
            if (!points || !Array.isArray(points)) {
                console.warn(`cleanPoints: ${id} has invalid points array`);
                return { cleaned: [], removed: points?.length || 0, invalidIndices: [] };
            }

            const invalidIndices: number[] = [];
            const cleaned = points.filter((p, index) => {
                let isValid = true;

                // Check if point exists and is an object (not array)
                if (!p || typeof p !== 'object' || Array.isArray(p)) {
                    isValid = false;
                }
                // Check if lat and lng are numbers
                else if (typeof p.lat !== 'number' || typeof p.lng !== 'number') {
                    isValid = false;
                }
                // Check if values are finite (not NaN, Infinity, -Infinity)
                else if (!isFinite(p.lat) || !isFinite(p.lng)) {
                    isValid = false;
                }
                // Check if coordinates are within valid range
                else if (Math.abs(p.lat) > 90 || Math.abs(p.lng) > 180) {
                    isValid = false;
                }

                if (!isValid) {
                    invalidIndices.push(index);
                }

                return isValid;
            });

            return { cleaned, removed: invalidIndices.length, invalidIndices };
        };

        let fixedCount = 0;
        let totalRemoved = 0;
        const fixedIds: string[] = [];

        const newRoofs = designData.roofs.map(roof => {
            if (!roof || !roof.points || !Array.isArray(roof.points)) {
                console.warn(`Roof ${roof.id} has invalid points array structure`);
                return roof;
            }

            const originalLength = roof.points.length; const { cleaned, removed, invalidIndices } = cleanPoints(roof.points, roof.id);

            if (removed > 0) {
                fixedCount++;
                totalRemoved += removed;
                fixedIds.push(roof.id);
            }

            // Only update if we have at least 3 valid points
            if (cleaned.length >= 3) {
                return { ...roof, points: cleaned };
            } else if (cleaned.length > 0) {
                // If we have some valid points but less than 3, still update but warn
                console.warn(`⚠️ Roof ${roof.id} has only ${cleaned.length} valid points (minimum 3 required). Keeping cleaned version.`);
                return { ...roof, points: cleaned };
            } else {
                // If no valid points remain, keep original but mark for deletion
                console.error(`❌ Roof ${roof.id} has no valid points after cleaning. Keeping original for manual review.`);
                return roof;
            }
        });

        const newObstructions = designData.obstructions.map(obs => {
            if (!obs || !obs.points || !Array.isArray(obs.points)) {
                console.warn(`Obstruction ${obs.id} has invalid points array structure`);
                return obs;
            }

            const originalLength = obs.points.length; const { cleaned, removed, invalidIndices } = cleanPoints(obs.points, obs.id);

            if (removed > 0) {
                fixedCount++;
                totalRemoved += removed;
                fixedIds.push(obs.id);
            }

            if (cleaned.length >= 3) {
                return { ...obs, points: cleaned };
            } else if (cleaned.length > 0) {
                console.warn(`⚠️ Obstruction ${obs.id} has only ${cleaned.length} valid points (minimum 3 required). Keeping cleaned version.`);
                return { ...obs, points: cleaned };
            } else {
                console.error(`❌ Obstruction ${obs.id} has no valid points after cleaning. Keeping original for manual review.`);
                return obs;
            }
        });

        console.log(`📊 Auto-fix summary: fixedCount=${fixedCount}, totalRemoved=${totalRemoved}, fixedIds=${fixedIds.join(', ')}`);

        if (fixedCount > 0) {
            console.log(`✅ Auto-fix completed: fixed ${fixedCount} polygon(s), removed ${totalRemoved} invalid point(s)`);
            const fixedData = { ...designData, roofs: newRoofs, obstructions: newObstructions };

            console.log('📝 Committing fixed data...');
            console.log('Fixed roofs:', newRoofs.filter(r => fixedIds.includes(r.id)).map(r => ({ id: r.id, pointCount: r.points.length })));
            console.log('Fixed obstructions:', newObstructions.filter(o => fixedIds.includes(o.id)).map(o => ({ id: o.id, pointCount: o.points.length })));

            // Commit the fixed data - this will trigger validation automatically via validationKey
            commitDesign(fixedData);

            // Show success message
            const message = `✅ Đã sửa ${fixedCount} polygon(s) và loại bỏ ${totalRemoved} điểm không hợp lệ.\n\nPolygons đã được sửa:\n${fixedIds.map(id => `• ${id.substring(0, 8)}...`).join('\n')}\n\nValidation sẽ tự động chạy lại để kiểm tra.`;
            alert(message);

            console.log('✅ Auto-fix completed and data committed');
        } else {
            console.log('No invalid points found to fix');
            // Check if there are actually any invalid points by re-validating
            let hasInvalidPoints = false;
            designData.roofs.forEach(roof => {
                if (roof && roof.points && Array.isArray(roof.points)) {
                    const invalidCount = roof.points.filter(p => {
                        if (!p || typeof p !== 'object') return true;
                        if (typeof p.lat !== 'number' || typeof p.lng !== 'number') return true;
                        if (!isFinite(p.lat) || !isFinite(p.lng)) return true;
                        if (Math.abs(p.lat) > 90 || Math.abs(p.lng) > 180) return true;
                        return false;
                    }).length;
                    if (invalidCount > 0) hasInvalidPoints = true;
                }
            });
            designData.obstructions.forEach(obs => {
                if (obs && obs.points && Array.isArray(obs.points)) {
                    const invalidCount = obs.points.filter(p => {
                        if (!p || typeof p !== 'object') return true;
                        if (typeof p.lat !== 'number' || typeof p.lng !== 'number') return true;
                        if (!isFinite(p.lat) || !isFinite(p.lng)) return true;
                        if (Math.abs(p.lat) > 90 || Math.abs(p.lng) > 180) return true;
                        return false;
                    }).length;
                    if (invalidCount > 0) hasInvalidPoints = true;
                }
            });

            if (hasInvalidPoints) {
                alert('⚠️ Phát hiện điểm không hợp lệ nhưng không thể sửa tự động. Vui lòng kiểm tra lại dữ liệu.');
            } else {
                alert('✅ Không tìm thấy điểm không hợp lệ. Tất cả polygon đều hợp lệ.');
            }
        }
    }, [designData, commitDesign, validationErrors]);


    // Global mouse event handlers for dragging points (when mouse leaves canvas)
    useEffect(() => {
        if (!dragState) return;

        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (!canvasRef.current || !dragState) return;
            const rect = canvasRef.current.getBoundingClientRect();
            const rawX = e.clientX - rect.left;
            const rawY = e.clientY - rect.top;

            // Only process if within reasonable bounds (allow some overflow)
            if (rawX < -50 || rawX > 950 || rawY < -50 || rawY > 950) return;

            const snappedP = getSnappedPoint(rawX, rawY);
            const { x, y, latLng: exactLatLng } = snappedP;
            const newStoredPoint = exactLatLng || screenToStored({ x, y });

            if (dragState.type === 'point') {
                const newRoofs = designData.roofs.map(r => {
                    const movingIndices = dragState.movingPoints.filter(mp => mp.type === 'roof' && mp.id === r.id).map(mp => mp.index);
                    if (movingIndices.length === 0) return r;
                    return {
                        ...r,
                        points: r.points.map((p, i) => movingIndices.includes(i) ? newStoredPoint : p)
                    };
                });

                const newObstructions = designData.obstructions.map(o => {
                    const movingIndices = dragState.movingPoints.filter(mp => mp.type === 'obstruction' && mp.id === o.id).map(mp => mp.index);
                    if (movingIndices.length === 0) return o;
                    return {
                        ...o,
                        points: o.points.map((p, i) => movingIndices.includes(i) ? newStoredPoint : p)
                    };
                });

                setDesignData(prev => ({ ...prev, roofs: newRoofs, obstructions: newObstructions }));
            }
        };

        const handleGlobalMouseUp = () => {
            // Cancel any pending animation frame
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }

            if (dragState && dragState.type === 'point' && dragStartSnapshotRef.current) {
                dragStartSnapshotRef.current = null;
                lastDragPointRef.current = null;

                // Merge overlapping/close points before saving to history
                let finalData = designData;

                const mergeClosePoints = (points: LatLngPoint[]) => {
                    if (points.length <= 3) return points;
                    // First pass: merge adjacent points (within 10 pixels of each other)
                    const merged: LatLngPoint[] = [points[0]];
                    for (let i = 1; i < points.length; i++) {
                        const prev = merged[merged.length - 1];
                        const curr = points[i];
                        const p1 = latLngToPixel(viewState.center, viewState.zoom, CANVAS_WIDTH, CANVAS_HEIGHT, prev);
                        const p2 = latLngToPixel(viewState.center, viewState.zoom, CANVAS_WIDTH, CANVAS_HEIGHT, curr);
                        if (Math.hypot(p1.x - p2.x, p1.y - p2.y) > 10) {
                            merged.push(curr);
                        }
                    }
                    // Check last and first
                    if (merged.length > 3) {
                        const first = merged[0];
                        const last = merged[merged.length - 1];
                        const p1 = latLngToPixel(viewState.center, viewState.zoom, CANVAS_WIDTH, CANVAS_HEIGHT, first);
                        const p2 = latLngToPixel(viewState.center, viewState.zoom, CANVAS_WIDTH, CANVAS_HEIGHT, last);
                        if (Math.hypot(p1.x - p2.x, p1.y - p2.y) <= 10) {
                            merged.pop();
                        }
                    }
                    return merged.length >= 3 ? merged : points; // fall back to original if merging breaks the polygon
                };

                finalData = {
                    ...finalData,
                    roofs: finalData.roofs.map(r => ({ ...r, points: mergeClosePoints(r.points) })),
                    obstructions: finalData.obstructions.map(o => ({ ...o, points: mergeClosePoints(o.points) }))
                };

                // commitDesign = dispatchHistory(APPLY_SCENE_CHANGE) + setDesignData
                // history.present still has the before-drag scene → goes into past ✅
                commitDesign(finalData);
                setDragState(null);
            }
        };

        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
        };
    }, [dragState, getSnappedPoint, screenToStored, setDesignData, commitDesign]);

    // Handlers
    const handleFinishPoly = useCallback(() => {
        if (points.length < 3) return;

        // Merge adjacent close points BEFORE storing
        const mergedScreenPoints = [points[0]];
        for (let i = 1; i < points.length; i++) {
            const prev = mergedScreenPoints[mergedScreenPoints.length - 1];
            const curr = points[i];
            if (dist(prev, curr) > 10) { // 10px snap radius
                mergedScreenPoints.push(curr);
            }
        }
        // check first and last
        if (mergedScreenPoints.length > 3) {
            const first = mergedScreenPoints[0];
            const last = mergedScreenPoints[mergedScreenPoints.length - 1];
            if (dist(first, last) <= 10) {
                mergedScreenPoints.pop();
            }
        }

        if (mergedScreenPoints.length < 3) {
            // Cancel drawing if not enough valid points after merging
            setPoints([]);
            setPreviewPoint(null);
            setIsDrawing(false);
            setActiveTool('select');
            return;
        }

        const storedPoints = mergedScreenPoints.map(p => screenToStored(p));

        // Validate before creating
        const result = validatePolygon(storedPoints, 'new', validationStrict);

        // Block creation only if there are critical errors (not warnings)
        if (result.errors.length > 0) {
            const errorMsg = `Cannot create polygon:\n${result.errors.join('\n')}${result.warnings.length > 0 ? '\n\nWarnings:\n' + result.warnings.join('\n') : ''}`;
            alert(errorMsg);
            return;
        }

        // Show warnings but allow creation
        if (result.warnings.length > 0 && !validationStrict) {
            const proceed = confirm(`Warning:\n${result.warnings.join('\n')}\n\nDo you want to create this polygon anyway?`);
            if (!proceed) return;
        }

        if (activeTool === 'roof') {
            // Auto calculate azimuth
            const autoAzimuth = getAutoAzimuth(storedPoints, mapCenter[0], mapCenter[1], mapZoom);

            const newRoof: RoofSurface = {
                id: `r${Date.now()}`,
                points: storedPoints,
                azimuth: autoAzimuth,
                tilt: 20,
                shape: 'gable', // Default to gable roof
                baseHeight: 3, // Default 3m (1 story building)
            };
            commitDesign({ ...designData, roofs: [...designData.roofs, newRoof] });
            setSelectedId(newRoof.id);
            setSelectedIds(new Set([newRoof.id]));
        } else if (activeTool === 'obstruction') {
            const newObstruction: Obstruction = { id: `o${Date.now()}`, points: storedPoints, label: "Obstruction" };
            commitDesign({ ...designData, obstructions: [...designData.obstructions, newObstruction] });
            setSelectedId(newObstruction.id);
            setSelectedIds(new Set([newObstruction.id]));
        }
        setPoints([]);
        setPreviewPoint(null);
        setIsDrawing(false);
        setActiveTool('select');
    }, [points, screenToStored, validatePolygon, activeTool, designData, commitDesign, validationStrict]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger shortcuts when typing in inputs
            if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
                return;
            }

            if (e.key === 'Delete') {
                if (selectedIds.size > 0 || selectedId || selectedPoint || selectedEdge) {
                    handleBulkDelete();
                }
            } else if (e.key === 'Escape') {
                if (isDrawing) {
                    setIsDrawing(false);
                    setPoints([]);
                    setPreviewPoint(null);
                    setActiveTool('select');
                } else if (selectedId || selectedIds.size > 0 || selectedPoint || selectedEdge) {
                    setSelectedId(null);
                    setSelectedIds(new Set());
                    setSelectedPoint(null);
                    setSelectedEdge(null);
                } else if (measurementMode) {
                    setMeasurementMode(false);
                    setMeasurementPoints([]);
                }
                setContextMenu(null); // Close context menu on escape
            } else if (e.key === 'Enter') {
                if (isDrawing && points.length >= 3) {
                    handleFinishPoly();
                }
            } else if (e.key === 'v' || e.key === 'V') {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    handlePaste();
                } else {
                    setActiveTool('select');
                }
            } else if (e.key === 'c' || e.key === 'C') {
                if ((e.ctrlKey || e.metaKey) && (selectedIds.size > 0 || selectedId)) {
                    e.preventDefault();
                    handleCopy();
                }
            } else if (e.key === 'x' || e.key === 'X') {
                if ((e.ctrlKey || e.metaKey) && (selectedIds.size > 0 || selectedId)) {
                    e.preventDefault();
                    handleCopy();
                    handleBulkDelete();
                }
            } else if (e.key === 'z' || e.key === 'Z') {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    if (e.shiftKey) {
                        handleRedo();
                    } else {
                        handleUndo();
                    }
                }
            } else if (e.key === 'y' || e.key === 'Y') {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    handleRedo();
                }
            } else if (e.key === 'p' || e.key === 'P') {
                setActiveTool('roof');
                setIsDrawing(false);
                setSelectedId(null);
                setSelectedIds(new Set());
                setSelectedPoint(null);
                setSelectedEdge(null);
            } else if (e.key === 'o' || e.key === 'O') {
                setActiveTool('obstruction');
                setIsDrawing(false);
                setSelectedId(null);
                setSelectedIds(new Set());
                setSelectedPoint(null);
                setSelectedEdge(null);
            } else if (e.key === 't' || e.key === 'T') {
                setActiveTool('tree');
                setIsDrawing(false);
                setSelectedId(null);
                setSelectedIds(new Set());
                setSelectedPoint(null);
                setSelectedEdge(null);
            } else if (e.key === 'm' || e.key === 'M') {
                setMeasurementMode(!measurementMode);
                if (measurementMode) {
                    setMeasurementPoints([]);
                }
            } else if (e.key === 'h' || e.key === 'H') {
                setActiveTool('pan');
                setIsDrawing(false);
                setSelectedId(null);
                setSelectedIds(new Set());
                setSelectedPoint(null);
                setSelectedEdge(null);
            }
            if (e.key === 'Shift') {
                setIsOrthogonalLocked(true);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Shift') {
                setIsOrthogonalLocked(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [selectedId, selectedIds, isDrawing, points, designData, commitDesign, handleBulkDelete, handleCopy, handlePaste, measurementMode, handleUndo, handleRedo, handleFinishPoly]);

    const handleCanvasClick = useCallback((e: React.MouseEvent) => {
        // Measurement mode
        if (measurementMode && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const point = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };

            if (measurementPoints.length === 0) {
                setMeasurementPoints([point]);
            } else if (measurementPoints.length === 1) {
                // Calculate distance
                const p1 = pixelToLatLng(viewState.center, viewState.zoom, CANVAS_WIDTH, CANVAS_HEIGHT, measurementPoints[0]);
                const p2 = pixelToLatLng(viewState.center, viewState.zoom, CANVAS_WIDTH, CANVAS_HEIGHT, point);
                const distance = getDistanceKm(p1.lat, p1.lng, p2.lat, p2.lng) * 1000; // meters

                // Save measurement
                setMeasurementResults(prev => [...prev, {
                    distance,
                    points: [...measurementPoints, point]
                }]);

                setMeasurementPoints([]);
            }
            return;
        }

        if (activeTool === 'select') {
            // Clear selection if clicking on empty canvas
            if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('canvas-background')) {
                setSelectedId(null);
                setSelectedIds(new Set());
                setSelectedPoint(null);
                setSelectedEdge(null);
            }
            return;
        }
        if (activeTool === 'tree' && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const sp = getSnappedPoint(e.clientX - rect.left, e.clientY - rect.top);
            const newTree: TreeObject = { id: `t${Date.now()}`, position: screenToStored(sp), radius: 2, height: 5 };
            commitDesign({ ...designData, trees: [...(designData.trees || []), newTree] });
            setSelectedId(newTree.id);
            setSelectedIds(new Set([newTree.id]));
            return;
        }

        if (isDrawing && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const screenPoint = getSnappedPoint(e.clientX - rect.left, e.clientY - rect.top);
            if (points.length >= 3 && dist(screenPoint, points[0]) <= 10) { handleFinishPoly(); return; }
            setPoints([...points, screenPoint]);
            return;
        }
        if ((activeTool === 'roof' || activeTool === 'obstruction') && !isDrawing && canvasRef.current) {
            setIsDrawing(true);
            const rect = canvasRef.current.getBoundingClientRect();
            setPoints([getSnappedPoint(e.clientX - rect.left, e.clientY - rect.top)]);
        }
    }, [activeTool, isDrawing, points, designData, commitDesign, smartSnap, measurementMode, measurementPoints, viewState, getSnappedPoint, screenToStored, handleFinishPoly, dist]);

    const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();

        // OPTIMIZED ROTATION: Direct DOM update
        if (isRotatingViewRef.current && is3D && lastMousePosRef.current && worldTransformRef.current) {
            const deltaX = e.clientX - lastMousePosRef.current.x;
            const deltaY = e.clientY - lastMousePosRef.current.y;

            // Sensitivity scaling
            rotationRef.current = (rotationRef.current + deltaX * 0.4) % 360;
            if (rotationRef.current < 0) rotationRef.current += 360; // Keep it positive
            tiltRef.current = Math.max(0, Math.min(90, tiltRef.current - deltaY * 0.4));

            worldTransformRef.current.style.transform = `translate(calc(-50% + ${pan3DRef.current.x}px), calc(-50% + ${pan3DRef.current.y}px)) scale(${scaleRef.current}) rotateX(${tiltRef.current}deg) rotateZ(${rotationRef.current}deg)`;
            lastMousePosRef.current = { x: e.clientX, y: e.clientY };
            return;
        }

        // OPTIMIZED PANNING 3D: Direct DOM update
        if (isPanning3DRef.current && is3D && lastMousePosRef.current && worldTransformRef.current) {
            const deltaX = e.clientX - lastMousePosRef.current.x;
            const deltaY = e.clientY - lastMousePosRef.current.y;

            pan3DRef.current.x += deltaX;
            pan3DRef.current.y += deltaY;

            worldTransformRef.current.style.transform = `translate(calc(-50% + ${pan3DRef.current.x}px), calc(-50% + ${pan3DRef.current.y}px)) scale(${scaleRef.current}) rotateX(${tiltRef.current}deg) rotateZ(${rotationRef.current}deg)`;
            lastMousePosRef.current = { x: e.clientX, y: e.clientY };
            return;
        }

        // 2D Panning logic is handled exclusively by handleGlobalMove to prevent double state updates per tick

        const rawX = e.clientX - rect.left;
        const rawY = e.clientY - rect.top;

        // Compute snap once and batch both state updates.
        // A ref guard skips the setState calls entirely when nothing changed,
        // eliminating the double re-render that caused point jitter on hover.
        if (snapToGrid || smartSnap) {
            const { snapped, snapType } = computeSnap(rawX, rawY);
            const last = lastSnapRef.current;
            const changed = !last
                || Math.abs(last.x - snapped.x) > 0.5
                || Math.abs(last.y - snapped.y) > 0.5
                || last.snapType !== snapType;
            if (changed) {
                lastSnapRef.current = { x: snapped.x, y: snapped.y, snapType };
                // Both setters fire in the same event handler → React batches them
                // into a single re-render (React 18 automatic batching).
                setSnapTarget(snapType ? { x: snapped.x, y: snapped.y, type: snapType } : null);
                setSnapCursor(snapped);
            }
        } else {
            if (lastSnapRef.current !== null) {
                lastSnapRef.current = null;
                setSnapCursor(null);
                setSnapTarget(null);
            }
        }

        if (dragState && dragState.type === 'point') {
            const snappedP = getSnappedPoint(rawX, rawY, dragState.activeId, dragState.activeIndex);
            const { x, y, latLng: exactLatLng } = snappedP;

            // Skip if point hasn't moved significantly (reduce unnecessary updates)
            if (lastDragPointRef.current) {
                const dx = Math.abs(x - lastDragPointRef.current.x);
                const dy = Math.abs(y - lastDragPointRef.current.y);
                if (dx < 0.5 && dy < 0.5) return; // Skip tiny movements
            }
            lastDragPointRef.current = { x, y };

            const newStoredPoint = exactLatLng || screenToStored({ x, y });

            // Use requestAnimationFrame for smooth updates
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
            }

            rafIdRef.current = requestAnimationFrame(() => {
                setDesignData(prev => {
                    const newRoofs = prev.roofs.map(r => {
                        const movingIndices = dragState.movingPoints.filter(mp => mp.type === 'roof' && mp.id === r.id).map(mp => mp.index);
                        if (movingIndices.length === 0) return r;
                        return {
                            ...r,
                            points: r.points.map((p, i) => {
                                if (movingIndices.includes(i)) {
                                    return newStoredPoint;
                                }
                                return p;
                            }),
                            isAnalyzed: false,
                            skeletonOffsets: undefined,
                            deletedSkeletonNodes: undefined
                        };
                    });

                    const newObstructions = prev.obstructions.map(o => {
                        const movingIndices = dragState.movingPoints.filter(mp => mp.type === 'obstruction' && mp.id === o.id).map(mp => mp.index);
                        if (movingIndices.length === 0) return o;
                        return {
                            ...o,
                            points: o.points.map((p, i) => {
                                if (movingIndices.includes(i)) {
                                    return newStoredPoint;
                                }
                                return p;
                            })
                        };
                    });

                    return { ...prev, roofs: newRoofs, obstructions: newObstructions };
                });
                rafIdRef.current = null;
            });
        } else if (dragState && dragState.type === 'skeletonNode') {
            const { x, y } = getSnappedPoint(rawX, rawY);

            // Skip tiny movements
            if (lastDragPointRef.current) {
                const dx = Math.abs(x - lastDragPointRef.current.x);
                const dy = Math.abs(y - lastDragPointRef.current.y);
                if (dx < 0.5 && dy < 0.5) return;
            }

            // Calculate delta offset based on start point (assuming lastDragPointRef holds the initial or previous position)
            const dx = x - (lastDragPointRef.current?.x || x);
            const dy = y - (lastDragPointRef.current?.y || y);

            lastDragPointRef.current = { x, y };

            // Request animation frame for smooth dragging
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
            }
            rafIdRef.current = requestAnimationFrame(() => {
                setDesignData(prev => {
                    const newRoofs = prev.roofs.map(r => {
                        if (r.id === dragState.activeId) {
                            const newOverrides = { ...r.skeletonNodeOverrides };

                            // To accurately store the LatLng, we just use the snapped coordinates calculated above
                            newOverrides[dragState.activeIndex] = { lat: getSnappedPoint(rawX, rawY).latLng?.lat ?? screenToStored({ x, y }).lat, lng: getSnappedPoint(rawX, rawY).latLng?.lng ?? screenToStored({ x, y }).lng };

                            return { ...r, skeletonNodeOverrides: newOverrides };
                        }
                        return r;
                    });
                    return { ...prev, roofs: newRoofs };
                });
                rafIdRef.current = null;
            });
        } else if (dragState && dragState.type === 'edge') {
            const { x, y } = getSnappedPoint(rawX, rawY);

            // Skip tiny movements
            if (lastDragPointRef.current) {
                const deltaX = Math.abs(x - lastDragPointRef.current.x);
                const deltaY = Math.abs(y - lastDragPointRef.current.y);
                if (deltaX < 0.5 && deltaY < 0.5) return;
            }

            const dx = x - (lastDragPointRef.current?.x || x);
            const dy = y - (lastDragPointRef.current?.y || y);

            lastDragPointRef.current = { x, y };

            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
            }

            rafIdRef.current = requestAnimationFrame(() => {
                setDesignData(prev => {
                    const newRoofs = prev.roofs.map(r => {
                        const movingIndices = dragState.movingPoints.filter(mp => mp.type === 'roof' && mp.id === r.id).map(mp => mp.index);
                        if (movingIndices.length === 0) return r;
                        return {
                            ...r,
                            points: r.points.map((p, i) => {
                                if (movingIndices.includes(i)) {
                                    const sp = storedToScreen(p);
                                    const rawTargetX = sp.x + dx;
                                    const rawTargetY = sp.y + dy;
                                    const snappedP = getSnappedPoint(rawTargetX, rawTargetY);
                                    // if snappedP.latLng is available, it snapped to point. But an edge might snap multiple points, better stick to relative offset unless dragging a single point
                                    return screenToStored({ x: sp.x + dx, y: sp.y + dy });
                                }
                                return p;
                            }),
                            isAnalyzed: false,
                            skeletonOffsets: undefined,
                            deletedSkeletonNodes: undefined
                        };
                    });

                    const newObstructions = prev.obstructions.map(o => {
                        const movingIndices = dragState.movingPoints.filter(mp => mp.type === 'obstruction' && mp.id === o.id).map(mp => mp.index);
                        if (movingIndices.length === 0) return o;
                        return {
                            ...o,
                            points: o.points.map((p, i) => {
                                if (movingIndices.includes(i)) {
                                    const sp = storedToScreen(p);
                                    return screenToStored({ x: sp.x + dx, y: sp.y + dy });
                                }
                                return p;
                            })
                        };
                    });

                    return { ...prev, roofs: newRoofs, obstructions: newObstructions };
                });
                rafIdRef.current = null;
            });
        } else if (dragState && dragState.type === 'object') {
            const { x, y } = getSnappedPoint(rawX, rawY);

            // Skip tiny movements
            if (lastDragPointRef.current) {
                const deltaX = Math.abs(x - lastDragPointRef.current.x);
                const deltaY = Math.abs(y - lastDragPointRef.current.y);
                if (deltaX < 0.5 && deltaY < 0.5) return;
            }

            const dx = x - (lastDragPointRef.current?.x || x);
            const dy = y - (lastDragPointRef.current?.y || y);

            lastDragPointRef.current = { x, y };

            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
            }

            rafIdRef.current = requestAnimationFrame(() => {
                setDesignData(prev => {
                    const objectType = dragState.movingPoints[0]?.type;
                    
                    if (objectType === 'roof') {
                        const newRoofs = prev.roofs.map(r => {
                            if (r.id === dragState.activeId) {
                                return {
                                    ...r,
                                    points: r.points.map(p => {
                                        const sp = storedToScreen(p);
                                        return screenToStored({ x: sp.x + dx, y: sp.y + dy });
                                    }),
                                    isAnalyzed: false,
                                    skeletonOffsets: undefined,
                                    deletedSkeletonNodes: undefined
                                };
                            }
                            return r;
                        });
                        return { ...prev, roofs: newRoofs };
                    } else if (objectType === 'obstruction') {
                        const newObstructions = prev.obstructions.map(o => {
                            if (o.id === dragState.activeId) {
                                return {
                                    ...o,
                                    points: o.points.map(p => {
                                        const sp = storedToScreen(p);
                                        return screenToStored({ x: sp.x + dx, y: sp.y + dy });
                                    })
                                };
                            }
                            return o;
                        });
                        return { ...prev, obstructions: newObstructions };
                    } else if (objectType === 'tree') {
                        const newTrees = (prev.trees || []).map(t => {
                            if (t.id === dragState.activeId) {
                                const sp = storedToScreen(t.position);
                                return {
                                    ...t,
                                    position: screenToStored({ x: sp.x + dx, y: sp.y + dy })
                                };
                            }
                            return t;
                        });
                        return { ...prev, trees: newTrees };
                    }
                    return prev;
                });
                rafIdRef.current = null;
            });
        } else if (isDrawing) {
            const { snapped } = computeSnap(rawX, rawY);
            setPreviewPoint(snapped);
        } else {
            setPreviewPoint(null);
        }
    }, [isRotatingView, is3D, activeTool, points.length, snapToGrid, smartSnap, dragState, isDrawing, computeSnap, getSnappedPoint, screenToStored, setDesignData, viewState]);

    const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
        // Hide context menu initially on mouse down
        setContextMenu(null);

        // Allow rotation on left click (if rotate tool), middle click, or right click
        const shouldRotate = is3D && (activeTool === 'rotate' || e.button === 1 || e.button === 2);
        const shouldPan2D = !is3D && !isDrawing && (activeTool === 'select' || activeTool === 'pan' || e.button === 1 || e.button === 2);
        const shouldPan3D = is3D && activeTool === 'pan' && e.button === 0;

        if (shouldRotate) {
            e.preventDefault();
            e.stopPropagation();
            isRotatingViewRef.current = true;
            if (worldTransformRef.current) {
                worldTransformRef.current.style.transition = 'none';
                worldTransformRef.current.style.willChange = 'transform';
            }
            lastMousePosRef.current = { x: e.clientX, y: e.clientY };
            // Sync refs with current state
            rotationRef.current = rotationAngle;
            tiltRef.current = tiltAngle;
        } else if (shouldPan3D) {
            e.preventDefault();
            e.stopPropagation();
            isPanning3DRef.current = true;
            if (worldTransformRef.current) {
                worldTransformRef.current.style.transition = 'none';
                worldTransformRef.current.style.willChange = 'transform';
            }
            lastMousePosRef.current = { x: e.clientX, y: e.clientY };
        } else if (shouldPan2D) {
            e.preventDefault();
            e.stopPropagation();
            // Start panning
            isMapPanningRef.current = true;
            lastMousePosRef.current = { x: e.clientX, y: e.clientY };
        }
    }, [is3D, activeTool, rotationAngle, tiltAngle, isDrawing]);

    const handleCanvasMouseUp = useCallback((e?: React.MouseEvent) => {
        if (isRotatingViewRef.current) {
            isRotatingViewRef.current = false;
            if (worldTransformRef.current) {
                worldTransformRef.current.style.transition = 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)';
                worldTransformRef.current.style.willChange = 'auto';
            }
            // Sync state with refs after rotation ends
            let newRotation = rotationRef.current;
            if (newRotation < 0) newRotation += 360;
            const newTilt = tiltRef.current;
            setRotationAngle(newRotation);
            setTiltAngle(newTilt);
            // Update worldTransformRef if it exists
            if (worldTransformRef.current) {
                worldTransformRef.current.style.transform = `translate(calc(-50% + ${pan3DRef.current.x}px), calc(-50% + ${pan3DRef.current.y}px)) scale(${scaleRef.current}) rotateX(${newTilt}deg) rotateZ(${newRotation}deg)`;
            }
        }

        if (isPanning3DRef.current) {
            isPanning3DRef.current = false;
            if (worldTransformRef.current) {
                worldTransformRef.current.style.transition = 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)';
                worldTransformRef.current.style.willChange = 'auto';
            }
        }

        if (isMapPanningRef.current) {
            isMapPanningRef.current = false;
        }

        lastMousePosRef.current = null;

        // Cancel any pending animation frame
        if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }

        if (dragState && dragState.type === 'point' && dragStartSnapshotRef.current) {
            dragStartSnapshotRef.current = null;
            lastDragPointRef.current = null;

            // Auto-merge overlapping or consecutive identical points
            let updatedRoofs = [...designData.roofs];
            let updatedObstructions = [...designData.obstructions];

            const cleanupPoints = (pts: LatLngPoint[]) => {
                if (!pts || pts.length === 0) return pts;
                const result = [pts[0]];
                for (let i = 1; i < pts.length; i++) {
                    const prev = result[result.length - 1];
                    const curr = pts[i];

                    const p1 = latLngToPixel(viewState.center, viewState.zoom, CANVAS_WIDTH, CANVAS_HEIGHT, prev);
                    const p2 = latLngToPixel(viewState.center, viewState.zoom, CANVAS_WIDTH, CANVAS_HEIGHT, curr);

                    // Use screen distance to merge. 2px is visually identical.
                    if (Math.abs(p1.x - p2.x) > 2 || Math.abs(p1.y - p2.y) > 2) {
                        result.push(curr);
                    }
                }
                // Check if last point is same as first point to close polygon
                if (result.length > 1) {
                    const first = result[0];
                    const last = result[result.length - 1];
                    const p1 = latLngToPixel(viewState.center, viewState.zoom, CANVAS_WIDTH, CANVAS_HEIGHT, first);
                    const p2 = latLngToPixel(viewState.center, viewState.zoom, CANVAS_WIDTH, CANVAS_HEIGHT, last);
                    if (Math.abs(p1.x - p2.x) <= 2 && Math.abs(p1.y - p2.y) <= 2) {
                        result.pop();
                    }
                }
                return result;
            };

            updatedRoofs = updatedRoofs.map(r => ({ ...r, points: cleanupPoints(r.points) }))
                .filter(r => r.points.length >= 3); // Remove invalid degenerate shapes

            updatedObstructions = updatedObstructions.map(o => ({ ...o, points: cleanupPoints(o.points) }))
                .filter(o => o.points.length >= 3);

            const cleanedDesignData = {
                ...designData,
                roofs: updatedRoofs,
                obstructions: updatedObstructions
            };

            // During the drag, setDesignData was called directly (bypassing history).
            // At this point, history.present still holds the BEFORE-drag scene.
            // One APPLY_SCENE_CHANGE with the after-drag designData will:
            //   past    ← [...past, beforeScene]   ← Ctrl+Z restores this ✅
            //   present ← cleanedDesignData (after-drag scene)
            dispatchHistory({ type: 'APPLY_SCENE_CHANGE', payload: extractScene(cleanedDesignData) });
            setDesignData(cleanedDesignData);

            setDragState(null);
            return;
        } else if (dragState && dragState.type === 'skeletonNode' && dragStartSnapshotRef.current) {
            dragStartSnapshotRef.current = null;
            lastDragPointRef.current = null;

            // Auto-merge overlapping skeleton points by deleting connecting valley/hip lines
            let updatedRoofs = [...designData.roofs];
            let merged = false;

            updatedRoofs = updatedRoofs.map(r => {
                if (r.id === dragState.activeId) {
                    const mappedOverrides: Record<number, { x: number, y: number }> = {};
                    if (r.skeletonNodeOverrides) {
                        for (const [key, ll] of Object.entries(r.skeletonNodeOverrides)) {
                            mappedOverrides[Number(key)] = storedToScreen(ll as LatLngPoint);
                        }
                    }

                    const linesData = calculateRoofStructureLines(
                        r.points.map(storedToScreen), r.shape, r.ridgeAngle, r.ridgeDirection,
                        true, mappedOverrides, r.deletedSkeletonNodes, r.addedSkeletonNodes?.map(storedToScreen)
                    );
                    const nodes = Array.isArray(linesData) ? [] : (linesData?.nodes || []);
                    const activeNode = nodes[dragState.activeIndex];

                    if (activeNode) {
                        for (let i = 0; i < nodes.length; i++) {
                            if (i !== dragState.activeIndex && !r.deletedSkeletonNodes?.includes(i)) {
                                const otherNode = nodes[i];
                                const distToNode = Math.hypot(activeNode.x - otherNode.x, activeNode.y - otherNode.y);
                                if (distToNode <= 3) {
                                    merged = true;
                                }
                            }
                        }

                        // Also check against all other existing points
                        if (!merged) {
                            for (const pt of getAllExistingPoints) {
                                const distToPt = Math.hypot(activeNode.x - pt.x, activeNode.y - pt.y);
                                if (distToPt <= 3) {
                                    merged = true;
                                    break;
                                }
                            }
                        }

                        // Check if it was snapped to a perimeter line/edge
                        if (!merged) {
                            const checkEdges = (pts: { x: number, y: number }[]) => {
                                for (let i = 0; i < pts.length; i++) {
                                    const p1 = pts[i];
                                    const p2 = pts[(i + 1) % pts.length];
                                    const dist = getDistanceToSegment(activeNode, p1, p2);
                                    if (dist <= 3) return true;
                                }
                                return false;
                            };

                            for (const roof of designData.roofs) {
                                if (checkEdges(roof.points.map(storedToScreen))) {
                                    merged = true;
                                    break;
                                }
                            }
                            if (!merged) {
                                for (const obs of designData.obstructions) {
                                    if (checkEdges(obs.points.map(storedToScreen))) {
                                        merged = true;
                                        break;
                                    }
                                }
                            }
                        }

                        if (merged) {
                            const newDeleted = [...(r.deletedSkeletonNodes || []), dragState.activeIndex];
                            const newOverrides = { ...r.skeletonNodeOverrides };
                            delete newOverrides[dragState.activeIndex];
                            return { ...r, deletedSkeletonNodes: newDeleted, skeletonNodeOverrides: newOverrides };
                        }
                    }
                }
                return r;
            });

            if (merged) {
                const cleanedDesignData = { ...designData, roofs: updatedRoofs };
                dispatchHistory({ type: 'APPLY_SCENE_CHANGE', payload: extractScene(cleanedDesignData) });
                setDesignData(cleanedDesignData);
            } else {
                dispatchHistory({ type: 'APPLY_SCENE_CHANGE', payload: extractScene(designData) });
            }

            setDragState(null);
            return;
        }

        lastDragPointRef.current = null;
        setDragState(null);
    }, [isRotatingView, dragState, designData]);

    // Reset 3D pan when switching to 2D mode to ensure 3D camera always starts centered
    useEffect(() => {
        if (!is3D) {
            pan3DRef.current = { x: 0, y: 0 };
        }
    }, [is3D]);

    // Global mouse events for rotation and panning
    useEffect(() => {
        const handleGlobalMove = (e: MouseEvent) => {
            if (isRotatingViewRef.current && is3D && lastMousePosRef.current && worldTransformRef.current) {
                const deltaX = e.clientX - lastMousePosRef.current.x;
                const deltaY = e.clientY - lastMousePosRef.current.y;

                rotationRef.current = (rotationRef.current + deltaX * 0.4) % 360;
                if (rotationRef.current < 0) rotationRef.current += 360;
                tiltRef.current = Math.max(0, Math.min(90, tiltRef.current - deltaY * 0.4));

                worldTransformRef.current.style.transform = `translate(calc(-50% + ${pan3DRef.current.x}px), calc(-50% + ${pan3DRef.current.y}px)) scale(${scaleRef.current}) rotateX(${tiltRef.current}deg) rotateZ(${rotationRef.current}deg)`;
                lastMousePosRef.current = { x: e.clientX, y: e.clientY };
                return;
            }

            if (isPanning3DRef.current && is3D && lastMousePosRef.current && worldTransformRef.current) {
                const deltaX = e.clientX - lastMousePosRef.current.x;
                const deltaY = e.clientY - lastMousePosRef.current.y;

                pan3DRef.current.x += deltaX;
                pan3DRef.current.y += deltaY;

                worldTransformRef.current.style.transform = `translate(calc(-50% + ${pan3DRef.current.x}px), calc(-50% + ${pan3DRef.current.y}px)) scale(${scaleRef.current}) rotateX(${tiltRef.current}deg) rotateZ(${rotationRef.current}deg)`;
                lastMousePosRef.current = { x: e.clientX, y: e.clientY };
                return;
            }

            if (isMapPanningRef.current && !is3D && lastMousePosRef.current) {
                const dx = lastMousePosRef.current.x - e.clientX;
                const dy = lastMousePosRef.current.y - e.clientY;
                const centerPx = { x: CANVAS_WIDTH / 2 + dx, y: CANVAS_HEIGHT / 2 + dy };
                const newCenter = pixelToLatLng(viewState.center, viewState.zoom, CANVAS_WIDTH, CANVAS_HEIGHT, centerPx);

                setViewState(prev => ({ ...prev, center: newCenter }));
                lastMousePosRef.current = { x: e.clientX, y: e.clientY };
            }
        };

        const handleGlobalUp = () => {
            handleCanvasMouseUp();
        };

        window.addEventListener('mousemove', handleGlobalMove);
        window.addEventListener('mouseup', handleGlobalUp);
        return () => {
            window.removeEventListener('mousemove', handleGlobalMove);
            window.removeEventListener('mouseup', handleGlobalUp);
        };
    }, [isRotatingView, is3D, viewState, setViewState, handleCanvasMouseUp]);


    const handlePointMouseDown = useCallback((id: string, index: number, e: React.MouseEvent) => {
        if (activeTool !== 'select') return;
        e.stopPropagation();
        e.preventDefault(); // Prevent text selection and other default behaviors

        // Identify the exact clicked point data
        let clickedPointLatLng: LatLngPoint | null = null;
        for (const r of designData.roofs) {
            if (r.id === id && r.points[index]) clickedPointLatLng = r.points[index];
        }
        if (!clickedPointLatLng) {
            for (const o of designData.obstructions) {
                if (o.id === id && o.points[index]) clickedPointLatLng = o.points[index];
            }
        }

        if (!canvasRef.current || !clickedPointLatLng) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const rawX = e.clientX - rect.left;
        const rawY = e.clientY - rect.top;

        // Use the exact point coordinate as the hit test center to avoid CSS transform inaccuracies
        const centerSc = latLngToPixel(viewState.center, viewState.zoom, CANVAS_WIDTH, CANVAS_HEIGHT, clickedPointLatLng);

        const allMovingPoints: { id: string, type: 'roof' | 'obstruction', index: number }[] = [];

        const collectPoints = (rId: string, pts: LatLngPoint[], type: 'roof' | 'obstruction') => {
            for (let i = 0; i < pts.length; i++) {
                const scP = latLngToPixel(viewState.center, viewState.zoom, CANVAS_WIDTH, CANVAS_HEIGHT, pts[i]);
                const dx = scP.x - centerSc.x;
                const dy = scP.y - centerSc.y;
                if (dx * dx + dy * dy <= 144) { // 12px radius hit area based on true clicked point
                    allMovingPoints.push({ id: rId, type, index: i });
                }
            }
        };

        // Find all points within hit radius across all roofs and obstructions
        for (const r of designData.roofs) collectPoints(r.id, r.points, 'roof');
        for (const o of designData.obstructions) collectPoints(o.id, o.points, 'obstruction');

        if (allMovingPoints.length > 0) {
            // Give priority to the specific point passed in if it's in the hit area
            const clickedIsHit = allMovingPoints.find(mp => mp.id === id && mp.index === index);
            const primaryId = clickedIsHit ? id : allMovingPoints[0].id;
            const primaryIndex = clickedIsHit ? index : allMovingPoints[0].index;
            const primaryType = clickedIsHit ? clickedIsHit.type : allMovingPoints[0].type;

            setSelectedId(primaryId);
            setSelectedIds(new Set([primaryId])); // Alternatively: Select all shapes involved? We'll stick to primary for simplicity
            setSelectedPoint({ id: primaryId, index: primaryIndex, type: primaryType });
            setSelectedEdge(null);

            setDragState({
                activeId: primaryId,
                activeIndex: primaryIndex,
                movingPoints: allMovingPoints, // Move ALL of them
                type: 'point'
            });

            const p = primaryType === 'roof'
                ? designData.roofs.find(r => r.id === primaryId)?.points[primaryIndex]
                : designData.obstructions.find(o => o.id === primaryId)?.points[primaryIndex];

            if (p) {
                lastDragPointRef.current = latLngToPixel(viewState.center, viewState.zoom, CANVAS_WIDTH, CANVAS_HEIGHT, p);
            } else {
                lastDragPointRef.current = { x: rawX, y: rawY };
            }
            dragStartSnapshotRef.current = cloneDesign(designData);
        }
    }, [activeTool, designData, cloneDesign, viewState]);


    const handleSkeletonNodeMouseDown = useCallback((id: string, index: number, e: React.MouseEvent) => {
        if (activeTool !== 'select' && !editRoofShapeMode) return;
        e.stopPropagation();

        if (canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            lastDragPointRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        }

        setSelectedId(id);
        if (!selectedIds.has(id)) setSelectedIds(new Set([id]));
        setSelectedPoint({ id, index, type: 'skeletonNode' });

        // Snapshot before drag begins (committed on mouseup)
        dragStartSnapshotRef.current = cloneDesign(designData);

        // Start dragging a skeleton inner node
        setDragState({
            type: 'skeletonNode',
            activeId: id,
            activeIndex: index,
            movingPoints: [] // Not moving perimeter points
        });
    }, [activeTool, editRoofShapeMode, selectedIds, designData, cloneDesign]);

    const handleSkeletonNodeDoubleClick = useCallback((id: string, index: number, e: React.MouseEvent) => {
        if (activeTool !== 'select' && !editRoofShapeMode) return;
        e.stopPropagation();
        e.preventDefault();

        const updated = {
            ...designData,
            roofs: designData.roofs.map(r => {
                if (r.id === id) {
                    const deletedNames = r.deletedSkeletonNodes || [];
                    if (!deletedNames.includes(index)) {
                        return { ...r, deletedSkeletonNodes: [...deletedNames, index] };
                    }
                }
                return r;
            })
        };
        commitDesign(updated);
    }, [activeTool, editRoofShapeMode, designData, commitDesign]);

    const handleSkeletonEdgeDoubleClick = useCallback((id: string, index: number, p1: { x: number, y: number }, p2: { x: number, y: number }, e: React.MouseEvent) => {
        if (activeTool !== 'select' && !editRoofShapeMode) return;
        e.stopPropagation();
        e.preventDefault();

        if (canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const rawX = e.clientX - rect.left;
            const rawY = e.clientY - rect.top;

            // Project raw click onto line segment (p1 -> p2)
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const mag2 = dx * dx + dy * dy;

            let projectedX = rawX;
            let projectedY = rawY;

            if (mag2 > 0) {
                const u = ((rawX - p1.x) * dx + (rawY - p1.y) * dy) / mag2;
                const clampedU = Math.max(0, Math.min(1, u));
                projectedX = p1.x + clampedU * dx;
                projectedY = p1.y + clampedU * dy;
            }

            const newPoint = screenToStored({ x: projectedX, y: projectedY });

            const updated = {
                ...designData,
                roofs: designData.roofs.map(r => {
                    if (r.id === id) {
                        const addedNodes = r.addedSkeletonNodes || [];
                        return { ...r, addedSkeletonNodes: [...addedNodes, newPoint] };
                    }
                    return r;
                })
            };
            commitDesign(updated);
        }
    }, [activeTool, editRoofShapeMode, designData, screenToStored, commitDesign]);

    const handleEdgeMouseDown = useCallback((id: string, index: number, p1: { x: number, y: number }, p2: { x: number, y: number }, e: React.MouseEvent) => {
        if (activeTool !== 'select') return;
        e.stopPropagation();
        e.preventDefault();

        if (canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            lastDragPointRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        }

        setSelectedId(id);
        if (!selectedIds.has(id)) setSelectedIds(new Set([id]));

        // Snapshot before drag for undo (committed on mouseup)
        dragStartSnapshotRef.current = cloneDesign(designData);

        const isRoof = designData.roofs.some(r => r.id === id);
        const type: 'roof' | 'obstruction' = isRoof ? 'roof' : 'obstruction';

        let pointCount = 0;
        if (isRoof) {
            pointCount = designData.roofs.find(r => r.id === id)?.points.length || 0;
        } else {
            pointCount = designData.obstructions.find(o => o.id === id)?.points.length || 0;
        }

        const nextIndex = (index + 1) % pointCount;
        setSelectedEdge({ id, index, type });
        setSelectedPoint(null);

        setDragState({
            type: 'edge',
            activeId: id,
            activeIndex: index,
            movingPoints: [
                { id, index: index, type },
                { id, index: nextIndex, type }
            ]
        });
    }, [activeTool, selectedIds, designData, cloneDesign]);

    const handleEdgeDoubleClick = useCallback((id: string, index: number, p1: { x: number, y: number }, p2: { x: number, y: number }, e: React.MouseEvent) => {
        if (activeTool !== 'select') return;
        e.stopPropagation();
        e.preventDefault();

        if (canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const rawX = e.clientX - rect.left;
            const rawY = e.clientY - rect.top;

            // Project the raw click point exactly onto the line segment (p1 -> p2)
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const mag2 = dx * dx + dy * dy;

            let projectedX = rawX;
            let projectedY = rawY;

            if (mag2 > 0) {
                const u = ((rawX - p1.x) * dx + (rawY - p1.y) * dy) / mag2;
                const clampedU = Math.max(0, Math.min(1, u));
                projectedX = p1.x + clampedU * dx;
                projectedY = p1.y + clampedU * dy;
            }

            // Still allow snapping to guide lines if necessary, otherwise use exact projected point
            const { x, y } = getSnappedPoint(projectedX, projectedY);
            const newPoint = screenToStored({ x, y });

            const insertPoint = (pts: LatLngPoint[]) => {
                const newPts = [...pts];
                newPts.splice(index + 1, 0, newPoint);
                return newPts;
            };

            const isRoof = designData.roofs.some(r => r.id === id);
            if (isRoof) {
                const updated = { ...designData, roofs: designData.roofs.map(r => r.id === id ? { ...r, points: insertPoint(r.points) } : r) };
                commitDesign(updated);
            } else {
                const updated = { ...designData, obstructions: designData.obstructions.map(o => o.id === id ? { ...o, points: insertPoint(o.points) } : o) };
                commitDesign(updated);
            }
        }
    }, [activeTool, designData, getSnappedPoint, screenToStored, commitDesign]);

    const handlePointDoubleClick = useCallback((id: string, index: number, e: React.MouseEvent) => {
        if (activeTool !== 'select') return;
        e.stopPropagation();
        e.preventDefault();

        const removePoint = (pts: LatLngPoint[]) => {
            if (pts.length <= 3) return pts; // Don't allow < 3 vertices
            return pts.filter((_, i) => i !== index);
        };

        // Check availability first
        const roof = designData.roofs.find(r => r.id === id);
        const obs = designData.obstructions.find(o => o.id === id);
        const count = roof ? roof.points.length : (obs ? obs.points.length : 0);

        if (count > 3) {
            if (roof) {
                const updated = { ...designData, roofs: designData.roofs.map(r => r.id === id ? { ...r, points: removePoint(r.points) } : r) };
                commitDesign(updated);
            } else if (obs) {
                const updated = { ...designData, obstructions: designData.obstructions.map(o => o.id === id ? { ...o, points: removePoint(o.points) } : o) };
                commitDesign(updated);
            }
        }
    }, [activeTool, designData, commitDesign]);

    const handleObjectClick = useCallback((id: string, e: React.MouseEvent) => {
        if (isDrawing || activeTool !== 'select') return;
        e.stopPropagation();
        if (activeTool === 'select') {
            if (e.ctrlKey || e.metaKey) {
                // Multi-select
                setSelectedIds(prev => {
                    const next = new Set(prev);
                    if (next.has(id)) {
                        next.delete(id);
                        if (next.size === 1) {
                            setSelectedId(Array.from(next)[0]);
                        } else {
                            setSelectedId(null);
                        }
                    } else {
                        next.add(id);
                        setSelectedId(id);
                    }
                    return next;
                });
            } else if (e.shiftKey && selectedIds.size > 0) {
                // Range select (select all between first and current)
                setSelectedIds(prev => {
                    const next = new Set(prev);
                    next.add(id);
                    setSelectedId(id);
                    return next;
                });
            } else {
                // Single select
                setSelectedId(id);
                setSelectedIds(new Set([id]));
                // Clear point/edge selection when explicitly clicking on object body
                setSelectedPoint(null);
                setSelectedEdge(null);
            }
        }
    }, [isDrawing, activeTool, selectedIds]);

    const handleObjectMouseDown = useCallback((id: string, type: 'roof' | 'obstruction' | 'tree', e: React.MouseEvent) => {
        if (isDrawing || activeTool !== 'select') return;
        e.stopPropagation();
        e.preventDefault();

        // Select the object
        setSelectedId(id);
        if (!selectedIds.has(id)) setSelectedIds(new Set([id]));
        setSelectedPoint(null);
        setSelectedEdge(null);

        if (canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            lastDragPointRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        }

        dragStartSnapshotRef.current = cloneDesign(designData);

        setDragState({
            type: 'object',
            activeId: id,
            activeIndex: 0,
            movingPoints: [{ id, type, index: 0 }]
        });
    }, [isDrawing, activeTool, selectedIds, designData, cloneDesign]);

    const handleContextMenu = useCallback((type: 'roof' | 'canvas' | 'obstruction' | 'tree', id: string | null, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, type, id });
        if (id) {
            setSelectedId(id);
            setSelectedIds(new Set([id]));
        } else {
            setSelectedId(null);
            setSelectedIds(new Set());
        }
    }, []);

    const renderContextMenu = useCallback(() => {
        if (!contextMenu) return null;

        const { x, y, type, id } = contextMenu;

        const handleSelectAll = () => {
            const allIds = new Set([
                ...designData.roofs.map(r => r.id),
                ...designData.obstructions.map(o => o.id),
                ...(designData.trees || []).map(t => t.id)
            ]);
            setSelectedIds(allIds);
            setSelectedId(allIds.size > 0 ? Array.from(allIds)[0] : null);
            setContextMenu(null);
        };

        const handleDelete = () => {
            handleBulkDelete();
            setContextMenu(null);
        };

        const handleSplitRoof = () => {
            if (type === 'roof' && id) {
                setActiveTool('split_roof');
                setEditRoofShapeMode(false);
                setPoints([]);
                setContextMenu(null);
            }
        };

        return (
            <div
                className="absolute bg-white border border-slate-200 rounded-md shadow-lg py-1 z-50"
                style={{ top: y, left: x }
                }
                onMouseLeave={() => setContextMenu(null)
                }
            >
                {type === 'canvas' && (
                    <>
                        <button className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 w-full text-left" onClick={handleSelectAll} >
                            <MousePointer2 size={16} /> Select All
                        </button>
                        < button className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 w-full text-left" onClick={handlePaste} disabled={!copiedObjects}>
                            <Clipboard size={16} /> Paste
                        </button>
                        < hr className="my-1 border-slate-200" />
                        <button className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 w-full text-left" onClick={handleUndo} disabled={!canUndo}>
                            <Undo size={16} /> Undo
                        </button>
                        < button className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 w-full text-left" onClick={handleRedo} disabled={!canRedo}>
                            <Redo size={16} /> Redo
                        </button>
                    </>
                )}
                {
                    (type === 'roof' || type === 'obstruction' || type === 'tree') && id && (
                        <>
                            <button className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 w-full text-left" onClick={handleCopy} >
                                <Copy size={16} /> Copy
                            </button>
                            < button className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 w-full text-left" onClick={handlePaste} disabled={!copiedObjects
                            }>
                                <Clipboard size={16} /> Paste
                            </button>
                            {
                                type === 'roof' && (
                                    <button className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 w-full text-left" onClick={handleSplitRoof} >
                                        <SplitSquareHorizontal size={16} /> Split Roof
                                    </button>
                                )
                            }
                            <hr className="my-1 border-slate-200" />
                            <button className="flex items-center gap-2 px-4 py-2 text-sm text-red-700 hover:bg-red-50 w-full text-left" onClick={handleDelete} >
                                <Trash2 size={16} /> Delete
                            </button>
                        </>
                    )}
            </div>
        );
    }, [contextMenu, designData, copiedObjects, canUndo, canRedo, handleCopy, handlePaste, handleBulkDelete, handleUndo, handleRedo]);


    return {
        canvasRef, worldTransformRef,
        debouncedDesignData, setDebouncedDesignData,
        activeTool, setActiveTool,
        currentLayer, setCurrentLayer,
        selectedId, setSelectedId,
        selectedIds, setSelectedIds,
        snapToGrid, setSnapToGrid,
        smartSnap, setSmartSnap,
        snapTarget, setSnapTarget,
        showDimensions, setShowDimensions,
        layerVisibility, setLayerVisibility,
        showLayerPanel, setShowLayerPanel,
        is3D, setIs3D,
        tiltAngle, setTiltAngle,
        rotationAngle, setRotationAngle,
        rotationRef, tiltRef,
        isRotatingView, setIsRotatingView,
        roofHeight3D, setRoofHeight3D,
        editRoofShapeMode, setEditRoofShapeMode,
        dragState, setDragState,
        selectedPoint, setSelectedPoint,
        selectedEdge, setSelectedEdge,
        contextMenu, setContextMenu,
        isOrthogonalLocked, setIsOrthogonalLocked,
        isDrawing, setIsDrawing,
        points, setPoints,
        previewPoint, setPreviewPoint,
        measurementMode, setMeasurementMode,
        measurementPoints, setMeasurementPoints,
        measurementResults, setMeasurementResults,
        snapCursor, setSnapCursor,
        showHelp, setShowHelp,
        validationErrors, setValidationErrors,
        validationWarnings, setValidationWarnings,
        validationStrict, setValidationStrict,
        dismissedWarnings, setDismissedWarnings,
        copiedObjects, setCopiedObjects,
        history, dispatchHistory,
        canUndo, canRedo,
        viewState, setViewState,

        currentStoredToScreen, currentGetPolygonArea,
        commitDesign, handleUndo, handleRedo, handleCopy, handlePaste,
        handleBulkDelete, renderContextMenu,
        handleCanvasClick, handleCanvasMouseDown, handleCanvasMouseMove, handleCanvasMouseUp,
        handleObjectClick, handleObjectMouseDown, handlePointMouseDown, handleSkeletonNodeMouseDown,
        handleSkeletonNodeDoubleClick, handleSkeletonEdgeDoubleClick, handleEdgeMouseDown,
        handleEdgeDoubleClick, handlePointDoubleClick, handleContextMenu,
        handleAutoFixInvalidPoints, handleFinishPoly, handleZoomIn, handleZoomOut
    };
}
