import React, { useState, useEffect, useCallback } from 'react';
import { DesignState, LatLngPoint } from '../../../types';

import { isPointInPolygon } from '../../../utils/helpers';
import { calculatePlacement, distPtToSeg, isOverlappingStructureLine, PlacementContext } from '../../../utils/geometry/pvPlacement';
import { latLngToPixel, pixelToLatLng } from '../../../utils/mapUtils';
import { latLngToMeters } from '../../../utils/geo/localProjection';
import {
    getPolygonLongestEdgeAngle, rotatePoint, getMinDistanceToPolygonEdges,
    calculatePolygonCenter, calculateSunPosition, isModuleShaded,
    calculateAnnualShadingLoss, doLineSegmentsIntersect, SceneObject
} from '../../../utils/geometry/polygonUtils';
import { calculateRoofStructureLines } from '../../../utils/geometry/roofGeometry';
import {
    ActiveTool, PVConfig, PreviewPlacement, ClipboardEntry, SelectionBox, ViewState
} from './types';

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 900;

const DEFAULT_PV_CONFIG: PVConfig = {
    rowSpacing: 0.02, colSpacing: 0.02, orientation: 'portrait',
    setback: 0.0, sideSetback: 0.0, simMonth: 6, simHour: 10, showShading: true,
};

export function usePVLayout(
    designData: DesignState,
    setDesignData: React.Dispatch<React.SetStateAction<DesignState>>
) {
    // ── Config (persisted in designData) ────────────────────────────────────
    const pvConfig: PVConfig = { ...DEFAULT_PV_CONFIG, ...designData.pvLayoutConfig };
    const { rowSpacing, colSpacing, orientation, setback, sideSetback, simMonth, simHour, showShading } = pvConfig;

    const setPvConfig = (partial: Partial<PVConfig>) =>
        setDesignData(prev => ({ ...prev, pvLayoutConfig: { ...pvConfig, ...partial } }));

    // ── Local UI state ───────────────────────────────────────────────────────
    const [activeTool, setActiveTool] = useState<ActiveTool>('select');
    const [previewPlacement, setPreviewPlacement] = useState<PreviewPlacement | null>(null);
    const [isRecalculatingShading, setIsRecalculatingShading] = useState(false);
    const [selectedModuleIndices, setSelectedModuleIndices] = useState<Set<number>>(new Set());
    const [history, setHistory] = useState<{ past: typeof designData.modules[]; future: typeof designData.modules[] }>({ past: [], future: [] });
    const [clipboard, setClipboard] = useState<ClipboardEntry[] | null>(null);
    const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
    const [viewState, setViewState] = useState<ViewState>({
        center: { lat: designData.mapConfig?.lat || 0, lng: designData.mapConfig?.lng || 0 },
        zoom: designData.mapConfig?.zoom || 18,
    });

    // Sync view to map config on mount
    useEffect(() => {
        if (designData.mapConfig) {
            setViewState({
                center: { lat: designData.mapConfig.lat, lng: designData.mapConfig.lng },
                zoom: designData.mapConfig.zoom,
            });
        }
    }, [designData.mapConfig]);

    // ── Coordinate helpers ───────────────────────────────────────────────────
    const origin = designData.mapConfig
        ? { lat: designData.mapConfig.lat, lng: designData.mapConfig.lng }
        : { lat: 0, lng: 0 };

    const latLngToScreenPixel = (ll: LatLngPoint) => {
        if (!ll || typeof ll.lat !== 'number' || typeof ll.lng !== 'number' || !isFinite(ll.lat) || !isFinite(ll.lng))
            return { x: 0, y: 0 };
        return latLngToPixel(viewState.center, viewState.zoom, CANVAS_WIDTH, CANVAS_HEIGHT, ll);
    };

    const meterToScreen = (xMeter: number, yMeter: number) => {
        const EARTH_RADIUS = 6378137;
        const lat = origin.lat + (yMeter / EARTH_RADIUS) * (180 / Math.PI);
        const lng = origin.lng + (xMeter / (EARTH_RADIUS * Math.cos(origin.lat * Math.PI / 180))) * (180 / Math.PI);
        return latLngToPixel(viewState.center, viewState.zoom, CANVAS_WIDTH, CANVAS_HEIGHT, { lat, lng });
    };

    const screenToMeter = (px: number, py: number) => {
        const ll = pixelToLatLng(viewState.center, viewState.zoom, CANVAS_WIDTH, CANVAS_HEIGHT, { x: px, y: py });
        return latLngToMeters(origin, ll);
    };

    const getRenderPPM = () => {
        const p0 = meterToScreen(0, 0);
        const p1 = meterToScreen(1, 0);
        return Math.abs(p1.x - p0.x) || 20;
    };

    // ── History ──────────────────────────────────────────────────────────────
    const pushHistory = (newModules: typeof designData.modules) => {
        setHistory(prev => ({ past: [...prev.past, designData.modules], future: [] }));
        setDesignData(prev => ({ ...prev, modules: newModules }));
    };

    const handleUndo = () => {
        setHistory(prev => {
            if (prev.past.length === 0) return prev;
            const newPast = [...prev.past];
            const restored = newPast.pop()!;
            setDesignData(d => ({ ...d, modules: restored }));
            return { past: newPast, future: [designData.modules, ...prev.future] };
        });
        setSelectedModuleIndices(new Set());
    };

    const handleRedo = () => {
        setHistory(prev => {
            if (prev.future.length === 0) return prev;
            const newFuture = [...prev.future];
            const restored = newFuture.shift()!;
            setDesignData(d => ({ ...d, modules: restored }));
            return { past: [...prev.past, designData.modules], future: newFuture };
        });
        setSelectedModuleIndices(new Set());
    };

    // ── Keyboard shortcuts ───────────────────────────────────────────────────
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

            if (e.key === 'Escape') {
                setSelectedModuleIndices(new Set());
                setActiveTool('select');
                setPreviewPlacement(null);
                setClipboard(null);
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedModuleIndices.size > 0) {
                    pushHistory(designData.modules.filter((_, i) => !selectedModuleIndices.has(i)));
                    setSelectedModuleIndices(new Set());
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.shiftKey ? handleRedo() : handleUndo();
                e.preventDefault();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                handleRedo();
                e.preventDefault();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
                if (selectedModuleIndices.size > 0) {
                    const selected = designData.modules.filter((_, i) => selectedModuleIndices.has(i));
                    const cx = selected[0].xMeter;
                    const cy = selected[0].yMeter;
                    const baseAzimuth = selected[0].azimuth;
                    setClipboard(selected.map(m => {
                        const dx = m.xMeter - cx;
                        const dy = m.yMeter - cy;
                        const cosA = Math.cos(-baseAzimuth);
                        const sinA = Math.sin(-baseAzimuth);
                        return {
                            dxMeter: dx * cosA - dy * sinA,
                            dyMeter: dx * sinA + dy * cosA,
                            azimuthOffset: m.azimuth - baseAzimuth,
                            orientation: m.orientation,
                        };
                    }));
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
                if (clipboard && clipboard.length > 0) setActiveTool('edit');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedModuleIndices, designData.modules, clipboard]);

    // ── Module operations ────────────────────────────────────────────────────
    const deleteModule = (index: number) => {
        const newMods = [...designData.modules];
        newMods.splice(index, 1);
        pushHistory(newMods);
    };

    const rotateModule = (index: number) => {
        const newMods = [...designData.modules];
        const indicesToRotate = selectedModuleIndices.has(index) ? selectedModuleIndices : new Set([index]);
        for (const i of indicesToRotate) {
            newMods[i] = { ...newMods[i], orientation: newMods[i].orientation === 'portrait' ? 'landscape' : 'portrait' };
        }
        pushHistory(newMods);
    };

    const clearModules = () => setDesignData(prev => ({ ...prev, modules: [] }));

    // ── calculatePlacement ───────────────────────────────────────────────────
    const getPlacementContext = useCallback(() => ({
        designData,
        orientation,
        colSpacing,
        rowSpacing,
        sideSetback: sideSetback * getRenderPPM(),
        setback: setback * getRenderPPM(),
        currentPPM: getRenderPPM(),
        latLngToScreenPixel,
        screenToMeter,
        meterToScreen
    }), [designData, orientation, colSpacing, rowSpacing, sideSetback, setback, latLngToScreenPixel, screenToMeter, meterToScreen]);

    // ── Auto Layout ──────────────────────────────────────────────────────────
    const handleAutoLayout = () => {
        if (!designData.selectedModule) return;
        const currentPPM = getRenderPPM();
        const modW = (designData.selectedModule.width / 1000) * currentPPM;
        const modH = (designData.selectedModule.height / 1000) * currentPPM;
        const isPortrait = orientation === 'portrait';
        const actualModW = isPortrait ? modW : modH;
        const actualModH = isPortrait ? modH : modW;
        const gapX = colSpacing * currentPPM;
        const gapY = rowSpacing * currentPPM;
        const setbackPx = setback * currentPPM;

        const newModules: typeof designData.modules = [];
        const sunPos = calculateSunPosition(simMonth, simHour, designData.mapConfig?.lat ?? 21);
        const projectLat = designData.mapConfig?.lat ?? 21;
        const modRadiusPixels = Math.hypot(actualModW, actualModH) / 2;

        const sceneObjects: SceneObject[] = [
            ...designData.roofs.map(r => ({
                id: r.id,
                type: 'polygon' as const,
                baseZ: 0,
                topZ: r.baseHeight || 3,
                points: r.points.map(latLngToScreenPixel)
            })),
            ...designData.obstructions.map(o => ({
                id: o.id,
                type: 'polygon' as const,
                baseZ: o.elevation || 0,
                topZ: (o.elevation || 0) + (o.height || 1),
                points: o.points.map(latLngToScreenPixel)
            })),
            ...(designData.trees || []).map(t => {
                const tc = latLngToScreenPixel(t.position);
                return { id: t.id, type: 'cylinder' as const, baseZ: 0, topZ: t.height || 3, x: tc.x, y: tc.y, radius: t.radius || 1 };
            })
        ];

        designData.roofs.forEach(roof => {
            const screenPoints = roof.points.map(latLngToScreenPixel);
            if (screenPoints.length < 3) return;
            const azimuth = getPolygonLongestEdgeAngle(screenPoints);
            const centerPoint = calculatePolygonCenter(screenPoints);
            const mappedOverrides: Record<number, { x: number; y: number }> = {};
            if (roof.skeletonNodeOverrides) {
                for (const [key, ll] of Object.entries(roof.skeletonNodeOverrides))
                    mappedOverrides[Number(key)] = latLngToScreenPixel(ll as LatLngPoint);
            }
            const roofLinesData = calculateRoofStructureLines(
                screenPoints, roof.shape, roof.ridgeAngle, roof.ridgeDirection,
                roof.isAnalyzed, mappedOverrides, roof.deletedSkeletonNodes,
                roof.addedSkeletonNodes?.map(latLngToScreenPixel)
            );
            const structureLines = Array.isArray(roofLinesData) ? roofLinesData : (roofLinesData?.lines || []);

            const distPtToSeg = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
                const dx = b.x - a.x, dy = b.y - a.y;
                const len2 = dx * dx + dy * dy;
                if (len2 < 1e-6) return Math.hypot(p.x - a.x, p.y - a.y);
                const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
                return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
            };


            const sideSetbackPx = sideSetback * currentPPM;
            const rotated = screenPoints.map(p => rotatePoint(p, -azimuth, centerPoint));
            const xs = rotated.map(p => p.x), ys = rotated.map(p => p.y);
            const minX = Math.min(...xs), maxX = Math.max(...xs);
            const minY = Math.min(...ys), maxY = Math.max(...ys);
            const stepX = actualModW + gapX, stepY = actualModH + gapY;

            let anchorYDown = minY, anchorYUp = maxY;
            const ridgeLines = structureLines.filter((l: any) => l.type === 'ridge');
            const anchorLines = ridgeLines.length > 0 ? ridgeLines : structureLines;
            if (anchorLines.length > 0) {
                const ys2: number[] = [];
                for (const l of anchorLines) {
                    ys2.push(rotatePoint(l.start, -azimuth, centerPoint).y, rotatePoint(l.end, -azimuth, centerPoint).y);
                }
                const ridgeY = ys2.reduce((a, b) => a + b, 0) / ys2.length;
                anchorYDown = ridgeY + setbackPx + 1;
                anchorYUp = ridgeY - setbackPx - 1 - actualModH;
            } else {
                anchorYDown = minY;
                anchorYUp = minY - stepY;
            }

            const numCols = Math.floor((maxX - minX + gapX) / stepX);
            const gridWidth = numCols > 0 ? numCols * stepX - gapX : 0;
            const anchorX = minX + Math.max(0, (maxX - minX) - gridWidth) / 2;
            const numRowsDown = Math.ceil((maxY - anchorYDown) / stepY);
            const numRowsUp = Math.ceil((anchorYUp - minY) / stepY);

            const tryPlace = (x: number, y: number) => {
                const cxA = x + actualModW / 2, cyA = y + actualModH / 2;
                const c = rotatePoint({ x: cxA, y: cyA }, azimuth, centerPoint);
                const corners = [
                    { x: cxA - actualModW / 2, y: cyA - actualModH / 2 },
                    { x: cxA + actualModW / 2, y: cyA - actualModH / 2 },
                    { x: cxA + actualModW / 2, y: cyA + actualModH / 2 },
                    { x: cxA - actualModW / 2, y: cyA + actualModH / 2 },
                ].map(p => rotatePoint(p, azimuth, centerPoint));
                if (!corners.every(c2 => isPointInPolygon(c2, screenPoints))) return;
                if (sideSetbackPx > 0 && !corners.every(c2 => getMinDistanceToPolygonEdges(c2, screenPoints) >= sideSetbackPx)) return;
                if (isOverlappingStructureLine(corners, structureLines, setbackPx)) return;
                let obstructed = false;

                // Still need footprint check against obstructions and trees to prevent placing inside them
                const obsScreenData = sceneObjects.filter((o): o is SceneObject & { type: 'polygon', points: { x: number, y: number }[] } => o.type === 'polygon' && o.id !== roof.id);
                const treeScreenData = sceneObjects.filter((o): o is SceneObject & { type: 'cylinder', x: number, y: number, radius: number } => o.type === 'cylinder');

                for (const obs of obsScreenData) {
                    if (corners.some(c2 => isPointInPolygon(c2, obs.points)) || isPointInPolygon(c, obs.points)) { obstructed = true; break; }
                    if (setbackPx > 0 && corners.some(c2 => getMinDistanceToPolygonEdges(c2, obs.points) < setbackPx / 2)) { obstructed = true; break; }
                }
                if (!obstructed) {
                    for (const t of treeScreenData) {
                        if (Math.hypot(t.x - c.x, t.y - c.y) < t.radius * currentPPM + Math.max(actualModW, actualModH) / 2 + setbackPx) { obstructed = true; break; }
                    }
                }
                if (obstructed) return;

                // Determine moduleZ
                const moduleZ = roof.baseHeight || 3;

                const isShaded = isModuleShaded(c, modRadiusPixels, moduleZ, sceneObjects, sunPos.azimuth, sunPos.elevation, currentPPM);
                const shadingLoss = calculateAnnualShadingLoss(c, modRadiusPixels, moduleZ, sceneObjects, currentPPM, projectLat);
                const m = screenToMeter(c.x, c.y);
                newModules.push({ xMeter: m.x, yMeter: m.y, surfaceId: roof.id, azimuth, orientation, isShaded, shadingLoss });
            };

            for (let x = anchorX; x <= maxX + stepX; x += stepX) {
                for (let i = 0; i <= numRowsDown + 1; i++) tryPlace(x, anchorYDown + i * stepY);
                for (let i = 0; i <= numRowsUp + 1; i++) tryPlace(x, anchorYUp - i * stepY);
            }
            for (let x = anchorX - stepX; x >= minX - stepX; x -= stepX) {
                for (let i = 0; i <= numRowsDown + 1; i++) tryPlace(x, anchorYDown + i * stepY);
                for (let i = 0; i <= numRowsUp + 1; i++) tryPlace(x, anchorYUp - i * stepY);
            }
        });

        pushHistory(newModules);
    };

    // ── Shading ──────────────────────────────────────────────────────────────
    useEffect(() => {
        if (designData.modules.length === 0) return;
        const sunPos = calculateSunPosition(simMonth, simHour, designData.mapConfig?.lat ?? 21);
        const ppm = getRenderPPM();
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
        const modW = (designData.selectedModule?.width || 1000) / 1000 * ppm;
        const modH = (designData.selectedModule?.height || 1700) / 1000 * ppm;
        const radius = Math.hypot(modW, modH) / 2;
        setDesignData(prev => {
            let changed = false;
            const updated = prev.modules.map(mod => {
                const sp = meterToScreen(mod.xMeter, mod.yMeter);
                const surface = prev.roofs.find(r => r.id === mod.surfaceId);
                const moduleZ = surface?.baseHeight || 3;
                const shaded = isModuleShaded({ x: sp.x, y: sp.y }, radius, moduleZ, sceneObjects, sunPos.azimuth, sunPos.elevation, ppm);
                if (mod.isShaded !== shaded) changed = true;
                return { ...mod, isShaded: shaded };
            });
            return changed ? { ...prev, modules: updated } : prev;
        });
    }, [simMonth, simHour, designData.obstructions, designData.trees, designData.roofs, viewState, setDesignData]);

    const handleRecalculateShading = async () => {
        setIsRecalculatingShading(true);
        await new Promise(r => setTimeout(r, 10));
        const ppm = getRenderPPM();
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
        const modW = (designData.selectedModule?.width || 1000) / 1000 * ppm;
        const modH = (designData.selectedModule?.height || 1700) / 1000 * ppm;
        const radius = Math.hypot(modW, modH) / 2;
        const screenPositions = designData.modules.map(m => meterToScreen(m.xMeter, m.yMeter));
        setDesignData(prev => ({
            ...prev,
            modules: prev.modules.map((mod, idx) => {
                const surface = prev.roofs.find(r => r.id === mod.surfaceId);
                const moduleZ = surface?.baseHeight || 3;
                return {
                    ...mod,
                    shadingLoss: calculateAnnualShadingLoss({ x: screenPositions[idx].x, y: screenPositions[idx].y }, radius, moduleZ, sceneObjects, ppm, prev.mapConfig?.lat ?? 21),
                };
            }),
        }));
        setIsRecalculatingShading(false);
    };

    // ── Canvas mouse handlers ────────────────────────────────────────────────
    const handleCanvasClick = (e: React.MouseEvent) => {
        if (activeTool === 'select') return;
        if (activeTool !== 'edit' || !designData.selectedModule) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const rawX = e.clientX - rect.left;
        const rawY = e.clientY - rect.top;

        if (clipboard && clipboard.length > 0 && previewPlacement?.isValid) {
            const newMods = [...designData.modules];
            const activeRoof = designData.roofs.find(r => r.id === previewPlacement.roofId);
            const roofPts = activeRoof ? activeRoof.points.map(latLngToScreenPixel) : [];
            for (const clip of clipboard) {
                const cosA = Math.cos(previewPlacement.azimuth), sinA = Math.sin(previewPlacement.azimuth);
                const tx = previewPlacement.xMeter + clip.dxMeter * cosA - clip.dyMeter * sinA;
                const ty = previewPlacement.yMeter + clip.dxMeter * sinA + clip.dyMeter * cosA;
                const ts = meterToScreen(tx, ty);
                if (roofPts.length > 0 && !isPointInPolygon(ts, roofPts)) continue;
                newMods.push({ xMeter: tx, yMeter: ty, surfaceId: previewPlacement.roofId, azimuth: previewPlacement.azimuth + clip.azimuthOffset, orientation: clip.orientation, isShaded: false });
            }
            pushHistory(newMods);
            return;
        }
        const placement = calculatePlacement(rawX, rawY, getPlacementContext());
        if (placement?.isValid) {
            pushHistory([...designData.modules, { xMeter: placement.xMeter, yMeter: placement.yMeter, surfaceId: placement.roofId, azimuth: placement.azimuth, orientation, isShaded: false }]);
        }
    };

    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        if (activeTool === 'select') {
            const rect = e.currentTarget.getBoundingClientRect();
            const rawX = e.clientX - rect.left, rawY = e.clientY - rect.top;
            setSelectionBox({ startX: rawX, startY: rawY, currentX: rawX, currentY: rawY });
        }
    };

    const handleCanvasMouseUp = (e: React.MouseEvent) => {
        if (activeTool === 'select' && selectionBox) {
            const minX = Math.min(selectionBox.startX, selectionBox.currentX);
            const maxX = Math.max(selectionBox.startX, selectionBox.currentX);
            const minY = Math.min(selectionBox.startY, selectionBox.currentY);
            const maxY = Math.max(selectionBox.startY, selectionBox.currentY);
            const multiKey = e.shiftKey || e.ctrlKey || e.metaKey;

            if (maxX - minX > 5 || maxY - minY > 5) {
                const newSel = multiKey ? new Set(selectedModuleIndices) : new Set<number>();
                designData.modules.forEach((mod, i) => {
                    const s = meterToScreen(mod.xMeter, mod.yMeter);
                    if (s.x >= minX && s.x <= maxX && s.y >= minY && s.y <= maxY) newSel.add(i);
                });
                setSelectedModuleIndices(newSel);
            } else {
                const cx = selectionBox.startX, cy = selectionBox.startY;
                const currentPPM = getRenderPPM();
                const baseW = (designData.selectedModule?.width || 1000) / 1000 * currentPPM;
                const baseH = (designData.selectedModule?.height || 1700) / 1000 * currentPPM;
                let clicked = -1;
                for (let i = designData.modules.length - 1; i >= 0; i--) {
                    const mod = designData.modules[i];
                    const scr = meterToScreen(mod.xMeter, mod.yMeter);
                    const dx = cx - scr.x, dy = cy - scr.y;
                    const cosA = Math.cos(-mod.azimuth), sinA = Math.sin(-mod.azimuth);
                    const lx = dx * cosA - dy * sinA, ly = dx * sinA + dy * cosA;
                    const isPort = mod.orientation === 'portrait';
                    if (Math.abs(lx) <= (isPort ? baseW : baseH) / 2 && Math.abs(ly) <= (isPort ? baseH : baseW) / 2) { clicked = i; break; }
                }
                if (clicked >= 0) {
                    const newSel = multiKey ? new Set(selectedModuleIndices) : new Set<number>();
                    newSel.has(clicked) ? newSel.delete(clicked) : newSel.add(clicked);
                    setSelectedModuleIndices(newSel);
                } else if (!multiKey) {
                    setSelectedModuleIndices(new Set());
                }
            }
            setSelectionBox(null);
        }
    };

    const handleCanvasMouseMove = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const rawX = e.clientX - rect.left, rawY = e.clientY - rect.top;
        if (activeTool === 'select') {
            setPreviewPlacement(null);
            if (selectionBox) setSelectionBox(prev => prev ? { ...prev, currentX: rawX, currentY: rawY } : null);
            return;
        }
        if (activeTool !== 'edit' || !designData.selectedModule) { setPreviewPlacement(null); return; }
        const placement = calculatePlacement(rawX, rawY, getPlacementContext());
        if (placement) {
            const screen = meterToScreen(placement.xMeter, placement.yMeter);
            setPreviewPlacement({ ...placement, screenX: screen.x, screenY: screen.y });
        } else {
            setPreviewPlacement(null);
        }
    };

    const handleCanvasMouseLeave = () => setPreviewPlacement(null);

    // ── Zoom ─────────────────────────────────────────────────────────────────
    const handleZoomIn = () => setViewState(prev => ({ ...prev, zoom: Math.min(prev.zoom + 1, 22) }));
    const handleZoomOut = () => setViewState(prev => ({ ...prev, zoom: Math.max(prev.zoom - 1, 10) }));
    const handleWheel = (e: React.WheelEvent) => {
        const delta = e.deltaY > 0 ? -0.5 : 0.5;
        setViewState(prev => ({ ...prev, zoom: Math.max(10, Math.min(22, prev.zoom + delta)) }));
    };

    const totalPower = designData.modules.length * (designData.selectedModule?.power || 0);

    return {
        // Config
        pvConfig, setPvConfig, orientation, rowSpacing, colSpacing, setback, sideSetback,
        simMonth, simHour, showShading,
        // UI State
        activeTool, setActiveTool,
        previewPlacement,
        isRecalculatingShading,
        selectedModuleIndices,
        clipboard,
        selectionBox,
        viewState,
        // Computed
        totalPower,
        // Coord helpers (needed by canvas components)
        latLngToScreenPixel, meterToScreen, screenToMeter, getRenderPPM,
        // Handlers
        handleAutoLayout, handleRecalculateShading, clearModules,
        deleteModule, rotateModule,
        handleCanvasClick, handleCanvasMouseDown, handleCanvasMouseUp,
        handleCanvasMouseMove, handleCanvasMouseLeave,
        handleZoomIn, handleZoomOut, handleWheel,
    };
}
