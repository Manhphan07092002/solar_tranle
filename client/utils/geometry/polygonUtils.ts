import { isPointInPolygon } from '../helpers';
import { pixelToLatLng } from '../mapUtils';
// This file contains extracted geometry utilities from mapUtils.ts and StepModeling.tsx.

// --- Geometry & Metric Helpers ---

export const metersToPixels = (meters: number, lat: number, zoom: number) => {
    const metersPerPixel = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
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

    // Use better center approximation (Bounding Box center is often more visually pleasing for primitive ridges than point average)
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    screenPts.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    });
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    if (shape === 'gable') {
        let angle = Math.atan2(ridgeEnd.y - ridgeStart.y, ridgeEnd.x - ridgeStart.x);
        if (ridgeAngle !== undefined) {
            angle += (ridgeAngle * Math.PI) / 180;
        }

        const length = maxDist * 5; // Long line to ensure it cuts through the whole polygon visually
        const dx = Math.cos(angle) * length;
        const dy = Math.sin(angle) * length;

        return {
            start: { x: centerX - dx, y: centerY - dy },
            end: { x: centerX + dx, y: centerY + dy }
        };
    }

    if (shape === 'hip') {
        let angle = ridgeDirection !== undefined
            ? (ridgeDirection * Math.PI / 180)
            : Math.atan2(ridgeEnd.y - ridgeStart.y, ridgeEnd.x - ridgeStart.x);

        if (ridgeAngle !== undefined) {
            angle += (ridgeAngle * Math.PI) / 180;
        }

        // Calculate Object-Oriented Bounding Box relative to the ridge angle
        const cosA = Math.cos(-angle);
        const sinA = Math.sin(-angle);

        let minU = Infinity, maxU = -Infinity;
        let minV = Infinity, maxV = -Infinity;

        screenPts.forEach(p => {
            // Rotate point to align with the angle
            const u = p.x * cosA - p.y * sinA;
            const v = p.x * sinA + p.y * cosA;
            if (u < minU) minU = u;
            if (u > maxU) maxU = u;
            if (v < minV) minV = v;
            if (v > maxV) maxV = v;
        });

        const lengthU = maxU - minU;
        const lengthV = maxV - minV;

        // The ridge length of a hip roof is the difference between its length and width.
        // If it's a square (lengthU ≈ lengthV), the ridge is a single point (length = 0), forming a pyramid.
        const ridgeLength = Math.max(0, lengthU - lengthV);
        const halfLength = ridgeLength / 2;

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

        // If the point is exactly on the cutting line, it counts as an intersection
        if (side1 === 0) {
            intersectionCount++;
        }

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

// --- Line Segment Intersection ---

/**
 * Checks if two line segments (p1-p2 and p3-p4) intersect.
 * Uses the cross product approach to check relative orientations.
 */
export const doLineSegmentsIntersect = (
    p1: { x: number, y: number },
    p2: { x: number, y: number },
    p3: { x: number, y: number },
    p4: { x: number, y: number }
): boolean => {
    // Helper to find orientation of ordered triplet (p, q, r).
    // Returns 0 -> colinear, 1 -> clockwise, 2 -> counterclockwise
    const orientation = (p: { x: number, y: number }, q: { x: number, y: number }, r: { x: number, y: number }) => {
        const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
        if (Math.abs(val) < 1e-6) return 0; // colinear
        return (val > 0) ? 1 : 2; // clock or counterclock wise
    };

    // Helper to check if point q lies on line segment pr
    const onSegment = (p: { x: number, y: number }, q: { x: number, y: number }, r: { x: number, y: number }) => {
        if (q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
            q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y))
            return true;
        return false;
    };

    const o1 = orientation(p1, p2, p3);
    const o2 = orientation(p1, p2, p4);
    const o3 = orientation(p3, p4, p1);
    const o4 = orientation(p3, p4, p2);

    // General case
    if (o1 !== o2 && o3 !== o4) return true;

    // Special Cases (colinear intersections) - using a tiny buffer for floating point
    if (o1 === 0 && onSegment(p1, p3, p2)) return true;
    if (o2 === 0 && onSegment(p1, p4, p2)) return true;
    if (o3 === 0 && onSegment(p3, p1, p4)) return true;
    if (o4 === 0 && onSegment(p3, p2, p4)) return true;

    return false;
};

// --- PV Layout Support Functions ---

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

export const getDistanceToSegment = (p: { x: number, y: number }, v: { x: number, y: number }, w: { x: number, y: number }) => {
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

/**
 * Calculate true solar position using standard astronomical formulas.
 *
 * Inputs:
 *   month  : 1–12
 *   hour   : solar time (e.g. 10.5 = 10:30 AM)
 *   lat    : latitude in degrees (positive = North)
 *
 * Returns:
 *   azimuth   : radians, convention 0=North, π/2=East, π=South, 3π/2=West (clockwise)
 *   elevation : radians above horizon (0 = sunrise/sunset, π/2 = zenith)
 *
 * Formulas:
 *   δ  = 23.45° × sin(360°/365 × (284 + n))          — Solar Declination (Spencer)
 *   ω  = 15° × (t − 12)                               — Hour Angle
 *   sin(α) = sin(φ)sin(δ) + cos(φ)cos(δ)cos(ω)       — Solar Altitude
 *   sin(γ) = cos(δ)sin(ω) / cos(α)                    — Solar Azimuth (from South, +West)
 */
export const calculateSunPosition = (
    month: number = 6,
    hour: number = 12,
    lat: number = 21
): { azimuth: number; elevation: number } => {
    // Mid-day-of-year for each month (approximate)
    const MID_DAY = [15, 46, 75, 105, 135, 162, 198, 228, 258, 288, 318, 344];
    const n = MID_DAY[Math.min(Math.max(month - 1, 0), 11)];

    // 1. Solar Declination δ (degrees → radians)
    const declDeg = 23.45 * Math.sin((2 * Math.PI * (284 + n)) / 365);
    const δ = declDeg * (Math.PI / 180);

    // 2. Hour Angle ω: 0 at solar noon, negative morning, positive afternoon
    const ω = (hour - 12) * 15 * (Math.PI / 180);

    // 3. Latitude in radians
    const φ = lat * (Math.PI / 180);

    // 4. Solar Altitude α
    //    sin(α) = sin(φ)sin(δ) + cos(φ)cos(δ)cos(ω)
    const sinAlt = Math.sin(φ) * Math.sin(δ) + Math.cos(φ) * Math.cos(δ) * Math.cos(ω);
    const elevation = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

    if (elevation <= 0) return { azimuth: 0, elevation: 0 };

    // 5. Solar Azimuth γ (standard: from South, positive = West for NH)
    //    sin(γ) = cos(δ)sin(ω) / cos(α)
    //    cos(γ) = (sin(α)sin(φ) − sin(δ)) / (cos(α)cos(φ))
    const cosAlt = Math.cos(elevation);
    const sinAz = (Math.cos(δ) * Math.sin(ω)) / cosAlt;
    const cosAz = (sinAlt * Math.sin(φ) - Math.sin(δ)) / (cosAlt * Math.cos(φ));
    const azFromSouth = Math.atan2(sinAz, cosAz); // radians, from South, +West

    // 6. Convert to our screen convention: 0=North, π/2=East, π=South, 3π/2=West
    //    azFromSouth=0   → South  = π
    //    azFromSouth=π/2 → West   = 3π/2
    //    azFromSouth=-π/2→ East   = π/2
    let azimuth = Math.PI + azFromSouth;
    azimuth = ((azimuth % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); // Normalize [0, 2π)

    return { azimuth, elevation };
};

/**
 * Project a 3D point's shadow onto the 2D ground plane.
 *
 * Formula: L = H / tan(α)   (shadow length from height H at altitude α)
 * Shadow direction is opposite to the sun azimuth.
 *
 * Screen coordinate system: X→right, Y→down.
 * Azimuth convention: 0=North(-Y), π/2=East(+X), π=South(+Y), 3π/2=West(-X)
 *   dx = sin(shadowAngle) × L
 *   dy = −cos(shadowAngle) × L
 */
export const projectShadow = (
    p: { x: number; y: number; z: number },
    sunAzimuth: number,
    sunElevation: number,
    groundZ: number = 0
): { x: number; y: number } => {
    if (sunElevation <= 0.001 || p.z <= groundZ) return { x: p.x, y: p.y };

    // L = H / tan(α)
    const shadowLength = (p.z - groundZ) / Math.tan(sunElevation);

    // Shadow falls opposite to sun
    const shadowAngle = sunAzimuth + Math.PI;
    const dx = Math.sin(shadowAngle) * shadowLength;
    const dy = -Math.cos(shadowAngle) * shadowLength;

    return { x: p.x + dx, y: p.y + dy };
};

export interface SceneObject {
    id: string;
    type: 'polygon' | 'cylinder';
    baseZ: number;
    topZ: number;
    points?: { x: number; y: number }[];
    x?: number;
    y?: number;
    radius?: number;
}

export interface ShadowPolygon {
    points: { x: number; y: number }[];
    sourceId: string;
    sourcePoints?: { x: number; y: number }[];
    sourceTopZ: number;
}

/**
 * Check if a module (approximated as a disc of radius moduleRadius) is shaded
 * at a given sun position by any scene object.
 */
export const isModuleShaded = (
    moduleCenter: { x: number; y: number },
    moduleRadius: number,
    moduleZ: number,
    sceneObjects: SceneObject[],
    sunAzimuth: number,
    sunElevation: number,
    pixelsPerMeter: number
): boolean => {
    if (sunElevation <= 0) return true; // Below horizon → shaded

    for (const obj of sceneObjects) {
        if (obj.topZ <= moduleZ) continue; // Only objects taller than module can shade it

        if (obj.type === 'polygon' && obj.points && obj.points.length >= 3) {
            const basePoints = obj.points;
            const topProjected = basePoints.map(p =>
                projectShadow(
                    { x: p.x, y: p.y, z: obj.topZ * pixelsPerMeter },
                    sunAzimuth,
                    sunElevation,
                    moduleZ * pixelsPerMeter
                )
            );

            if (isPointInPolygon(moduleCenter, topProjected)) return true;

            for (let i = 0; i < basePoints.length; i++) {
                const next = (i + 1) % basePoints.length;
                const quad = [
                    basePoints[i],
                    basePoints[next],
                    topProjected[next],
                    topProjected[i],
                ];
                if (isPointInPolygon(moduleCenter, quad)) return true;
            }
        } else if (obj.type === 'cylinder' && obj.x !== undefined && obj.y !== undefined && obj.radius !== undefined) {
            const radPx = obj.radius * pixelsPerMeter;
            const shadowTip = projectShadow(
                { x: obj.x, y: obj.y, z: obj.topZ * pixelsPerMeter },
                sunAzimuth,
                sunElevation,
                moduleZ * pixelsPerMeter
            );

            const distToSegment = getDistanceToSegment(
                moduleCenter,
                { x: obj.x, y: obj.y },
                shadowTip
            );
            if (distToSegment < radPx + moduleRadius) return true;
        }
    }

    return false;
};

/**
 * Build 2D shadow polygons for all objects.
 */
export const calculateShadowPolygons = (
    sceneObjects: SceneObject[],
    sunAzimuth: number,
    sunElevation: number,
    pixelsPerMeter: number
): ShadowPolygon[] => {
    if (sunElevation <= 0) return [];

    const shadowPolys: ShadowPolygon[] = [];

    for (const obj of sceneObjects) {
        if (obj.type === 'polygon' && obj.points && obj.points.length >= 3) {
            const basePoints = obj.points;
            const topProjected = basePoints.map(p =>
                projectShadow(
                    { x: p.x, y: p.y, z: obj.topZ * pixelsPerMeter },
                    sunAzimuth,
                    sunElevation,
                    obj.baseZ * pixelsPerMeter
                )
            );

            const combined = [...basePoints, ...topProjected];
            combined.sort((a, b) => (a.x !== b.x ? a.x - b.x : a.y - b.y));

            const hull: { x: number; y: number }[] = [];
            const cross = (O: { x: number; y: number }, A: { x: number; y: number }, B: { x: number; y: number }) =>
                (A.x - O.x) * (B.y - O.y) - (A.y - O.y) * (B.x - O.x);

            for (const p of combined) {
                while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], p) <= 0)
                    hull.pop();
                hull.push(p);
            }
            const lower = hull.length + 1;
            for (let i = combined.length - 2; i >= 0; i--) {
                const p = combined[i];
                while (hull.length >= lower && cross(hull[hull.length - 2], hull[hull.length - 1], p) <= 0)
                    hull.pop();
                hull.push(p);
            }
            hull.pop();
            if (hull.length >= 3) {
                shadowPolys.push({
                    points: hull,
                    sourceId: obj.id,
                    sourcePoints: basePoints,
                    sourceTopZ: obj.topZ
                });
            }
        } else if (obj.type === 'cylinder' && obj.x !== undefined && obj.y !== undefined && obj.radius !== undefined) {
            const r = obj.radius * pixelsPerMeter;
            const shadowTip = projectShadow(
                { x: obj.x, y: obj.y, z: obj.topZ * pixelsPerMeter },
                sunAzimuth,
                sunElevation,
                obj.baseZ * pixelsPerMeter
            );

            const dx = shadowTip.x - obj.x;
            const dy = shadowTip.y - obj.y;
            const dLen = Math.hypot(dx, dy);
            if (dLen < 0.1) continue;

            const nx = (-dy / dLen) * r;
            const ny = (dx / dLen) * r;
            const fx = (dx / dLen) * r;
            const fy = (dy / dLen) * r;

            const treePoints = [];
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2;
                treePoints.push({ x: obj.x + Math.cos(a) * r, y: obj.y + Math.sin(a) * r });
            }

            shadowPolys.push({
                points: [
                    { x: obj.x + nx, y: obj.y + ny },
                    { x: shadowTip.x + nx, y: shadowTip.y + ny },
                    { x: shadowTip.x + fx, y: shadowTip.y + fy },
                    { x: shadowTip.x - nx, y: shadowTip.y - ny },
                    { x: obj.x - nx, y: obj.y - ny },
                ],
                sourceId: obj.id,
                sourcePoints: treePoints,
                sourceTopZ: obj.topZ
            });
        }
    }

    return shadowPolys;
};

/**
 * Calculate annual shading loss for a module position.
 */
export const calculateAnnualShadingLoss = (
    moduleCenter: { x: number; y: number },
    moduleRadius: number,
    moduleZ: number,
    sceneObjects: SceneObject[],
    pixelsPerMeter: number,
    lat: number = 21
): number => {
    const sampleMonths = [12, 3, 6, 9];
    const sampleHours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

    let shadedCount = 0;
    let totalCount = 0;

    for (const month of sampleMonths) {
        for (const hour of sampleHours) {
            const sunPos = calculateSunPosition(month, hour, lat);
            if (sunPos.elevation < 5 * (Math.PI / 180)) continue;

            totalCount++;
            if (isModuleShaded(moduleCenter, moduleRadius, moduleZ, sceneObjects, sunPos.azimuth, sunPos.elevation, pixelsPerMeter)) {
                shadedCount++;
            }
        }
    }

    if (totalCount === 0) return 0;
    return shadedCount / totalCount;
};

/**
 * Z-Alignment formula: z = z0 - tan(tilt) * (dist_from_ridge)
 * Calculates the inherited baseHeight for a new roof sub-polygon
 * to ensure it seamlessly matches the original 3D plane.
 */
export const calculateInheritedBaseHeight = (
    originalRoofPoints: { x: number, y: number }[],
    newPolygonPoints: { x: number, y: number }[],
    shape: string = 'gable',
    tilt: number = 20,
    baseHeight: number = 3,
    ridgeAngle: number = 0,
    ridgeDirection: number = 0
): number => {
    if (shape === 'flat' || tilt === 0) return baseHeight;

    const ridge = calculateRidgeLine(originalRoofPoints, shape, ridgeAngle, ridgeDirection);
    if (!ridge || !ridge.start || !ridge.end) return baseHeight;

    const getDistToSegment = (p: { x: number, y: number }, a: { x: number, y: number }, b: { x: number, y: number }) => {
        const atob = { x: b.x - a.x, y: b.y - a.y };
        const atop = { x: p.x - a.x, y: p.y - a.y };
        const len2 = atob.x * atob.x + atob.y * atob.y;
        if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
        const t = Math.max(0, Math.min(1, (atop.x * atob.x + atop.y * atob.y) / len2));
        const proj = { x: a.x + atob.x * t, y: a.y + atob.y * t };
        return Math.hypot(p.x - proj.x, p.y - proj.y);
    };

    // Find the maximum distance from original points to ridge (this defines where baseHeight applies)
    let maxDistOriginal = 0;
    for (const p of originalRoofPoints) {
        const d = getDistToSegment(p, ridge.start, ridge.end);
        if (d > maxDistOriginal) maxDistOriginal = d;
    }

    const PIXELS_PER_METER = 20; // Approximation based on standard zoom 19
    const tiltRad = (tilt * Math.PI) / 180;

    // The ridge Z coordinate (z0) - this is the highest point of the roof
    const z0 = baseHeight + Math.tan(tiltRad) * (maxDistOriginal / PIXELS_PER_METER);

    // Find the max distance of the *new* polygon from the ridge. 
    // The new polygon's base height is determined by its LOWEST EDGE (furthest from ridge)
    let maxDistNew = 0;
    for (const p of newPolygonPoints) {
        const d = getDistToSegment(p, ridge.start, ridge.end);
        if (d > maxDistNew) maxDistNew = d;
    }

    // Apply the formula to find the new base height
    const newZ = z0 - Math.tan(tiltRad) * (maxDistNew / PIXELS_PER_METER);

    // Safety check, never go below 0
    return Math.max(0, parseFloat(newZ.toFixed(2)));
};


