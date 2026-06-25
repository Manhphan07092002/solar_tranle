import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { DesignState, PVString, LatLngPoint } from '../../../types';
import { INVERTER_DATABASE } from '../../../constants';
import { latLngToPixel, pixelToLatLng } from '../../../utils/mapUtils';
import { latLngToMeters } from '../../../utils/geo/localProjection';
import { isPointInPolygon } from '../../../utils/helpers';
import { ActiveTool, DraggingIcon, ModuleRenderContext } from './types';

const GRID_SIZE = 10;
const CANVAS_SIZE = 900;

export function useElectrical(
    designData: DesignState,
    setDesignData: React.Dispatch<React.SetStateAction<DesignState>>
) {
    // ─── State ──────────────────────────────────────────────────────────────
    const [activeStringId, setActiveStringId] = useState<string | null>(null);
    const [selectedModuleIndex, setSelectedModuleIndex] = useState<number | null>(null);
    const [selectedModuleIndices, setSelectedModuleIndices] = useState<Set<number>>(new Set());
    const [activeTool, setActiveTool] = useState<ActiveTool>('select');
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [snapToGrid, setSnapToGrid] = useState<boolean>(false);
    const [hoveredModuleIndex, setHoveredModuleIndex] = useState<number | null>(null);
    const [copiedModules, setCopiedModules] = useState<Array<{ x: number; y: number; stringId?: string }>>([]);
    const [showModuleInfo, setShowModuleInfo] = useState<boolean>(false);
    const [constraintViolations, setConstraintViolations] = useState<string[]>([]);
    const [highlightedStringId, setHighlightedStringId] = useState<string | null>(null);
    const [showDistance, setShowDistance] = useState<boolean>(false);
    const [showHelp, setShowHelp] = useState<boolean>(false);
    const [stringIconOffsets, setStringIconOffsets] = useState<Record<string, { x: number; y: number }>>({});

    // Undo/Redo stacks
    const [undoStack, setUndoStack] = useState<DesignState[]>([]);
    const [redoStack, setRedoStack] = useState<DesignState[]>([]);

    // ─── Refs ───────────────────────────────────────────────────────────────
    const draggingIconRef = useRef<DraggingIcon | null>(null);
    const dragStartPos = useRef<{ x: number; y: number } | null>(null);
    const dragStartSnapshotRef = useRef<DesignState | null>(null);

    // ─── Projection helpers ─────────────────────────────────────────────────
    const viewState = {
        center: { lat: designData.mapConfig?.lat || 0, lng: designData.mapConfig?.lng || 0 },
        zoom: designData.mapConfig?.zoom || 18
    };

    const origin = designData.mapConfig
        ? { lat: designData.mapConfig.lat, lng: designData.mapConfig.lng }
        : { lat: 0, lng: 0 };

    const meterToScreen = useCallback((xMeter: number, yMeter: number) => {
        const EARTH_RADIUS = 6378137;
        const lat = origin.lat + (yMeter / EARTH_RADIUS) * (180 / Math.PI);
        const lng = origin.lng + (xMeter / (EARTH_RADIUS * Math.cos(origin.lat * Math.PI / 180))) * (180 / Math.PI);
        return latLngToPixel(viewState.center, viewState.zoom, CANVAS_SIZE, CANVAS_SIZE, { lat, lng });
    }, [origin, viewState.center, viewState.zoom]);

    const screenToMeter = useCallback((px: number, py: number) => {
        const ll = pixelToLatLng(viewState.center, viewState.zoom, CANVAS_SIZE, CANVAS_SIZE, { x: px, y: py });
        return latLngToMeters(origin, ll);
    }, [origin, viewState.center, viewState.zoom]);

    const latLngToScreenPixel = useCallback((ll: LatLngPoint) => {
        if (!ll || typeof ll.lat !== 'number' || typeof ll.lng !== 'number' || !isFinite(ll.lat) || !isFinite(ll.lng)) {
            return { x: 0, y: 0 };
        }
        return latLngToPixel(viewState.center, viewState.zoom, CANVAS_SIZE, CANVAS_SIZE, ll);
    }, [viewState.center, viewState.zoom]);

    const getRenderPPM = useCallback(() => {
        const p0 = meterToScreen(0, 0);
        const p1 = meterToScreen(1, 0);
        return Math.abs(p1.x - p0.x) || 20;
    }, [meterToScreen]);

    const getModuleRenderContext = useCallback((mod: any): ModuleRenderContext => {
        const currentPPM = getRenderPPM();
        const isPortrait = mod.orientation === 'portrait';
        const baseW = (designData.selectedModule?.width || 0) / 1000;
        const baseH = (designData.selectedModule?.height || 0) / 1000;
        const width = (isPortrait ? baseW : baseH) * currentPPM;
        const height = (isPortrait ? baseH : baseW) * currentPPM;
        const centerScreen = meterToScreen(mod.xMeter, mod.yMeter);
        const rotationDeg = (mod.azimuth || 0) * (180 / Math.PI);
        return {
            width,
            height,
            cx: centerScreen.x,
            cy: centerScreen.y,
            rotationDeg,
            x: centerScreen.x - width / 2,
            y: centerScreen.y - height / 2
        };
    }, [designData.selectedModule, getRenderPPM, meterToScreen]);

    // ─── Undo / Redo ────────────────────────────────────────────────────────
    const cloneDesign = useCallback((d: DesignState): DesignState => {
        return JSON.parse(JSON.stringify(d)) as DesignState;
    }, []);

    const pushUndoSnapshot = useCallback((snapshot: DesignState) => {
        setUndoStack(prev => {
            const next = [...prev, cloneDesign(snapshot)];
            if (next.length > 50) next.shift();
            return next;
        });
    }, [cloneDesign]);

    const commitDesign = useCallback((next: DesignState) => {
        pushUndoSnapshot(designData);
        setRedoStack([]);
        setDesignData(next);
    }, [designData, pushUndoSnapshot, setDesignData]);

    const handleUndo = useCallback(() => {
        if (undoStack.length === 0) return;
        const previous = undoStack[undoStack.length - 1];
        setRedoStack(prev => [...prev, cloneDesign(designData)]);
        setUndoStack(prev => prev.slice(0, -1));
        setDesignData(cloneDesign(previous));
    }, [undoStack, designData, cloneDesign, setDesignData]);

    const handleRedo = useCallback(() => {
        if (redoStack.length === 0) return;
        const next = redoStack[redoStack.length - 1];
        setUndoStack(prev => [...prev, cloneDesign(designData)]);
        setRedoStack(prev => prev.slice(0, -1));
        setDesignData(cloneDesign(next));
    }, [redoStack, designData, cloneDesign, setDesignData]);

    const canUndo = undoStack.length > 0;
    const canRedo = redoStack.length > 0;

    // ─── Derived values ─────────────────────────────────────────────────────
    const strings = designData.strings || [];
    const totalDCPower = designData.modules.length * (designData.selectedModule?.power || 0);
    const totalACPower = designData.inverterCount * (designData.selectedInverter?.maxPowerAC || 0);
    const dcAcRatio = totalACPower > 0 ? totalDCPower / totalACPower : 0;
    const minStringLen = designData.selectedInverter?.minStringLength || 8;
    const maxStringLen = designData.selectedInverter?.maxStringLength || 20;

    // ─── Validation ─────────────────────────────────────────────────────────
    const roofScreenPolygons = useMemo(() => {
        return designData.roofs.map(roof => ({
            id: roof.id,
            points: roof.points.map(latLngToScreenPixel)
        }));
    }, [designData.roofs, latLngToScreenPixel]);

    const obstructionScreenPolygons = useMemo(() => {
        return designData.obstructions.map(obs => ({
            id: obs.id,
            points: obs.points.map(latLngToScreenPixel)
        }));
    }, [designData.obstructions, latLngToScreenPixel]);

    const checkConstraints = useCallback((x: number, y: number, modW: number, modH: number, excludeIndex?: number): string[] => {
        const violations: string[] = [];
        const centerScreen = meterToScreen(x, y);
        const center = { x: centerScreen.x, y: centerScreen.y };

        const isInRoof = roofScreenPolygons.some(roof => isPointInPolygon(center, roof.points));
        if (!isInRoof) {
            violations.push('Module is outside roof boundary');
        }

        const overlapsObstruction = obstructionScreenPolygons.some(obs => isPointInPolygon(center, obs.points));
        if (overlapsObstruction) {
            violations.push('Module overlaps with obstruction');
        }

        const overlapsModule = designData.modules.some((mod, i) => {
            if (i === excludeIndex) return false;
            const context = getModuleRenderContext(mod);
            const distance = Math.sqrt(Math.pow(center.x - context.cx, 2) + Math.pow(center.y - context.cy, 2));
            return distance < Math.min(modW + context.width, modH + context.height) / 2.1;
        });
        if (overlapsModule) {
            violations.push('Module overlaps with another module');
        }

        return violations;
    }, [roofScreenPolygons, obstructionScreenPolygons, designData.modules, meterToScreen, getModuleRenderContext]);

    const snapToGridValue = useCallback((value: number): number => {
        if (!snapToGrid) return value;
        return Math.round(value / GRID_SIZE) * GRID_SIZE;
    }, [snapToGrid]);

    // ─── Helpers ─────────────────────────────────────────────────────────────
    const getRandomColor = () => {
        const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];
        return colors[Math.floor(Math.random() * colors.length)];
    };

    const getDistanceToNearestModule = useCallback((xMeter: number, yMeter: number, excludeIndex?: number): number | null => {
        let minDistance = Infinity;
        designData.modules.forEach((mod, i) => {
            if (i === excludeIndex) return;
            const distance = Math.hypot(xMeter - mod.xMeter, yMeter - mod.yMeter);
            if (distance < minDistance) {
                minDistance = distance;
            }
        });
        return minDistance === Infinity ? null : minDistance;
    }, [designData.modules]);

    // ─── Handlers ───────────────────────────────────────────────────────────
    const handleAddString = () => {
        const newString: PVString = {
            id: `str_${Date.now()}`,
            name: `String ${strings.length + 1}`,
            color: getRandomColor(),
            inverterId: 'inv1'
        };
        setDesignData(prev => ({ ...prev, strings: [...(prev.strings || []), newString] }));
        setActiveStringId(newString.id);
        return newString.id;
    };

    const handleAutoStringing = () => {
        let targetModules = designData.modules.map((m, i) => ({ ...m, index: i }));

        if (selectedModuleIndex !== null || selectedModuleIndices.size > 0) {
            const indices = selectedModuleIndex !== null
                ? [selectedModuleIndex]
                : Array.from(selectedModuleIndices);
            targetModules = targetModules.filter(m => indices.includes(m.index));
        } else {
            targetModules = targetModules.filter(m => !m.stringId);
        }

        if (targetModules.length === 0) return;

        const sortedModules: typeof targetModules = [];
        let pool = [...targetModules];

        pool.sort((a, b) => {
            const screenA = meterToScreen(a.xMeter, a.yMeter);
            const screenB = meterToScreen(b.xMeter, b.yMeter);
            return (screenA.y - screenB.y) || (screenA.x - screenB.x);
        });
        let current = pool.shift();
        if (current) sortedModules.push(current);

        while (current && pool.length > 0) {
            let nearestIdx = -1;
            let minDist = Infinity;
            const currentScreen = meterToScreen(current.xMeter, current.yMeter);

            for (let i = 0; i < pool.length; i++) {
                const m = pool[i];
                const mScreen = meterToScreen(m.xMeter, m.yMeter);
                const d = Math.pow(mScreen.x - currentScreen.x, 2) + Math.pow(mScreen.y - currentScreen.y, 2);
                const dy = Math.abs(mScreen.y - currentScreen.y);
                const directionalPenalty = dy * 1.5;
                const weightedDist = d + Math.pow(directionalPenalty, 2);

                if (weightedDist < minDist) {
                    minDist = weightedDist;
                    nearestIdx = i;
                }
            }

            if (nearestIdx !== -1) {
                current = pool[nearestIdx];
                sortedModules.push(current);
                pool.splice(nearestIdx, 1);
            } else {
                break;
            }
        }

        const generatedStrings: PVString[] = [];
        let modulesToUpdate = [...designData.modules];
        let activeStrId = `str_auto_${Date.now()}_0`;
        generatedStrings.push({
            id: activeStrId,
            name: `String ${strings.length + 1}`,
            color: getRandomColor(),
            inverterId: 'inv1'
        });

        let countInStr = 0;

        sortedModules.forEach((mod, i) => {
            if (countInStr >= maxStringLen) {
                activeStrId = `str_auto_${Date.now()}_${i}`;
                generatedStrings.push({
                    id: activeStrId,
                    name: `String ${strings.length + generatedStrings.length + 1}`,
                    color: getRandomColor(),
                    inverterId: 'inv1'
                });
                countInStr = 0;
            }

            modulesToUpdate[mod.index] = {
                ...modulesToUpdate[mod.index],
                stringId: activeStrId
            };
            countInStr++;
        });

        commitDesign({
            ...designData,
            strings: [...(designData.strings || []), ...generatedStrings],
            modules: modulesToUpdate
        });

        if (generatedStrings.length > 0) {
            setActiveStringId(generatedStrings[generatedStrings.length - 1].id);
        }
    };

    const handleDeleteString = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDesignData(prev => ({
            ...prev,
            strings: (prev.strings || []).filter(s => s.id !== id),
            modules: prev.modules.map(m => m.stringId === id ? { ...m, stringId: undefined } : m)
        }));
        if (activeStringId === id) setActiveStringId(null);
    };

    const handleModuleClick = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();

        const isMultiSelect = e.ctrlKey || e.metaKey;
        const isRangeSelect = e.shiftKey;

        const clickedModule = designData.modules[index];
        if (clickedModule.stringId) {
            setHighlightedStringId(clickedModule.stringId);
        } else {
            setHighlightedStringId(null);
        }

        if (activeTool === 'edit') {
            if (isMultiSelect) {
                setSelectedModuleIndices(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(index)) {
                        newSet.delete(index);
                    } else {
                        newSet.add(index);
                    }
                    setSelectedModuleIndex(newSet.size === 1 ? index : null);
                    return newSet;
                });
            } else if (isRangeSelect && selectedModuleIndices.size > 0) {
                const indices = Array.from(selectedModuleIndices) as number[];
                let start = index;
                let end = index;
                indices.forEach((idx: number) => {
                    start = Math.min(start, idx);
                    end = Math.max(end, idx);
                });
                const newSet = new Set<number>();
                for (let i = start; i <= end; i++) {
                    newSet.add(i);
                }
                setSelectedModuleIndices(newSet);
                setSelectedModuleIndex(index);
            } else {
                setSelectedModuleIndex(index);
                setSelectedModuleIndices(new Set([index]));
            }
            return;
        }

        if (activeTool === 'select' && activeStringId) {
            commitDesign({
                ...designData,
                modules: designData.modules.map((mod, i) => {
                    if (i === index) {
                        return {
                            ...mod,
                            stringId: mod.stringId === activeStringId ? undefined : activeStringId
                        };
                    }
                    return mod;
                })
            });
        } else if (activeTool === 'select') {
            setSelectedModuleIndex(index);
        }
    };

    const handleModuleMouseDown = (index: number, e: React.MouseEvent) => {
        if (activeTool !== 'edit') return;
        if (selectedModuleIndex !== index && !selectedModuleIndices.has(index)) return;

        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        dragStartSnapshotRef.current = cloneDesign(designData);

        const mod = designData.modules[index];
        const modScreen = meterToScreen(mod.xMeter, mod.yMeter);
        dragStartPos.current = {
            x: e.clientX - modScreen.x,
            y: e.clientY - modScreen.y
        };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !dragStartPos.current) return;
        if (selectedModuleIndex === null && selectedModuleIndices.size === 0) return;

        const container = e.currentTarget as HTMLElement;
        const rect = container.getBoundingClientRect();
        const rawX = e.clientX - rect.left - dragStartPos.current.x;
        const rawY = e.clientY - rect.top - dragStartPos.current.y;

        const x = snapToGridValue(rawX);
        const y = snapToGridValue(rawY);

        setDesignData(prev => {
            const newModules = [...prev.modules];

            const refIndex = selectedModuleIndex !== null ? selectedModuleIndex : Array.from(selectedModuleIndices)[0];
            const refMod = prev.modules[refIndex];
            const ctx = getModuleRenderContext(refMod);

            const minX = ctx.width / 2;
            const minY = ctx.height / 2;
            const maxX = CANVAS_SIZE - ctx.width / 2;
            const maxY = CANVAS_SIZE - ctx.height / 2;

            const clampedX = Math.max(minX, Math.min(maxX, x));
            const clampedY = Math.max(minY, Math.min(maxY, y));

            const refModScreen = meterToScreen(refMod.xMeter, refMod.yMeter);
            const deltaX = clampedX - refModScreen.x;
            const deltaY = clampedY - refModScreen.y;

            const indicesToMove = selectedModuleIndex !== null
                ? [selectedModuleIndex]
                : Array.from(selectedModuleIndices);

            const violations: string[] = [];

            setShowDistance(true);

            indicesToMove.forEach(i => {
                const mod = newModules[i];
                const modScreen = meterToScreen(mod.xMeter, mod.yMeter);
                const newScreenX = Math.max(0, Math.min(maxX, modScreen.x + deltaX));
                const newScreenY = Math.max(0, Math.min(maxY, modScreen.y + deltaY));

                const targetMeter = screenToMeter(newScreenX, newScreenY);

                const modCtx = getModuleRenderContext(mod);
                const modViolations = checkConstraints(targetMeter.x, targetMeter.y, modCtx.width, modCtx.height, i);
                violations.push(...modViolations);

                newModules[i] = {
                    ...mod,
                    xMeter: targetMeter.x,
                    yMeter: targetMeter.y
                };
            });

            setConstraintViolations(violations);

            return { ...prev, modules: newModules };
        });
    };

    const handleMouseUp = () => {
        if (isDragging && dragStartSnapshotRef.current) {
            const before = dragStartSnapshotRef.current;
            try {
                const beforeStr = JSON.stringify(before);
                const afterStr = JSON.stringify(designData);
                if (beforeStr !== afterStr) {
                    pushUndoSnapshot(before);
                    setRedoStack([]);
                }
            } catch {
                pushUndoSnapshot(before);
                setRedoStack([]);
            }
            dragStartSnapshotRef.current = null;
        }
        setIsDragging(false);
        dragStartPos.current = null;
        setShowDistance(false);

        setTimeout(() => {
            setConstraintViolations([]);
        }, 2000);
    };

    const handleCanvasClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            setSelectedModuleIndex(null);
            setSelectedModuleIndices(new Set());
            setHighlightedStringId(null);
        }
    };

    const alignModules = useCallback((alignment: 'left' | 'right' | 'center' | 'top' | 'bottom' | 'middle') => {
        const indicesToAlign = selectedModuleIndex !== null
            ? [selectedModuleIndex]
            : Array.from(selectedModuleIndices);

        if (indicesToAlign.length < 2) return;

        const modulesToAlign = indicesToAlign.map(i => designData.modules[i]);

        let targetValue: number;

        if (alignment === 'left') {
            targetValue = Math.min(...modulesToAlign.map(m => meterToScreen(m.xMeter, m.yMeter).x - getModuleRenderContext(m).width / 2));
        } else if (alignment === 'right') {
            targetValue = Math.max(...modulesToAlign.map(m => meterToScreen(m.xMeter, m.yMeter).x + getModuleRenderContext(m).width / 2));
        } else if (alignment === 'center') {
            const minX = Math.min(...modulesToAlign.map(m => meterToScreen(m.xMeter, m.yMeter).x - getModuleRenderContext(m).width / 2));
            const maxX = Math.max(...modulesToAlign.map(m => meterToScreen(m.xMeter, m.yMeter).x + getModuleRenderContext(m).width / 2));
            targetValue = (minX + maxX) / 2;
        } else if (alignment === 'top') {
            targetValue = Math.min(...modulesToAlign.map(m => meterToScreen(m.xMeter, m.yMeter).y - getModuleRenderContext(m).height / 2));
        } else if (alignment === 'bottom') {
            targetValue = Math.max(...modulesToAlign.map(m => meterToScreen(m.xMeter, m.yMeter).y + getModuleRenderContext(m).height / 2));
        } else { // middle
            const minY = Math.min(...modulesToAlign.map(m => meterToScreen(m.xMeter, m.yMeter).y - getModuleRenderContext(m).height / 2));
            const maxY = Math.max(...modulesToAlign.map(m => meterToScreen(m.xMeter, m.yMeter).y + getModuleRenderContext(m).height / 2));
            targetValue = (minY + maxY) / 2;
        }

        commitDesign({
            ...designData,
            modules: designData.modules.map((mod, i) => {
                if (indicesToAlign.includes(i)) {
                    let newScreenX = meterToScreen(mod.xMeter, mod.yMeter).x;
                    let newScreenY = meterToScreen(mod.xMeter, mod.yMeter).y;
                    const ctx = getModuleRenderContext(mod);

                    if (alignment === 'left') {
                        newScreenX = snapToGridValue(targetValue + ctx.width / 2);
                    } else if (alignment === 'right') {
                        newScreenX = snapToGridValue(targetValue - ctx.width / 2);
                    } else if (alignment === 'center') {
                        newScreenX = snapToGridValue(targetValue);
                    } else if (alignment === 'top') {
                        newScreenY = snapToGridValue(targetValue + ctx.height / 2);
                    } else if (alignment === 'bottom') {
                        newScreenY = snapToGridValue(targetValue - ctx.height / 2);
                    } else { // middle
                        newScreenY = snapToGridValue(targetValue);
                    }

                    const targetMeter = screenToMeter(newScreenX, newScreenY);
                    return { ...mod, xMeter: targetMeter.x, yMeter: targetMeter.y };
                }
                return mod;
            })
        });
    }, [selectedModuleIndex, selectedModuleIndices, designData, commitDesign, snapToGridValue]);

    // ─── Selected module info ───────────────────────────────────────────────
    const selectedModuleInfo = useMemo(() => {
        if (selectedModuleIndex === null && selectedModuleIndices.size === 0) return null;

        const indices = selectedModuleIndex !== null
            ? [selectedModuleIndex]
            : Array.from(selectedModuleIndices);

        if (indices.length === 1) {
            const mod = designData.modules[indices[0]];
            const assignedString = strings.find(s => s.id === mod.stringId);
            const currentPPM = getRenderPPM();
            const modW = ((designData.selectedModule?.width || 0) / 1000) * currentPPM;
            const modH = ((designData.selectedModule?.height || 0) / 1000) * currentPPM;

            let nearestDistance = Infinity;
            let nearestIndex = -1;
            const modScreen = meterToScreen(mod.xMeter, mod.yMeter);
            designData.modules.forEach((otherMod, i) => {
                if (i === indices[0]) return;
                const otherScreen = meterToScreen(otherMod.xMeter, otherMod.yMeter);
                const distance = Math.hypot(modScreen.x - otherScreen.x, modScreen.y - otherScreen.y);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestIndex = i;
                }
            });

            return {
                index: indices[0],
                x: Math.round(modScreen.x),
                y: Math.round(modScreen.y),
                rotation: (mod as any).rotation || 0,
                stringId: mod.stringId,
                stringName: assignedString?.name || 'None',
                nearestDistance: nearestIndex >= 0 ? Math.round(nearestDistance) : null,
                violations: checkConstraints(mod.xMeter, mod.yMeter, modW, modH, indices[0])
            };
        } else {
            return {
                count: indices.length,
                indices: Array.from(indices)
            };
        }
    }, [selectedModuleIndex, selectedModuleIndices, designData.modules, strings, designData.selectedModule, checkConstraints]);

    // ─── Keyboard shortcuts ─────────────────────────────────────────────────
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                handleUndo();
                return;
            }

            if ((e.ctrlKey || e.metaKey) && (e.shiftKey && e.key === 'z' || e.key === 'y')) {
                e.preventDefault();
                handleRedo();
                return;
            }

            if (e.key === 'v' || e.key === 'V') {
                e.preventDefault();
                setActiveTool('select');
                setSelectedModuleIndex(null);
                setSelectedModuleIndices(new Set());
                return;
            }

            if (e.key === 'e' || e.key === 'E') {
                e.preventDefault();
                setActiveTool('edit');
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && activeTool === 'edit' && (selectedModuleIndex !== null || selectedModuleIndices.size > 0)) {
                e.preventDefault();
                const indicesToCopy = selectedModuleIndex !== null
                    ? [selectedModuleIndex]
                    : Array.from(selectedModuleIndices);
                const modulesToCopy = indicesToCopy.map(i => designData.modules[i]);
                setCopiedModules(modulesToCopy);
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'v' && activeTool === 'edit' && copiedModules.length > 0) {
                e.preventDefault();
                const newModules = copiedModules.map(mod => ({
                    ...mod,
                    x: mod.x + 20,
                    y: mod.y + 20,
                    stringId: undefined
                }));
                commitDesign({
                    ...designData,
                    modules: [...designData.modules, ...newModules]
                });
                const startIndex = designData.modules.length;
                const newIndices = new Set<number>();
                for (let i = 0; i < newModules.length; i++) {
                    newIndices.add(startIndex + i);
                }
                setSelectedModuleIndices(newIndices);
                setSelectedModuleIndex(startIndex);
                return;
            }

            if (e.key === 'Delete' && activeTool === 'edit' && (selectedModuleIndex !== null || selectedModuleIndices.size > 0)) {
                e.preventDefault();
                const indicesToDelete = selectedModuleIndex !== null
                    ? [selectedModuleIndex]
                    : Array.from(selectedModuleIndices);
                commitDesign({
                    ...designData,
                    modules: designData.modules.filter((_, i) => !indicesToDelete.includes(i))
                });
                setSelectedModuleIndex(null);
                setSelectedModuleIndices(new Set());
                return;
            }

            if (activeTool === 'edit' && (selectedModuleIndex !== null || selectedModuleIndices.size > 0)) {
                const step = e.shiftKey ? 10 : 1;
                let deltaX = 0;
                let deltaY = 0;

                if (e.key === 'ArrowLeft') { e.preventDefault(); deltaX = -step; }
                else if (e.key === 'ArrowRight') { e.preventDefault(); deltaX = step; }
                else if (e.key === 'ArrowUp') { e.preventDefault(); deltaY = -step; }
                else if (e.key === 'ArrowDown') { e.preventDefault(); deltaY = step; }

                if (deltaX !== 0 || deltaY !== 0) {
                    const indicesToMove = selectedModuleIndex !== null
                        ? [selectedModuleIndex]
                        : Array.from(selectedModuleIndices);

                    commitDesign({
                        ...designData,
                        modules: designData.modules.map((mod, i) => {
                            if (indicesToMove.includes(i)) {
                                const ctx = getModuleRenderContext(mod);
                                const minX = ctx.width / 2;
                                const minY = ctx.height / 2;
                                const maxX = CANVAS_SIZE - ctx.width / 2;
                                const maxY = CANVAS_SIZE - ctx.height / 2;
                                const modScreen = meterToScreen(mod.xMeter, mod.yMeter);
                                const newScreenX = snapToGridValue(Math.max(minX, Math.min(maxX, modScreen.x + deltaX)));
                                const newScreenY = snapToGridValue(Math.max(minY, Math.min(maxY, modScreen.y + deltaY)));
                                const targetMeter = screenToMeter(newScreenX, newScreenY);
                                return { ...mod, xMeter: targetMeter.x, yMeter: targetMeter.y };
                            }
                            return mod;
                        })
                    });
                }
            }

            if (e.key === 'Escape') {
                setSelectedModuleIndex(null);
                setSelectedModuleIndices(new Set());
            }

            if ((e.key === 'r' || e.key === 'R') && activeTool === 'edit' && (selectedModuleIndex !== null || selectedModuleIndices.size > 0)) {
                e.preventDefault();
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
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTool, selectedModuleIndex, selectedModuleIndices, designData, handleUndo, handleRedo, commitDesign, snapToGridValue, copiedModules]);

    // ─── Return ─────────────────────────────────────────────────────────────
    return {
        // State
        activeStringId, setActiveStringId,
        selectedModuleIndex, setSelectedModuleIndex,
        selectedModuleIndices, setSelectedModuleIndices,
        activeTool, setActiveTool,
        isDragging,
        snapToGrid, setSnapToGrid,
        hoveredModuleIndex, setHoveredModuleIndex,
        copiedModules,
        showModuleInfo, setShowModuleInfo,
        constraintViolations,
        highlightedStringId, setHighlightedStringId,
        showDistance,
        showHelp, setShowHelp,
        stringIconOffsets, setStringIconOffsets,
        draggingIconRef,

        // Undo/Redo
        canUndo, canRedo,
        handleUndo, handleRedo,

        // Derived
        strings, totalDCPower, totalACPower, dcAcRatio,
        minStringLen, maxStringLen,
        selectedModuleInfo,

        // Projection
        CANVAS_SIZE,
        meterToScreen, screenToMeter, latLngToScreenPixel,
        getRenderPPM, getModuleRenderContext,

        // Handlers
        commitDesign,
        handleAddString, handleAutoStringing, handleDeleteString,
        handleModuleClick, handleModuleMouseDown,
        handleMouseMove, handleMouseUp, handleCanvasClick,
        getDistanceToNearestModule,
        alignModules,
        snapToGridValue,
        checkConstraints,

        // Constants
        GRID_SIZE,
    };
}
