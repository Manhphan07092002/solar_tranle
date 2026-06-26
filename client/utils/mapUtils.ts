import { isPointInPolygon } from './helpers';
import * as ClipperLib from 'clipper-lib';

// Web Mercator Projection Helpers for Pigeon Maps ecosystem

// Config matching pigeon-maps defaults (usually 256px tiles)
const TILE_SIZE = 256;

// Convert Lat/Lng to World Coordinate (0..1)
const project = (lat: number, lng: number) => {
    let siny = Math.sin((lat * Math.PI) / 180);
    // Truncate to 85.05112878 to avoid singularity at poles
    siny = Math.min(Math.max(siny, -0.9999), 0.9999);

    return {
        x: TILE_SIZE * (0.5 + lng / 360),
        y: TILE_SIZE * (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI))
    };
};

// Convert World Coordinate (0..1) to Lat/Lng
const unproject = (x: number, y: number) => {
    const lng = (x / TILE_SIZE - 0.5) * 360;
    const n = Math.PI - 2 * Math.PI * (y / TILE_SIZE);
    const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
    return { lat, lng };
};

// Main Exported Functions

/**
 * Converts a Lat/Lng coordinate to a Pixel coordinate relative to the map container.
 * @param center Map Center {lat, lng}
 * @param zoom Map Zoom Level
 * @param width Container Width (px)
 * @param height Container Height (px)
 * @param point Target Point {lat, lng}
 */
export const latLngToPixel = (
    center: { lat: number, lng: number },
    zoom: number,
    width: number,
    height: number,
    point: { lat: number, lng: number }
) => {
    const centerPoint = project(center.lat, center.lng);
    const targetPoint = project(point.lat, point.lng);
    const scale = Math.pow(2, zoom);

    return {
        x: (targetPoint.x - centerPoint.x) * scale + width / 2,
        y: (targetPoint.y - centerPoint.y) * scale + height / 2
    };
};

/**
 * Converts a Pixel coordinate (relative to container) to Lat/Lng.
 * @param center Map Center {lat, lng}
 * @param zoom Map Zoom Level
 * @param width Container Width (px)
 * @param height Container Height (px)
 * @param pixel Target Pixel {x, y}
 */
export const pixelToLatLng = (
    center: { lat: number, lng: number },
    zoom: number,
    width: number,
    height: number,
    pixel: { x: number, y: number }
) => {
    const centerPoint = project(center.lat, center.lng);
    const scale = Math.pow(2, zoom);

    const worldX = (pixel.x - width / 2) / scale + centerPoint.x;
    const worldY = (pixel.y - height / 2) / scale + centerPoint.y;

    return unproject(worldX, worldY);
};

// --- Math & Geometry Helpers Extracted from WorldViewport ---

export const getMetersPerPixel = (lat: number, zoom: number) => {
    return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
};

export const metersToPixels = (meters: number, lat: number, zoom: number) => {
    const metersPerPixel = getMetersPerPixel(lat, zoom);
    if (!Number.isFinite(metersPerPixel) || metersPerPixel <= 0) return 0;
    return meters / metersPerPixel;
};

export const getPolygonArea = (screenPts: { x: number, y: number }[], center: { lat: number, lng: number }, zoom: number, width: number, height: number) => {
    if (screenPts.length < 3) return 0;
    const latLngPoints = screenPts.map(p => pixelToLatLng(center, zoom, width, height, p));
    let area = 0;
    for (let i = 0; i < latLngPoints.length; i++) {
        const j = (i + 1) % latLngPoints.length;
        const p1 = latLngPoints[i];
        const p2 = latLngPoints[j];
        area += (p2.lng * Math.PI / 180 - p1.lng * Math.PI / 180) * (2 + Math.sin(p1.lat * Math.PI / 180) + Math.sin(p2.lat * Math.PI / 180));
    }
    return Math.abs(area * 6371e3 * 6371e3 / 2);
};

export const getEdgeLengthText = (p1: { x: number, y: number }, p2: { x: number, y: number }, center: { lat: number, lng: number }, zoom: number, width: number, height: number) => {
    const ll1 = pixelToLatLng(center, zoom, width, height, p1);
    const ll2 = pixelToLatLng(center, zoom, width, height, p2);
    const R = 6371e3;
    const d = Math.acos(Math.sin(ll1.lat * Math.PI / 180) * Math.sin(ll2.lat * Math.PI / 180) +
        Math.cos(ll1.lat * Math.PI / 180) * Math.cos(ll2.lat * Math.PI / 180) *
        Math.cos((ll2.lng - ll1.lng) * Math.PI / 180)) * R;
    return `${(d || 0).toFixed(2)}m`;
};

export const calculateAngle = (p1: { x: number, y: number }, vertex: { x: number, y: number }, p2: { x: number, y: number }) => {
    const v1x = p1.x - vertex.x;
    const v1y = p1.y - vertex.y;
    const v2x = p2.x - vertex.x;
    const v2y = p2.y - vertex.y;

    const d1 = Math.hypot(v1x, v1y);
    const d2 = Math.hypot(v2x, v2y);
    if (d1 < 1e-3 || d2 < 1e-3) return null;

    const dot = v1x * v2x + v1y * v2y;
    const cosAngle = dot / (d1 * d2);
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);

    return angle;
};

export const calculateRidgeLine = (screenPts: { x: number, y: number }[], shape?: string, ridgeAngle?: number, ridgeDirection?: number) => {
    if (!shape || screenPts.length < 3) return null;

    if (shape === 'flat') return null;

    let maxDist = 0;
    let ridgeStart = screenPts[0];
    let ridgeEnd = screenPts[1];

    for (let i = 0; i < screenPts.length; i++) {
        const next = (i + 1) % screenPts.length;
        const dist = Math.hypot(screenPts[next].x - screenPts[i].x, screenPts[next].y - screenPts[i].y);
        if (dist > maxDist) {
            maxDist = dist;
            ridgeStart = screenPts[i];
            ridgeEnd = screenPts[next];
        }
    }

    if (shape === 'gable') {
        const centerX = screenPts.reduce((sum, p) => sum + p.x, 0) / screenPts.length;
        const centerY = screenPts.reduce((sum, p) => sum + p.y, 0) / screenPts.length;
        const dx = ridgeEnd.x - ridgeStart.x;
        const dy = ridgeEnd.y - ridgeStart.y;

        // A gable's ridge runs exactly in the middle parallel to the longest edge.
        // We artificially extend it so point projections hit it perfectly across the building width.
        return {
            start: { x: centerX - dx * 5, y: centerY - dy * 5 },
            end: { x: centerX + dx * 5, y: centerY + dy * 5 }
        };
    }

    if (shape === 'hip') {
        const centerX = screenPts.reduce((sum, p) => sum + p.x, 0) / screenPts.length;
        const centerY = screenPts.reduce((sum, p) => sum + p.y, 0) / screenPts.length;

        const angle = ridgeDirection !== undefined
            ? (ridgeDirection * Math.PI / 180)
            : Math.atan2(ridgeEnd.y - ridgeStart.y, ridgeEnd.x - ridgeStart.x);

        const length = maxDist * 0.8;
        const halfLength = length / 2;

        return {
            start: {
                x: centerX - Math.cos(angle) * halfLength,
                y: centerY - Math.sin(angle) * halfLength
            },
            end: {
                x: centerX + Math.cos(angle) * halfLength,
                y: centerY + Math.sin(angle) * halfLength
            }
        };
    }

    if (shape === 'shed') {
        let minY = Infinity;
        let highEdgeStart = screenPts[0];
        let highEdgeEnd = screenPts[1];

        for (let i = 0; i < screenPts.length; i++) {
            const next = (i + 1) % screenPts.length;
            const avgY = (screenPts[i].y + screenPts[next].y) / 2;
            if (avgY < minY) {
                minY = avgY;
                highEdgeStart = screenPts[i];
                highEdgeEnd = screenPts[next];
            }
        }
        return { start: highEdgeStart, end: highEdgeEnd };
    }

    return null;
};

export const calculatePolygonCenter = (screenPts: { x: number, y: number }[]) => {
    if (screenPts.length < 3) {
        const avgX = screenPts.reduce((sum, p) => sum + p.x, 0) / screenPts.length;
        const avgY = screenPts.reduce((sum, p) => sum + p.y, 0) / screenPts.length;
        return { x: avgX, y: avgY };
    }

    let area = 0;
    let cx = 0;
    let cy = 0;

    for (let i = 0; i < screenPts.length; i++) {
        const j = (i + 1) % screenPts.length;
        const cross = screenPts[i].x * screenPts[j].y - screenPts[j].x * screenPts[i].y;
        area += cross;
        cx += (screenPts[i].x + screenPts[j].x) * cross;
        cy += (screenPts[i].y + screenPts[j].y) * cross;
    }

    area /= 2;
    if (Math.abs(area) < 1e-6) {
        const avgX = screenPts.reduce((sum, p) => sum + p.x, 0) / screenPts.length;
        const avgY = screenPts.reduce((sum, p) => sum + p.y, 0) / screenPts.length;
        return { x: avgX, y: avgY };
    }

    return {
        x: cx / (6 * area),
        y: cy / (6 * area)
    };
};

export const calculateStraightSkeleton = (screenPts: { x: number, y: number }[], shape: string = 'gable') => {
    if (screenPts.length < 3 || shape === 'flat') return { lines: [], nodes: [] };

    const rawLines: Array<{ start: { x: number, y: number }, end: { x: number, y: number }, type: 'ridge' | 'valley' | 'hip' }> = [];

    // Convert points to Clipper format (scaled up for precision)
    const scale = 1000;
    const path = screenPts.map(p => ({ X: Math.round(p.x * scale), Y: Math.round(p.y * scale) }));

    const isPositive = ClipperLib.Clipper.Orientation(path);
    if (!isPositive) {
        path.reverse();
    }

    let currentPaths = [path];
    const step = 4 * scale; // 4 pixels per inward step
    let iteration = 0;
    const maxIterations = 500;

    const co = new ClipperLib.ClipperOffset();
    let previousVertices = [...path];

    while (currentPaths.length > 0 && iteration < maxIterations) {
        iteration++;
        co.Clear();
        co.AddPaths(currentPaths, ClipperLib.JoinType.jtMiter, ClipperLib.EndType.etClosedPolygon);

        const offsetPaths = new ClipperLib.Paths();
        co.Execute(offsetPaths, -step);

        if (offsetPaths.length === 0) {
            currentPaths.forEach(p => {
                if (p.length >= 2) {
                    for (let i = 0; i < p.length - 1; i++) {
                        rawLines.push({
                            start: { x: p[i].X / scale, y: p[i].Y / scale },
                            end: { x: p[i + 1].X / scale, y: p[i + 1].Y / scale },
                            type: 'ridge'
                        });
                    }
                    if (p.length > 2) {
                        rawLines.push({
                            start: { x: p[p.length - 1].X / scale, y: p[p.length - 1].Y / scale },
                            end: { x: p[0].X / scale, y: p[0].Y / scale },
                            type: 'ridge'
                        });
                    }
                }
            });
            break;
        }

        // Connect previous vertices to their closest new vertices to draw hips/valleys
        offsetPaths.forEach(newPath => {
            previousVertices.forEach(prevV => {
                let closestDist = Infinity;
                let closestNewV = newPath[0];

                newPath.forEach(newV => {
                    const d = Math.hypot(newV.X - prevV.X, newV.Y - prevV.Y);
                    if (d < closestDist) {
                        closestDist = d;
                        closestNewV = newV;
                    }
                });

                // Loosen the distance check so it connects to fast moving corners (acute angles)
                if (closestDist > 0.1 * scale && closestDist < step * 15) {
                    rawLines.push({
                        start: { x: prevV.X / scale, y: prevV.Y / scale },
                        end: { x: closestNewV.X / scale, y: closestNewV.Y / scale },
                        type: 'hip'
                    });
                }
            });
        });

        previousVertices = [];
        offsetPaths.forEach(p => previousVertices.push(...p));
        currentPaths = offsetPaths;
    }

    // --- Post-process: Snap Points and Merge Collinear Segments ---
    const snapPts: { x: number, y: number }[] = [];
    const snapTol = 8; // Snap vertices within 8 pixels

    const getSnappedPoint = (pt: { x: number, y: number }) => {
        // First check if it's close to an original perimeter point to anchor exactly
        for (const p of screenPts) {
            if (Math.hypot(p.x - pt.x, p.y - pt.y) < snapTol) return p;
        }
        // Then snap to already observed internal points
        for (const sp of snapPts) {
            if (Math.hypot(sp.x - pt.x, sp.y - pt.y) < snapTol) {
                return sp;
            }
        }
        snapPts.push(pt);
        return pt;
    };

    let snappedLines = rawLines.map(l => ({
        start: getSnappedPoint(l.start),
        end: getSnappedPoint(l.end),
        type: l.type
    })).filter(l => l.start !== l.end); // Remove degenerate lines

    let simplifiedLines = [...snappedLines];
    let changed = true;
    const angTol = 0.25; // roughly 14.3 degrees

    while (changed) {
        changed = false;

        const adj = new Map<any, { line: any, other: any }[]>();
        screenPts.forEach(p => adj.set(p, []));
        snapPts.forEach(p => adj.set(p, []));

        simplifiedLines.forEach(l => {
            if (!adj.has(l.start)) adj.set(l.start, []);
            if (!adj.has(l.end)) adj.set(l.end, []);
            adj.get(l.start)!.push({ line: l, other: l.end });
            adj.get(l.end)!.push({ line: l, other: l.start });
        });

        for (const [node, edges] of adj.entries()) {
            if (edges.length === 2) {
                const e1 = edges[0];
                const e2 = edges[1];

                const pB = node;
                const pA = e1.other;
                const pC = e2.other;

                const angle1 = Math.atan2(pB.y - pA.y, pB.x - pA.x);
                const angle2 = Math.atan2(pC.y - pB.y, pC.x - pB.x);

                let diff = Math.abs(angle1 - angle2);
                if (diff > Math.PI) diff = 2 * Math.PI - diff;

                // If the lines are close to collinear
                if (diff < angTol) {
                    simplifiedLines = simplifiedLines.filter(l => l !== e1.line && l !== e2.line);
                    simplifiedLines.push({
                        start: pA,
                        end: pC,
                        type: e1.line.type
                    });
                    changed = true;
                    break;
                }
            }
        }
    }

    // Output graph inner nodes
    const nodeSetObj = new Set<any>();
    simplifiedLines.forEach(l => {
        nodeSetObj.add(l.start);
        nodeSetObj.add(l.end);
    });

    const internalNodes: { x: number, y: number }[] = [];
    nodeSetObj.forEach(n => {
        // It's internal if it's not a perimeter point
        const onPerimeter = screenPts.some(pt => Math.hypot(pt.x - n.x, pt.y - n.y) < 2);
        if (!onPerimeter) {
            internalNodes.push(n);
        }
    });

    return { lines: simplifiedLines, nodes: internalNodes };
};

export const calculateRoofStructureLines = (screenPts: { x: number, y: number }[], shape?: string, ridgeAngle?: number, ridgeDirection?: number, isAnalyzed?: boolean, skeletonOffsets?: Record<number, { dx: number, dy: number }>, deletedNodes?: number[]) => {
    if (!shape || screenPts.length < 3) return { lines: [], nodes: [] };
    if (shape === 'flat') return { lines: [], nodes: [] };

    if (isAnalyzed) {
        const skeletonData = calculateStraightSkeleton(screenPts, shape);
        let finalLines = skeletonData.lines;
        let finalNodes = skeletonData.nodes;

        if (skeletonOffsets) {
            finalNodes = finalNodes.map((n, idx) => {
                const off = skeletonOffsets[idx] || { dx: 0, dy: 0 };
                return { x: n.x + off.dx, y: n.y + off.dy };
            });

            finalLines = finalLines.map(line => {
                let s = line.start;
                let e = line.end;

                // Shift ends if they correspond to an inner node
                skeletonData.nodes.forEach((origN, idx) => {
                    if (Math.hypot(origN.x - s.x, origN.y - s.y) < 1) s = finalNodes[idx];
                    if (Math.hypot(origN.x - e.x, origN.y - e.y) < 1) e = finalNodes[idx];
                });
                return { ...line, start: s, end: e };
            });
        }

        if (deletedNodes && deletedNodes.length > 0) {
            const epsilon = 1.0;
            finalLines = finalLines.filter(line => {
                const startIsDeleted = deletedNodes.some(idx => {
                    const node = finalNodes[idx];
                    return node && Math.hypot(line.start.x - node.x, line.start.y - node.y) < epsilon;
                });
                const endIsDeleted = deletedNodes.some(idx => {
                    const node = finalNodes[idx];
                    return node && Math.hypot(line.end.x - node.x, line.end.y - node.y) < epsilon;
                });
                return !startIsDeleted && !endIsDeleted;
            });
        }

        return { lines: finalLines, nodes: finalNodes };
    }

    const lines: Array<{ start: { x: number, y: number }, end: { x: number, y: number }, type: 'ridge' | 'valley' | 'hip' }> = [];
    const ridge = calculateRidgeLine(screenPts, shape, ridgeAngle, ridgeDirection);
    const center = calculatePolygonCenter(screenPts);

    if (shape === 'gable' && ridge) {
        lines.push({ start: ridge.start, end: ridge.end, type: 'ridge' });

        const ridgePoints = [ridge.start, ridge.end];
        const tolerance = 8;
        const otherPoints = screenPts.filter(p =>
            !ridgePoints.some(rp => Math.hypot(p.x - rp.x, p.y - rp.y) < tolerance)
        );

        otherPoints.forEach(point => {
            const dx = ridge.end.x - ridge.start.x;
            const dy = ridge.end.y - ridge.start.y;
            const lenSq = dx * dx + dy * dy;

            if (lenSq < 1e-6) return;

            const t = Math.max(0, Math.min(1,
                ((point.x - ridge.start.x) * dx + (point.y - ridge.start.y) * dy) / lenSq
            ));

            const closestOnRidge = {
                x: ridge.start.x + t * dx,
                y: ridge.start.y + t * dy
            };
            lines.push({ start: closestOnRidge, end: point, type: 'valley' });
        });
    } else if (shape === 'hip' && ridge) {
        lines.push({ start: ridge.start, end: ridge.end, type: 'ridge' });

        screenPts.forEach((corner) => {
            const distToStart = Math.hypot(corner.x - ridge.start.x, corner.y - ridge.start.y);
            const distToEnd = Math.hypot(corner.x - ridge.end.x, corner.y - ridge.end.y);

            if (distToStart > 10 && distToEnd > 10) {
                lines.push({ start: center, end: corner, type: 'hip' });
            }
        });
    } else if (shape === 'shed' && ridge) {
        lines.push({ start: ridge.start, end: ridge.end, type: 'ridge' });

        const ridgePoints = [ridge.start, ridge.end];
        const tolerance = 8;
        const otherPoints = screenPts.filter(p =>
            !ridgePoints.some(rp => Math.hypot(p.x - rp.x, p.y - rp.y) < tolerance)
        );

        otherPoints.forEach(point => {
            const dx = ridge.end.x - ridge.start.x;
            const dy = ridge.end.y - ridge.start.y;
            const lenSq = dx * dx + dy * dy;

            if (lenSq < 1e-6) return;

            const t = Math.max(0, Math.min(1,
                ((point.x - ridge.start.x) * dx + (point.y - ridge.start.y) * dy) / lenSq
            ));

            const closestOnRidge = {
                x: ridge.start.x + t * dx,
                y: ridge.start.y + t * dy
            };
            lines.push({ start: closestOnRidge, end: point, type: 'valley' });
        });
    } else if (shape === 'gambrel' || shape === 'mansard') {
        if (ridge) {
            lines.push({ start: ridge.start, end: ridge.end, type: 'ridge' });
        }

        screenPts.forEach((vertex) => {
            lines.push({
                start: center,
                end: vertex,
                type: 'valley'
            });
        });

        screenPts.forEach((p, i) => {
            const next = screenPts[(i + 1) % screenPts.length];
            const midX = (p.x + next.x) / 2;
            const midY = (p.y + next.y) / 2;
            lines.push({
                start: center,
                end: { x: midX, y: midY },
                type: 'valley'
            });
        });
    } else if (ridge) {
        lines.push({ start: ridge.start, end: ridge.end, type: 'ridge' });

        screenPts.forEach((vertex) => {
            lines.push({
                start: center,
                end: vertex,
                type: 'valley'
            });
        });
    }
    return lines;
};

// --- Split Polygon Algorithm ---
export const splitPolygon = (
    screenPts: { x: number, y: number }[],
    lineStart: { x: number, y: number },
    lineEnd: { x: number, y: number }
) => {
    const EPSILON = 1e-6;

    // Normalize line vector to avoid length-dependent epsilon issues
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const len = Math.hypot(dx, dy);

    if (len < EPSILON) return null; // Line is too short

    const nx = dx / len;
    const ny = dy / len;

    const side = (p: { x: number, y: number }) => {
        // Distance from point to line (cross product with normalized vector)
        const val = nx * (p.y - lineStart.y) - ny * (p.x - lineStart.x);
        // Use a 1-pixel threshold for being "on" the line
        return Math.abs(val) < 1.0 ? 0 : val > 0 ? 1 : -1;
    };

    const getIntersection = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
        const a1 = p2.y - p1.y;
        const b1 = p1.x - p2.x;
        const c1 = a1 * p1.x + b1 * p1.y;

        const a2 = dy;
        const b2 = -dx;
        const c2 = a2 * lineStart.x + b2 * lineStart.y;

        const delta = a1 * b2 - a2 * b1;
        if (Math.abs(delta) < EPSILON) return null; // Parallel

        return {
            x: (b2 * c1 - b1 * c2) / delta,
            y: (a1 * c2 - a2 * c1) / delta
        };
    };

    const poly1: { x: number, y: number }[] = [];
    const poly2: { x: number, y: number }[] = [];
    let intersectionCount = 0;

    const addDistinct = (poly: { x: number, y: number }[], pt: { x: number, y: number }) => {
        if (poly.length === 0) {
            poly.push(pt);
            return;
        }
        const last = poly[poly.length - 1];
        if (Math.hypot(last.x - pt.x, last.y - pt.y) > 0.1) {
            poly.push(pt);
        }
    };

    for (let i = 0; i < screenPts.length; i++) {
        const current = screenPts[i];
        const next = screenPts[(i + 1) % screenPts.length];

        const side1 = side(current);
        const side2 = side(next);

        if (side1 >= 0) addDistinct(poly1, current);
        if (side1 <= 0) addDistinct(poly2, current);

        if (side1 * side2 < 0) {
            const intersection = getIntersection(current, next);
            if (intersection && isFinite(intersection.x) && isFinite(intersection.y)) {
                addDistinct(poly1, intersection);
                addDistinct(poly2, intersection);
                intersectionCount++;
            }
        }
    }

    // Clean up end-to-start duplicates
    const cleanPoly = (poly: { x: number, y: number }[]) => {
        if (poly.length > 1 && Math.hypot(poly[0].x - poly[poly.length - 1].x, poly[0].y - poly[poly.length - 1].y) < 0.1) {
            poly.pop();
        }
        return poly;
    };

    const p1Clean = cleanPoly(poly1);
    const p2Clean = cleanPoly(poly2);

    if (intersectionCount >= 2 && p1Clean.length >= 3 && p2Clean.length >= 3) {
        return [p1Clean, p2Clean];
    }
    return null;
};

// --- PV Layout Support Functions ---

export const getAutoAzimuth = (points: { lat: number, lng: number }[], centerLat: number, centerLng: number, zoom: number = 20): number => {
    if (points.length < 2) return 180;
    
    // Convert to pixel space
    const pxPoints = points.map(p => latLngToPixel([p.lat, p.lng], [centerLat, centerLng], zoom));
    
    let maxDistSq = 0;
    let bestAngle = 0;
    
    for (let i = 0; i < pxPoints.length; i++) {
        const p1 = pxPoints[i];
        const p2 = pxPoints[(i + 1) % pxPoints.length];
        const distSq = (p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2;
        if (distSq > maxDistSq) {
            maxDistSq = distSq;
            bestAngle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
        }
    }
    
    // bestAngle is in radians in screen space (+y down, +x right)
    // Convert to degrees
    let angleDeg = bestAngle * 180 / Math.PI;
    
    // Convert screen angle to geographic azimuth (where North is 0, East is 90)
    // In screen space: 0 = East (90), 90 = South (180), -90 = North (0), 180 = West (270)
    let edgeAzimuth = (angleDeg + 90 + 360) % 360;
    
    // The roof's azimuth (slope direction) is typically perpendicular to the longest edge (eave/ridge)
    // We add 90 degrees to get the perpendicular direction
    let roofAzimuth = (edgeAzimuth + 90) % 360;
    
    return Math.round(roofAzimuth);
};

export const getPolygonLongestEdgeAngle = (points: { x: number, y: number }[]): number => {
    if (points.length < 2) return 0;
    let maxDistSq = 0;
    let bestAngle = 0;
    for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        const distSq = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
        if (distSq > maxDistSq) {
            maxDistSq = distSq;
            bestAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        }
    }
    return bestAngle;
};

export const rotatePoint = (p: { x: number, y: number }, angle: number, origin: { x: number, y: number }): { x: number, y: number } => {
    const cosArg = Math.cos(angle);
    const sinArg = Math.sin(angle);
    return {
        x: cosArg * (p.x - origin.x) - sinArg * (p.y - origin.y) + origin.x,
        y: sinArg * (p.x - origin.x) + cosArg * (p.y - origin.y) + origin.y
    };
};

const getDistanceSquared = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
    return (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
};

const getDistanceToSegment = (p: { x: number, y: number }, v: { x: number, y: number }, w: { x: number, y: number }) => {
    const l2 = getDistanceSquared(v, w);
    if (l2 === 0) return Math.sqrt(getDistanceSquared(p, v));
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const proj = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
    return Math.sqrt(getDistanceSquared(p, proj));
};

export const getMinDistanceToPolygonEdges = (p: { x: number, y: number }, polygon: { x: number, y: number }[]): number => {
    if (polygon.length < 2) return 0;
    let minDist = Infinity;
    for (let i = 0; i < polygon.length; i++) {
        const v = polygon[i];
        const w = polygon[(i + 1) % polygon.length];
        const d = getDistanceToSegment(p, v, w);
        if (d < minDist) minDist = d;
    }
    return minDist;
};

// --- Shadow Casting & Simulation ---

// Calculate sun position based on day of year and time of day (mock implementation for simulation)
// Returns azimuth (angle around Z axis) and elevation (angle above horizon)
export const calculateSunPosition = (month: number = 6, hour: number = 10, lat: number = 21): { azimuth: number, elevation: number } => {
    // Simplified solar algorithm for visualization (Northern hemisphere default)
    // Map hour 6 to 18 to azimuth -90 to +90 (East to West) roughly
    const timeRatio = (hour - 12) / 6; // -1 at 6am, 0 at noon, 1 at 6pm

    // Azimuth in radians (0 is North, PI/2 is East, PI is South)
    // At noon (timeRatio=0), in Northern hemisphere, sun is South (Math.PI)
    // Morning is East (Math.PI/2), Afternoon is West (3*Math.PI/2)
    const azimuth = Math.PI - (timeRatio * Math.PI / 2);

    // Elevation (peak at noon, lower in morning/evening, lower in winter)
    // Summer (month 6) has higher peak than Winter (month 12)
    const seasonalBoost = Math.cos((month - 6) * Math.PI / 6) * 0.3;
    const peakElevation = (Math.PI / 2) - (lat * Math.PI / 180) + seasonalBoost;

    // Elevation follows an arc over the day
    const elevation = peakElevation * Math.cos(timeRatio * Math.PI / 2);

    return { azimuth, elevation: Math.max(0, elevation) }; // Don't go below horizon
};

// Project a 3D point's shadow onto the 2D ground/roof plane
// sunAzimuth: radians from North. sunElevation: radians above horizon
export const projectShadow = (
    p: { x: number, y: number, z: number },
    sunAzimuth: number,
    sunElevation: number,
    groundZ: number = 0
): { x: number, y: number } => {
    if (sunElevation <= 0 || p.z <= groundZ) return { x: p.x, y: p.y }; // No shadow cast

    // Length of the shadow on the ground
    const shadowLength = (p.z - groundZ) / Math.tan(sunElevation);

    // Shadow casts opposite to the sun's azimuth
    const shadowAngle = sunAzimuth + Math.PI;

    // The SVG/Screen coordinate system has Y pointing down, X pointing right.
    // Standard Math azimuth: 0=North(Y-), PI/2=East(X+), PI=South(Y+), 3PI/2=West(X-)
    // Convert mathematical compass to screen coordinates:
    const dx = Math.sin(shadowAngle) * shadowLength;
    const dy = -Math.cos(shadowAngle) * shadowLength;

    return {
        x: p.x + dx,
        y: p.y + dy
    };
};

export const isModuleShaded = (
    moduleCenter: { x: number, y: number },
    moduleRadius: number,
    obstructions: Array<{ points: { x: number, y: number }[], height: number }>,
    trees: Array<{ x: number, y: number, radius: number, height: number }>,
    sunAzimuth: number,
    sunElevation: number,
    pixelsPerMeter: number
): boolean => {
    if (sunElevation <= 0) return true; // Night time entirely shaded

    // Check trees (cylinders dropping circular/elliptical shadows)
    for (const tree of trees) {
        // Project the tree's top center
        const shadowCenter = projectShadow(
            { x: tree.x, y: tree.y, z: tree.height * pixelsPerMeter },
            sunAzimuth,
            sunElevation
        );

        // Very simplified spherical tree crown shadow overlap check
        // The shadow of a sphere is technically an ellipse, but for fast checking
        // we approximate it as a stretched capsule/line from base to shadow top
        // For simplicity, we just check distance to the line connecting base and projected top
        const treeRadPx = (tree.radius || 1) * pixelsPerMeter;

        // Quick bounding check against the shadow tip
        const distToShadowCrown = Math.hypot(shadowCenter.x - moduleCenter.x, shadowCenter.y - moduleCenter.y);

        // Also check distance to the "trunk" shadow line
        const distToShadowTrunk = getDistanceToSegment(moduleCenter, { x: tree.x, y: tree.y }, shadowCenter);

        if (distToShadowCrown < treeRadPx + moduleRadius || distToShadowTrunk < treeRadPx * 0.5 + moduleRadius) {
            return true;
        }
    }

    // Check obstructions (extruded polygons dropping composite polygon shadows)
    for (const obs of obstructions) {
        if (!obs.points || obs.points.length < 3) continue;

        // Create the base and the projected top
        const basePoints = obs.points;
        const projectedTopPoints = basePoints.map(p =>
            projectShadow({ x: p.x, y: p.y, z: obs.height * pixelsPerMeter }, sunAzimuth, sunElevation)
        );

        // The total shadow area is the convex hull of the base and projected top
        // An approximation is to check if the module is inside the projected top 
        // OR inside the quads connecting corresponding edges

        if (isPointInPolygon(moduleCenter, projectedTopPoints)) return true;

        for (let i = 0; i < basePoints.length; i++) {
            const next = (i + 1) % basePoints.length;
            const quad = [
                basePoints[i], basePoints[next],
                projectedTopPoints[next], projectedTopPoints[i]
            ];
            if (isPointInPolygon(moduleCenter, quad)) return true;
        }
    }

    return false;
};

// Returns an array of 2D polygons representing the shadows of all objects
export const calculateShadowPolygons = (
    obstructions: Array<{ points: { x: number, y: number }[], height: number }>,
    trees: Array<{ x: number, y: number, radius: number, height: number }>,
    sunAzimuth: number,
    sunElevation: number,
    pixelsPerMeter: number
): Array<{ x: number, y: number }[]> => {
    if (sunElevation <= 0) return []; // Night time

    const shadowPolys: Array<{ x: number, y: number }[]> = [];

    // Obstruction shadows (simplistic convex hull approximation)
    for (const obs of obstructions) {
        if (!obs.points || obs.points.length < 3) continue;

        const basePoints = obs.points;
        const projectedTopPoints = basePoints.map(p =>
            projectShadow({ x: p.x, y: p.y, z: obs.height * pixelsPerMeter }, sunAzimuth, sunElevation)
        );

        // Return a combined footprint (for a simple block this is just joining base and top)
        // We do this by creating quads for each face and merging them visually
        const combined = [...basePoints, ...projectedTopPoints];

        // Simple 2D convex hull to wrap the shadow (Graham Scan or Monotone Chain)
        // For visual performance, we can just use a simplistic sweep or assume a convex shape
        // implementation: monotone chain convex hull
        combined.sort((a, b) => a.x !== b.x ? a.x - b.x : a.y - b.y);

        const hull: { x: number, y: number }[] = [];
        // Lower
        for (const p of combined) {
            while (hull.length >= 2) {
                const q = hull[hull.length - 1];
                const r = hull[hull.length - 2];
                if ((q.x - r.x) * (p.y - r.y) - (q.y - r.y) * (p.x - r.x) >= 0) {
                    hull.pop();
                } else break;
            }
            hull.push(p);
        }
        // Upper
        for (let i = combined.length - 2, t = hull.length + 1; i >= 0; i--) {
            const p = combined[i];
            while (hull.length >= t) {
                const q = hull[hull.length - 1];
                const r = hull[hull.length - 2];
                if ((q.x - r.x) * (p.y - r.y) - (q.y - r.y) * (p.x - r.x) >= 0) {
                    hull.pop();
                } else break;
            }
            hull.push(p);
        }

        hull.pop(); // Remove duplicate end point
        if (hull.length >= 3) {
            shadowPolys.push(hull);
        }
    }

    // Tree shadows (approximation using an ellipse-like capsule)
    for (const tree of trees) {
        const shadowCenter = projectShadow(
            { x: tree.x, y: tree.y, z: tree.height * pixelsPerMeter },
            sunAzimuth,
            sunElevation
        );

        const r = (tree.radius || 1) * pixelsPerMeter;

        // To draw the capsule shadow, we create a polygon around the trunk line
        // Calculate normal to the shadow vector
        const dx = shadowCenter.x - tree.x;
        const dy = shadowCenter.y - tree.y;
        const dLen = Math.hypot(dx, dy);

        if (dLen > 0.1) {
            const nx = -dy / dLen * r;
            const ny = dx / dLen * r;

            shadowPolys.push([
                { x: tree.x + nx, y: tree.y + ny },
                { x: shadowCenter.x + nx, y: shadowCenter.y + ny },

                // Add points for the round cap of the shadow cast
                { x: shadowCenter.x + dx / dLen * r, y: shadowCenter.y + dy / dLen * r },

                { x: shadowCenter.x - nx, y: shadowCenter.y - ny },
                { x: tree.x - nx, y: tree.y - ny },
            ]);
        }
    }

    return shadowPolys;
};


// Calculate an approximate annual shading loss percentage (0.0 to 1.0)
export const calculateAnnualShadingLoss = (
    moduleCenter: { x: number, y: number },
    moduleRadius: number,
    obstructions: Array<{ points: { x: number, y: number }[], height: number }>,
    trees: Array<{ x: number, y: number, radius: number, height: number }>,
    pixelsPerMeter: number
): number => {
    // Sample representative days (solstices/equinoxes) and hours
    const months = [3, 6, 9, 12];
    const hours = [8, 10, 12, 14, 16];
    const latitude = 21;

    let shadedCount = 0;
    let totalSamples = 0;

    for (const month of months) {
        for (const hour of hours) {
            const sunPos = calculateSunPosition(month, hour, latitude);
            if (sunPos.elevation > 0) {
                totalSamples++;
                if (isModuleShaded(moduleCenter, moduleRadius, obstructions, trees, sunPos.azimuth, sunPos.elevation, pixelsPerMeter)) {
                    shadedCount++;
                }
            }
        }
    }

    if (totalSamples === 0) return 0;

    // Base loss + calculated shade
    let loss = (shadedCount / totalSamples);

    // Add a tiny bit of noise to make the heatmap look more realistic/continuous instead of hard steps
    if (loss > 0) {
        loss += (Math.random() * 0.05);
    } else {
        // Unshaded panels still have a base 1-3% loss from soiling/ambient
        loss = 0.01 + (Math.random() * 0.02);
    }

    return Math.min(1.0, loss);
};
